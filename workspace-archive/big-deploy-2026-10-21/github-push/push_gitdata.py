#!/usr/bin/env python3
"""One-commit push of the staged .deploy tree to Jman350Z/fire-babys via the
Git Data API, using the custom.github-gitdata connector credential.

Creates one blob per file, one tree on top of the base commit's tree, one
commit, then a non-force fast-forward ref update. Stops at the first HTTP
error and records progress in push-run-2026-10-23.json beside this script.
"""

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import add_surrogate_to_request, read_response_body

API = "https://api.github.com/repos/Jman350Z/fire-babys"
BASE_COMMIT = "ea100a402d6f810d0fbd6fa3126a9f656cb5c48b"
DEPLOY = os.path.expanduser("~/workspace/.deploy")
HERE = os.path.dirname(os.path.abspath(__file__))
STATE = os.path.join(HERE, "push-run-2026-10-23.json")

BINARIES = {
    "fire-babys-offline.zip",
    "shop-img/aqua-hero-tee.jpg",
    "shop-img/blaze-hero-tee.jpg",
    "shop-img/boulder-hero-tee.jpg",
    "shop-img/candy-moon-halloween-tee.jpg",
    "shop-img/fire-safety-academy-tee.jpg",
    "shop-img/full-cast-hoodie.jpg",
    "shop-img/full-cast-tee.jpg",
    "shop-img/ruko-hero-tee.jpg",
    "shop-img/slimer-smother-tee.jpg",
    "shop-img/sticker-pack-sheet.jpg",
}

COMMIT_MESSAGE = (
    "Big deploy: Fire World hub UI redesign, shops + locker, Math Check, Arena, SEO pack\n\n"
    "New games-first hub (Games / Shop / My Chest tabs, live search, filter chips, "
    "jump-to-game strip), in-game shop and real-world shop, one player locker (Chest), "
    "Math Check gate with 24h unlock, starter kit, Fire Babys Arena (Game 60), "
    "Dark Knight admin-arrival announcement, sign-in landing fixes, onboarding tour, "
    "no-power-stats gear law, resealed contest-clean offline ZIP, shop images, and the "
    "SEO pack (sitemap.xml, robots.txt)."
)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise RuntimeError("redirect refused")


def call(method, path, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "muse-github-gitdata-connector",
    }
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    add_surrogate_to_request(req, "custom.github-gitdata", allowed_hosts=["api.github.com"])
    opener = urllib.request.build_opener(NoRedirect())
    try:
        with opener.open(req, timeout=180) as resp:
            return resp.status, json.loads(read_response_body(resp).decode("utf-8"))
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {exc.code} on {method} {path}: {text}")


def save_state(state):
    with open(STATE, "w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2)


def main():
    state = {"base_commit": BASE_COMMIT, "blobs": {}}
    if os.path.exists(STATE):
        with open(STATE, encoding="utf-8") as fh:
            state = json.load(fh)
        print(f"resuming: {len(state['blobs'])} blobs already created", flush=True)

    _, commit = call("GET", f"/git/commits/{BASE_COMMIT}")
    base_tree = commit["tree"]["sha"]
    state["base_tree"] = base_tree
    print(f"base tree: {base_tree}", flush=True)

    with open(os.path.join(HERE, "push-paths.json"), encoding="utf-8") as fh:
        text_paths = json.load(fh)
    all_paths = list(text_paths) + sorted(BINARIES - set(text_paths))
    print(f"total files: {len(all_paths)}", flush=True)

    tree_entries = []
    for path in all_paths:
        full = os.path.join(DEPLOY, path)
        with open(full, "rb") as fh:
            raw = fh.read()
        if path in state["blobs"]:
            sha = state["blobs"][path]
        else:
            if path in BINARIES:
                payload = {"content": base64.b64encode(raw).decode("ascii"), "encoding": "base64"}
            else:
                try:
                    text = raw.decode("utf-8")
                except UnicodeDecodeError:
                    raise SystemExit(f"text path is not valid UTF-8: {path}")
                payload = {"content": text, "encoding": "utf-8"}
            _, blob = call("POST", "/git/blobs", payload)
            sha = blob["sha"]
            state["blobs"][path] = sha
            save_state(state)
            time.sleep(0.1)
        tree_entries.append({"path": path, "mode": "100644", "type": "blob", "sha": sha})
        print(f"blob {len(tree_entries)}/{len(all_paths)} {path} -> {sha}", flush=True)

    _, tree = call("POST", "/git/trees", {"base_tree": base_tree, "tree": tree_entries})
    state["new_tree"] = tree["sha"]
    save_state(state)
    print(f"new tree: {tree['sha']}", flush=True)

    _, new_commit = call("POST", "/git/commits", {
        "message": COMMIT_MESSAGE,
        "tree": tree["sha"],
        "parents": [BASE_COMMIT],
    })
    state["new_commit"] = new_commit["sha"]
    save_state(state)
    print(f"new commit: {new_commit['sha']}", flush=True)

    _, ref = call("PATCH", "/git/refs/heads/main", {"sha": new_commit["sha"], "force": False})
    state["ref_object"] = ref["object"]["sha"]
    save_state(state)
    print(f"ref updated: refs/heads/main -> {ref['object']['sha']}", flush=True)
    print("PUSH COMPLETE", flush=True)


if __name__ == "__main__":
    main()
