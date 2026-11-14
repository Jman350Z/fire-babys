#!/usr/bin/env python3
"""Single-file push of fire-world.html v4 via the connector's gh.py helper."""
import json, subprocess, sys, os
GH = "/home/hatch/workspace/custom-connectors/custom.github-gitdata/bin/gh.py"
TMP = "/tmp/ghpush"; os.makedirs(TMP, exist_ok=True)

def call(method, path, payload=None):
    args = ["python3", GH, method, "/repos/Jman350Z/fire-babys" + path]
    if payload is not None:
        f = os.path.join(TMP, "payload.json")
        json.dump(payload, open(f, "w"))
        args += ["--json-file", f]
    out = subprocess.run(args, capture_output=True, text=True)
    if out.returncode != 0:
        print("FAILED", method, path, out.stdout[-400:], out.stderr[-400:]); sys.exit(1)
    return json.loads(out.stdout)

ref = call("GET", "/git/ref/heads/main"); head = ref["object"]["sha"]; print("head:", head)
commit = call("GET", f"/git/commits/{head}"); base_tree = commit["tree"]["sha"]; print("base tree:", base_tree)
content = open("/home/hatch/workspace/.deploy/fire-world.html", encoding="utf-8").read()
blob = call("POST", "/git/blobs", {"content": content, "encoding": "utf-8"}); print("blob:", blob["sha"])
tree = call("POST", "/git/trees", {"base_tree": base_tree, "tree": [
    {"path": "fire-world.html", "mode": "100644", "type": "blob", "sha": blob["sha"]}]}); print("tree:", tree["sha"])
newc = call("POST", "/git/commits", {
    "message": "Hub v4: Night Arcade — full game catalog in open page flow, no tabs/drawers hiding games; Shop + My Chest as sections below the grid; in-place search filter; all 58 games relisted, hooks preserved",
    "tree": tree["sha"], "parents": [head]}); print("commit:", newc["sha"])
upd = call("PATCH", "/git/refs/heads/main", {"sha": newc["sha"], "force": False}); print("ref now:", upd["object"]["sha"])
