#!/usr/bin/env python3
"""Deploy a tiny response-headers Worker + routes for firebabys.io.
Fallback for the transform-rule 403 (token lacks rulesets permission;
Workers Routes Edit IS in the token template). Idempotent."""
import sys, json
sys.path.insert(0, "/home/hatch/workspace/custom-connectors/custom.cloudflare/bin")
import cf

ACCT = cf.ACCOUNT_ID
ZID = "0d8e80de0679290510a2378fb220937b"
NAME = "fire-babys-headers"

CODE = """export default {
  async fetch(request) {
    const res = await fetch(request);
    const h = new Headers(res.headers);
    h.set("Content-Security-Policy", "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: wss:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'");
    h.set("X-Frame-Options", "SAMEORIGIN");
    h.set("X-Content-Type-Options", "nosniff");
    h.set("Referrer-Policy", "strict-origin-when-cross-origin");
    h.set("Permissions-Policy", "interest-cohort=()");
    h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  }
};
"""

metadata = {"main_module": "index.js", "compatibility_date": "2026-09-01", "bindings": []}
boundary = "----cfdeploy7MA4YWxkTrZu0gW"
parts = []
parts.append(f"--{boundary}\r\n".encode() + b'Content-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n' + json.dumps(metadata).encode() + b"\r\n")
parts.append(f"--{boundary}\r\n".encode() + b'Content-Disposition: form-data; name="index.js"; filename="index.js"\r\nContent-Type: application/javascript+module\r\n\r\n' + CODE.encode() + b"\r\n")
parts.append(f"--{boundary}--\r\n".encode())
status, raw = cf.call("PUT", f"/accounts/{ACCT}/workers/scripts/{NAME}",
                      body=b"".join(parts), content_type=f"multipart/form-data; boundary={boundary}")
d = cf.as_json(raw)
print("worker deploy:", status, d.get("success"), json.dumps(d.get("errors"))[:200] if not d.get("success") else "")

# routes (create both; tolerate 'already exists')
for pat in ("firebabys.io/*", "www.firebabys.io/*"):
    s2, r2 = cf.call("POST", f"/zones/{ZID}/workers/routes",
                     json.dumps({"pattern": pat, "script": NAME}).encode(), "application/json")
    d2 = cf.as_json(r2)
    print("route", pat, ":", s2, d2.get("success"), "" if d2.get("success") else json.dumps(d2.get("errors"))[:160])
