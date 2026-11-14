#!/usr/bin/env python3
"""Deploy fire-babys-headers Worker (mode from argv: reportonly|enforce) via cf.py.
Same mechanism as cloudflare-dns-move-2026-10-20/deploy_headers_worker.py, plus the
REPORTS KV binding. Routes already exist; not touched."""
import sys, json
sys.path.insert(0, "/home/hatch/workspace/custom-connectors/custom.cloudflare/bin")
import cf

MODE = sys.argv[1] if len(sys.argv) > 1 else "reportonly"
CODE = open(f"/home/hatch/workspace/a-plus-project/worker-{MODE}.js").read()
NAME = "fire-babys-headers"
metadata = {"main_module": "index.js", "compatibility_date": "2026-09-01",
            "bindings": [{"type": "kv_namespace", "name": "REPORTS",
                          "namespace_id": "52ffa07fbdaa474ba1c7c0e07c761110"}]}
boundary = "----cfdeploy7MA4YWxkTrZu0gW"
parts = []
parts.append(f"--{boundary}\r\n".encode() + b'Content-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n' + json.dumps(metadata).encode() + b"\r\n")
parts.append(f"--{boundary}\r\n".encode() + b'Content-Disposition: form-data; name="index.js"; filename="index.js"\r\nContent-Type: application/javascript+module\r\n\r\n' + CODE.encode() + b"\r\n")
parts.append(f"--{boundary}--\r\n".encode())
status, raw = cf.call("PUT", f"/accounts/{cf.ACCOUNT_ID}/workers/scripts/{NAME}",
                      body=b"".join(parts), content_type=f"multipart/form-data; boundary={boundary}")
d = cf.as_json(raw)
print("worker deploy:", status, d.get("success"),
      "" if d.get("success") else json.dumps(d.get("errors"))[:300])
