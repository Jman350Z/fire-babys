#!/usr/bin/env python3
"""Generate the per-page CSP hash map from the audit + build the headers Worker.

Design (see AUDIT.md): the Worker fetches origin first, then for HTML responses
looks up the page's hash set by normalized URL path and sets a strict CSP built
from it. Unmapped HTML paths get the global union set. Non-HTML passes through
with the same security headers (CSP on non-HTML is inert).
"""
import json, os, re

AP = "/home/hatch/workspace/a-plus-project"
audit = json.load(open(os.path.join(AP, "audit-raw.json")))
attrh = json.load(open(os.path.join(AP, "attr-hashes.json")))
pages = audit["pages"]

HANDLER_ALL = sorted({h for p in attrh.values() for h in p["handler_hashes"]})

def page_entry(rel):
    p = pages[rel]
    script = sorted({h["hash"] for h in p["hashes"]})
    # union in any meta-CSP script hashes already shipped in play.html / 3d.html
    src = open(f"/home/hatch/workspace/.deploy/{rel}", encoding="utf-8", errors="replace").read()
    m = re.search(r'http-equiv="Content-Security-Policy" content="([^"]+)"', src)
    if m and "script-src" in m.group(1):
        script = sorted(set(script) | set(re.findall(r"'(sha256-[A-Za-z0-9+/=]+)'",
                              m.group(1).split("style-src")[0])))
    return {
        "s": script,
        "y": sorted(set(p["style_hashes"])),
        "a": sorted(set(attrh.get(rel, {}).get("handler_hashes", [])) | set(HANDLER_ALL)),
        "t": sorted(set(attrh.get(rel, {}).get("style_attr_hashes", []))),
    }

MAP = {}
for rel in pages:
    MAP["/" + rel] = page_entry(rel)

UNION = {
    "s": sorted({h for e in MAP.values() for h in e["s"]}),
    "y": sorted({h for e in MAP.values() for h in e["y"]}),
    "a": HANDLER_ALL,
    "t": sorted({h for e in MAP.values() for h in e["t"]}),
}
# Runtime-generated styles harvested from Chromium violation hints (Phase 2):
# shared JS (gate/i18n/landscape) injects a few deterministic <style> blocks and
# style attributes on every page — allowlist those hashes globally.
DYN = {"y": set(), "t": set()}
_harv_path = os.path.join(AP, "harvested-hashes.json")
if os.path.exists(_harv_path):
    _h = json.load(open(_harv_path))
    DYN["y"] = set(_h.get("style-src", {}).keys())
    DYN["t"] = set(_h.get("style-src-attr", {}).keys())
for e in MAP.values():
    e["y"] = sorted(set(e["y"]) | DYN["y"])
    e["t"] = sorted(set(e["t"]) | DYN["t"])
UNION["y"] = sorted(set(UNION["y"]) | DYN["y"])
UNION["t"] = sorted(set(UNION["t"]) | DYN["t"])
print("dynamic style hashes folded in: y=", len(DYN["y"]), " t=", len(DYN["t"]))
# Runtime sets: hashes observed in rendered DOM (dom-sweep) + source-exact
# generated handler families (selLevel/pickLevel/selHero/pickUpgrade/setCat/playGame).
_rt = json.load(open(os.path.join(AP, "runtime-sets.json")))
for page, e in _rt.items():
    if page in MAP:
        for kind in ("a", "t", "y", "s"):
            MAP[page][kind] = sorted(set(MAP[page][kind]) | set(e.get(kind, [])))
print("runtime sets merged for", len(_rt), "pages")
json.dump({"map": MAP, "union": UNION}, open(os.path.join(AP, "hashmap.json"), "w"))
# Self-check: every harvested dynamic hash must be present on every page.
_chk = json.load(open(os.path.join(AP, "hashmap.json")))["map"]
for rel, e in _chk.items():
    assert DYN["y"] <= set(e["y"]), f"dyn-y missing on {rel}"
    assert DYN["t"] <= set(e["t"]), f"dyn-t missing on {rel}"
print("self-check OK: all dynamic hashes present on all", len(_chk), "pages")
# Coverage check: every hash observed in the rendered DOM sweep must be in policy.
import hashlib, base64 as _b64
def _sha(t): return "sha256-" + _b64.b64encode(hashlib.sha256(t.encode("utf-8")).digest()).decode()
_sweep = json.load(open(os.path.join(AP, "dom-sweep.json")))
def _lk(p):
    for c in (p, p + "index.html" if p.endswith("/") else None,
              (p + ".html") if not p.endswith(".html") else None, p + "/index.html"):
        if c and c in _chk: return _chk[c]
    return _chk["/404.html"]
_bad = 0
for p, d in _sweep.items():
    e = _lk(p)
    for vals, kind in ((d["handlers"], "a"), (d["styleAttrs"], "t"), (d["styles"], "y"), (d["scripts"], "s")):
        miss = {_sha(v) for v in vals} - set(e[kind])
        if miss:
            _bad += 1; print("COVERAGE GAP", p, kind, len(miss))
print("sweep coverage check:", "ALL COVERED" if _bad == 0 else f"{_bad} gaps")
tot = {k: len(v) for k, v in UNION.items()}
print("union sizes:", tot, "| union CSP hash chars ~", sum(tot.values()) * 53)
print("pages in map:", len(MAP))
big = max(MAP.items(), key=lambda kv: len(kv[1]["s"]))
print("biggest script page:", big[0], len(big[1]["s"]), "hashes")
