#!/usr/bin/env python3
"""firebabys.io Cloudflare activation chain (idempotent).
Run manually or from the watcher cron. Prints ONE of:
  PENDING  - zone not active yet, nothing changed
  DONE     - activation chain executed; summary lines follow
Individual step failures are reported as STEP-FAIL lines, never fatal.
"""
import sys, json, subprocess
sys.path.insert(0, "/home/hatch/workspace/custom-connectors/custom.cloudflare/bin")
import cf

def call(method, path, body=None):
    if isinstance(body, (dict, list)):
        s, d = cf.call(method, path, json.dumps(body).encode(), "application/json")
    else:
        s, d = cf.call(method, path, body)
    if isinstance(d, bytes):
        try: d = json.loads(d)
        except Exception: d = {"raw": d[:200]}
    return s, d

s, d = call("GET", "/zones?name=firebabys.io")
z = (d.get("result") or [None])[0]
if not z:
    print("PENDING - zone not found"); sys.exit(0)
zid = z["id"]
if z.get("status") != "active":
    print(f"PENDING - zone status={z.get('status')}"); sys.exit(0)

print("DONE - zone ACTIVE")
out = []
def step(name, ok, note=""):
    out.append(f"{'OK ' if ok else 'STEP-FAIL'} {name} {note}".rstrip())

# 1) Proxy the web records (A x4 + www CNAME); never proxy MX/TXT
s, d = call("GET", f"/zones/{zid}/dns_records?per_page=100")
recs = d.get("result") or []
for r in recs:
    if r["type"] in ("A", "AAAA", "CNAME") and not r.get("proxied"):
        s2, d2 = call("PATCH", f"/zones/{zid}/dns_records/{r['id']}", {"proxied": True})
        step(f"proxy {r['type']} {r['name']}", bool(d2.get("success")), f"http={s2}")

# 2) Zone settings (each independent)
settings = {
    "ssl": "full",
    "always_use_https": "on",
    "automatic_https_rewrites": "on",
    "tls_1_3": "on",
    "min_tls_version": "1.2",
    "http3": "on",
    "early_hints": "on",
    "opportunistic_encryption": "on",
    "browser_check": "on",
    "hotlink_protection": "on",
    "email_obfuscation": "on",
}
for k, v in settings.items():
    s2, d2 = call("PATCH", f"/zones/{zid}/settings/{k}", {"value": v})
    step(f"setting {k}={v}", bool(d2.get("success")), f"http={s2} {'' if d2.get('success') else json.dumps(d2.get('errors'))[:120]}")

# 3) Bot Fight Mode (free plan: fight_mode)
s2, d2 = call("PUT", f"/zones/{zid}/bot_management", {"fight_mode": True})
step("bot_fight_mode", bool(d2.get("success")), f"http={s2}")

# 4) HSTS + nosniff via security_header setting
hsts = {"strict_transport_security": {"enabled": True, "max_age": 31536000,
        "include_subdomains": True, "preload": False, "nosniff": True}}
s2, d2 = call("PATCH", f"/zones/{zid}/settings/security_header", {"value": hsts})
step("hsts+nosniff", bool(d2.get("success")), f"http={s2} {'' if d2.get('success') else json.dumps(d2.get('errors'))[:120]}")

# 5) Remaining headers via response-header Transform Rule
hdrs = {
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "interest-cohort=()",
    "Content-Security-Policy": "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: wss:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
}
rule = {"description": "Security headers (Bobby 2026-10-20)", "expression": "true",
        "action": "rewrite_response_headers",
        "action_parameters": {"headers": {k: {"operation": "set", "value": v} for k, v in hdrs.items()}}}
s2, d2 = call("GET", f"/zones/{zid}/rulesets?phase=http_response_headers_transform")
existing = [r for r in (d2.get("result") or []) if r.get("kind") == "zone"]
if existing:
    rid = existing[0]["id"]
    s3, d3 = call("PUT", f"/zones/{zid}/rulesets/{rid}", {"rules": [rule]})
    step("transform-headers", bool(d3.get("success")), f"http={s3} {'' if d3.get('success') else json.dumps(d3.get('errors'))[:160]}")
else:
    body = {"name": "security headers", "kind": "zone", "phase": "http_response_headers_transform", "rules": [rule]}
    s3, d3 = call("POST", f"/zones/{zid}/rulesets", body)
    step("transform-headers", bool(d3.get("success")), f"http={s3} {'' if d3.get('success') else json.dumps(d3.get('errors'))[:160]}")

# 5b) Edge caching for the static site (Jeff approved 2026-10-20)
crule = {"description": "Cache static site at edge (Bobby 2026-10-20)", "expression": "true",
         "action": "set_cache_settings",
         "action_parameters": {"cache": True,
                               "edge_ttl": {"mode": "override_origin", "default": 14400},
                               "browser_ttl": {"mode": "respect_origin"}}}
s2, d2 = call("GET", f"/zones/{zid}/rulesets?phase=http_request_cache_settings")
existing = [r for r in (d2.get("result") or []) if r.get("kind") == "zone"]
if existing:
    rid = existing[0]["id"]
    s3, d3 = call("PUT", f"/zones/{zid}/rulesets/{rid}", {"rules": [crule]})
    step("edge-cache", bool(d3.get("success")), f"http={s3} {'' if d3.get('success') else json.dumps(d3.get('errors'))[:160]}")
else:
    body = {"name": "edge cache", "kind": "zone", "phase": "http_request_cache_settings", "rules": [crule]}
    s3, d3 = call("POST", f"/zones/{zid}/rulesets", body)
    step("edge-cache", bool(d3.get("success")), f"http={s3} {'' if d3.get('success') else json.dumps(d3.get('errors'))[:160]}")

# 6) DMARC (monitoring) if absent
if not any(r["type"] == "TXT" and r["name"].startswith("_dmarc") for r in recs):
    body = {"type": "TXT", "name": "_dmarc", "content": "v=DMARC1; p=none; rua=mailto:jeffpruden288@gmail.com", "ttl": 3600}
    s2, d2 = call("POST", f"/zones/{zid}/dns_records", body)
    step("dmarc", bool(d2.get("success")), f"http={s2} {'' if d2.get('success') else json.dumps(d2.get('errors'))[:120]}")
else:
    step("dmarc", True, "(already present)")

# 7) DNSSEC status (DS record at registrar is a separate manual step; report only)
s2, d2 = call("GET", f"/zones/{zid}/dnssec")
step("dnssec-read", bool(d2.get("success")), f"status={(d2.get('result') or {}).get('status')}")

# 8) Live verify
try:
    h = subprocess.run(["curl", "-sI", "https://firebabys.io/"], capture_output=True, text=True, timeout=30).stdout
    wanted = ["strict-transport-security", "content-security-policy", "x-frame-options",
              "x-content-type-options", "referrer-policy", "permissions-policy", "server:"]
    got = [ln.strip() for ln in h.splitlines() if any(ln.lower().startswith(w) for w in wanted)]
    out.append("LIVE HEADERS:\n" + ("\n".join(got) if got else "(none of the target headers seen yet)"))
    code = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "https://firebabys.io/"],
                          capture_output=True, text=True, timeout=30).stdout
    out.append(f"SITE HTTP {code}")
except Exception as e:
    out.append(f"verify failed: {e}")

print("\n".join(out))
