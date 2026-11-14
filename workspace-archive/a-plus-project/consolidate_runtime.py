#!/usr/bin/env python3
"""Build runtime-sets.json: per-page extra CSP hashes from (1) the all-page DOM
sweep gaps and (2) source-exact generated handler families, assigned to the
pages whose source contains each template."""
import json, os, re, hashlib, base64

WS = "/home/hatch/workspace"
AP = os.path.join(WS, "a-plus-project")
SERVE = os.path.join(WS, ".deploy")
def sha(t): return "sha256-" + base64.b64encode(hashlib.sha256(t.encode("utf-8")).digest()).decode()

gaps = json.load(open(os.path.join(AP, "dom-gaps.json")))
sets = {}
def add(page, kind, hashes):
    e = sets.setdefault(page, {"a": set(), "t": set(), "y": set(), "s": set()})
    e[kind] |= set(hashes)
for page, g in gaps.items():
    for kind in ("a", "t", "y", "s"):
        add(page, kind, g.get(kind, []))

# --- generated families, assigned by source template presence ---
def files_with(needle):
    out = []
    for dp, dn, fs in os.walk(SERVE):
        for f in fs:
            if f.endswith(".html"):
                p = os.path.join(dp, f)
                if needle in open(p, encoding="utf-8", errors="replace").read():
                    out.append("/" + os.path.relpath(p, SERVE))
    return out

sel = [sha(f"event.stopPropagation();selLevel({n})") for n in range(1, 26)]
pick = [sha(f"event.stopPropagation();pickLevel({n})") for n in range(1, 26)]
for f in files_with("selLevel(${i})"): add(f, "a", sel)
for f in files_with("pickLevel(${i})") + files_with("pickLevel(${n})"): add(f, "a", pick)
for f in files_with("selHero('${k}')"):
    add(f, "a", [sha(f"event.stopPropagation();selHero('{k}')") for k in ("blaze", "aqua", "sparky", "ruko")])
for f in files_with("pickUpgrade(${"):
    add(f, "a", [sha(f"pickUpgrade({i})") for i in range(0, 13)])
# play-all.html: setCat keys + playGame bodies (source-exact)
add("/play-all.html", "a", [sha(f"setCat('{k}')") for k in ("all", "action", "puzzle", "strategy", "music")])
bodies = json.load(open(os.path.join(AP, "playgame-bodies.json")))
add("/play-all.html", "a", [sha(b) for b in bodies])

out = {p: {k: sorted(v) for k, v in e.items()} for p, e in sets.items()}
json.dump(out, open(os.path.join(AP, "runtime-sets.json"), "w"), indent=1)
print("runtime sets for", len(out), "pages")
for p, e in sorted(out.items()):
    print(f"  {p}: a+{len(e['a'])} t+{len(e['t'])} y+{len(e['y'])} s+{len(e['s'])}")
