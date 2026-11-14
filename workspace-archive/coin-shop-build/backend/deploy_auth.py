#!/usr/bin/env python3
"""Deploy fire-babys-auth Worker — F5-FIXED version (sign-in audit 2026-10-21).

REPLACES ~/workspace/fire-babys-auth/deploy_auth.py. DO NOT use the old one.

Why: Cloudflare script uploads REPLACE the entire binding set. The old
script uploaded with a hard-coded list of exactly AUTH_KV +
GOOGLE_CLIENT_ID, so any future run would silently DROP RESEND_API_KEY
and every provider secret (audit defect D6) — killing email verification
and account linking the moment anyone deployed an unrelated fix.

This version:
  1. Snapshots the live bindings first (deploy-backups/*.json).
  2. MERGES: every live binding is preserved as-is; only AUTH_KV
     (namespace id) and GOOGLE_CLIENT_ID (a public identifier, re-read
     from the live /auth/config) are set/updated.
  3. ABORTS before uploading if a secret_text binding exists whose
     value cannot be read back (e.g. provider client secrets). Secret
     values are never returned by the API, so re-uploading would wipe
     them. In that case deploy with wrangler instead (wrangler deploy
     preserves secrets) — see DEPLOY.md.
  4. Smoke-tests after deploy and diffs binding NAMES before/after;
     any vanished binding is a hard failure.

Deploy-day flow (see DEPLOY.md for the full order):
  cp coin-shop-build/backend/index.js  fire-babys-auth/worker/src/index.js
  python3 coin-shop-build/backend/deploy_auth.py
"""
import sys, os, json, subprocess, time
sys.path.insert(0, "/home/hatch/workspace/custom-connectors/custom.cloudflare/bin")
import cf

ACCT = cf.ACCOUNT_ID
NAME = "fire-babys-auth"
SRC = "/home/hatch/workspace/fire-babys-auth/worker/src/index.js"
HERE = os.path.dirname(os.path.abspath(__file__))


def get_settings():
    status, raw = cf.call("GET", f"/accounts/{ACCT}/workers/scripts/{NAME}/settings")
    data = cf.as_json(raw)
    if not data.get("success"):
        print(f"FATAL: could not read live script settings (http {status}): {str(raw)[:300]}")
        sys.exit(2)
    return (data.get("result") or {}).get("bindings") or []


def main():
    script = open(SRC, "rb").read()

    # 1) Snapshot live bindings.
    live = get_settings()
    os.makedirs(os.path.join(HERE, "deploy-backups"), exist_ok=True)
    snap = os.path.join(HERE, "deploy-backups", f"bindings-{time.strftime('%Y%m%d-%H%M%S')}.json")
    with open(snap, "w") as f:
        json.dump(live, f, indent=2)
    live_names = sorted(b.get("name") for b in live)
    print(f"Live bindings ({len(live_names)}): {live_names}")
    print(f"Snapshot saved: {snap}")

    # 2) GOOGLE_CLIENT_ID value (public identifier) from the live config.
    cfg = json.loads(subprocess.run(
        ["curl", "-s", "-X", "POST", "https://fire-babys-auth.jeffpruden288.workers.dev/auth/config",
         "-H", "Content-Type: application/json", "-d", "{}"],
        capture_output=True, text=True, timeout=30).stdout)
    gcid = cfg.get("googleClientId") or ""
    assert gcid, "could not read googleClientId from live config — aborting"

    # 3) Merge bindings; abort on unreadable secrets.
    merged, blocked = [], []
    seen = set()
    for b in live:
        name, btype = b.get("name"), b.get("type")
        seen.add(name)
        if btype == "secret_text" and name != "GOOGLE_CLIENT_ID":
            blocked.append(name)
            continue
        nb = dict(b)
        if name == "AUTH_KV":
            nb = {"type": "kv_namespace", "name": "AUTH_KV", "namespace_id": cf.AUTH_NS}
        elif name == "GOOGLE_CLIENT_ID":
            nb = {"type": "secret_text", "name": "GOOGLE_CLIENT_ID", "text": gcid}
        elif btype == "plain_text" and "text" not in nb:
            blocked.append(name + " (plain_text without readable value)")
            continue
        merged.append(nb)
    if blocked:
        print("ABORT: these live bindings hold values the API cannot read back;")
        print("re-uploading would WIPE them:", blocked)
        print("Deploy with wrangler instead (it preserves secrets), per DEPLOY.md.")
        sys.exit(3)
    if "AUTH_KV" not in seen:
        merged.append({"type": "kv_namespace", "name": "AUTH_KV", "namespace_id": cf.AUTH_NS})
    if "GOOGLE_CLIENT_ID" not in seen:
        merged.append({"type": "secret_text", "name": "GOOGLE_CLIENT_ID", "text": gcid})

    metadata = {
        "main_module": "index.js",
        "compatibility_date": "2026-09-01",
        "bindings": merged,
    }
    boundary = "----cfdeploy7MA4YWxkTrZu0gW"
    parts = []
    parts.append(
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="metadata"\r\n'
        "Content-Type: application/json\r\n\r\n".encode()
        + json.dumps(metadata).encode() + b"\r\n")
    parts.append(
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="index.js"; filename="index.js"\r\n'
        "Content-Type: application/javascript+module\r\n\r\n".encode()
        + script + b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    body = b"".join(parts)
    status, raw = cf.call("PUT", f"/accounts/{ACCT}/workers/scripts/{NAME}",
                          body=body, content_type=f"multipart/form-data; boundary={boundary}")
    data = cf.as_json(raw)
    print(json.dumps({"deploy_status": status, "success": data.get("success")}))
    if not data.get("success"):
        print("DEPLOY FAILED:", str(raw)[:400])
        sys.exit(4)

    # 4) Smoke tests + binding-name diff.
    cfg2 = json.loads(subprocess.run(
        ["curl", "-s", "-X", "POST", "https://fire-babys-auth.jeffpruden288.workers.dev/auth/config",
         "-H", "Content-Type: application/json", "-d", "{}"],
        capture_output=True, text=True, timeout=30).stdout)
    print("smoke /auth/config:", {"ok": cfg2.get("ok"),
                                  "googleClientId_set": bool(cfg2.get("googleClientId")),
                                  "emailVerification": cfg2.get("emailVerification")})
    assert cfg2.get("ok") and cfg2.get("googleClientId"), "smoke failed: /auth/config"
    tok_path = "/home/hatch/workspace/test-profile/token.json"
    if os.path.exists(tok_path):
        tok = json.load(open(tok_path)).get("token")
        if tok:
            lc = json.loads(subprocess.run(
                ["curl", "-s", "-X", "POST", "https://fire-babys-auth.jeffpruden288.workers.dev/link/config",
                 "-H", "Content-Type: application/json", "-d", json.dumps({"token": tok})],
                capture_output=True, text=True, timeout=30).stdout)
            print("smoke /link/config:", lc)
    after_names = sorted(b.get("name") for b in get_settings())
    print("bindings after:", after_names)
    missing = [n for n in live_names if n not in after_names]
    if missing:
        print("SMOKE FAILED: bindings vanished after deploy:", missing)
        sys.exit(5)
    print("BINDINGS PRESERVED ✓ — deploy complete.")


if __name__ == "__main__":
    main()
