#!/usr/bin/env python3
"""Gameplay harvest for game-60: drive a real bout under the staged strict
CSP, collect FULL CSP violation messages, extract the required hashes the
way harness_csp.py does, and merge them into a-plus-project/harvested-hashes.json."""
import json, os, re, sys
from playwright.sync_api import sync_playwright

WS = os.path.expanduser("~/workspace")
SERVE = os.path.join(WS, ".deploy")
AP = os.path.join(WS, "a-plus-project")
HMAP = json.load(open(os.path.join(AP, "hashmap.json")))

def lookup(path):
    cands = [path]
    if path.endswith("/"): cands.append(path + "index.html")
    if not path.endswith(".html"): cands.append(path + ".html")
    if len(path) > 1 and path.endswith("/"): cands.append(path[:-1] + ".html")
    if not path.endswith("/"): cands.append(path + "/index.html")
    for c in cands:
        if c in HMAP["map"]: return HMAP["map"][c]
    return HMAP["map"].get("/404.html", HMAP["union"])

def q(lst): return " ".join("'" + h + "'" for h in lst)

def strict_csp(path):
    e = lookup(path)
    return ("default-src 'self'; "
        f"script-src 'self' https://accounts.google.com https://static.cloudflareinsights.com {q(e['s'])}; "
        f"script-src-attr 'unsafe-hashes' {q(e['a'])}; "
        f"style-src 'self' https://accounts.google.com {q(e['y'])}; "
        f"style-src-attr 'unsafe-hashes' {q(e['t'])}; "
        "img-src 'self' data: blob: https:; media-src 'self' data: blob:; font-src 'self' data:; "
        "connect-src 'self' https: wss:; frame-src 'self' https://accounts.google.com; "
        "worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; "
        "form-action 'self' https://accounts.google.com; frame-ancestors 'self'")

CT = {".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css",
      ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json",
      ".zip": "application/zip", ".svg": "image/svg+xml", ".ico": "image/x-icon"}
CSP_HINT = ("Refused to", "Content Security Policy", "violates the following",
            "Content-Security-Policy", "Applying inline")
def is_csp(t): return any(h.lower() in t.lower() for h in CSP_HINT)

PATH = "/fire-world/games/game-60-fire-babys-arena.html"
msgs = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--use-gl=swiftshader"])
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    ctx.add_init_script("try{localStorage.setItem('fb_auth_token','test-token-arena');"
                        "localStorage.setItem('fb_auth_user', JSON.stringify({email:'t@example.com',name:'Tester'}));"
                        "localStorage.setItem('fb_auth_token_at', String(Date.now()));"
                        "localStorage.setItem('fb_lang','en');}catch(e){}")
    pg = ctx.new_page()
    pg.on("console", lambda m: msgs.append(m.text))  # FULL text, no truncation
    def handler(route):
        from urllib.parse import urlparse
        u = route.request.url
        if u.startswith("https://firebabys.io"):
            pth = urlparse(u).path
            fs = os.path.join(SERVE, pth.lstrip("/"))
            if os.path.isdir(fs): fs = os.path.join(fs, "index.html")
            if not os.path.splitext(fs)[1]: fs += ".html"
            if os.path.isfile(fs):
                ext = os.path.splitext(fs)[1]
                hdrs = {"Content-Type": CT.get(ext, "application/octet-stream")}
                if ext == ".html": hdrs["Content-Security-Policy"] = strict_csp(pth)
                route.fulfill(status=200, headers=hdrs, body=open(fs, "rb").read()); return
            route.fulfill(status=404, headers={"Content-Type": "text/html"}, body=b"nf"); return
        if u.startswith(("data:", "blob:", "about:")):
            route.continue_(); return
        route.abort()
    pg.route("**/*", handler)

    def phase():
        try: return pg.evaluate("() => window.FBArena && window.FBArena.G ? window.FBArena.G.phase : null")
        except Exception: return None
    def wait_phase(want, timeout_s=20):
        import time
        for _ in range(timeout_s * 4):
            if phase() in want: return True
            pg.wait_for_timeout(250)
        return False

    pg.goto("https://firebabys.io" + PATH, wait_until="load", timeout=30000)
    pg.wait_for_selector("#overlay", state="visible", timeout=20000)
    pg.click("#ladderBtn")
    pg.wait_for_selector("#mathgate", state="visible", timeout=10000)
    qtxt = pg.inner_text("#mq")
    mm = re.search(r"(\d+)\s*\+\s*(\d+)", qtxt)
    pg.fill("#ma", str(int(mm.group(1)) + int(mm.group(2))))
    pg.click("#mathgate button")
    pg.wait_for_selector("#selectScr", state="visible", timeout=10000)
    pg.click('.charCard[data-char="blaze"]')
    pg.click("#selConfirm")
    pg.wait_for_selector("#loadoutScr", state="visible", timeout=10000)
    # toggle outfit chips like the arena suite does (exercises loadout styles)
    try:
        pg.click("#outfitRow .gearChip:first-child"); pg.wait_for_timeout(300)
        pg.click("#outfitRow .gearChip:nth-child(2)"); pg.wait_for_timeout(300)
    except Exception as e:
        print("outfit toggle skipped:", str(e)[:100])
    pg.click("#fightBtn")
    print("fight reached:", wait_phase({"fight", "morph"}))
    wait_phase({"fight"})
    # fight for a while: move, punch, kick, special, block, jump x2
    import itertools
    for key in ("KeyD", "KeyF", "KeyG", "KeyJ", "KeyS", "KeyW", "KeyW", "KeyH", "KeyA"):
        pg.keyboard.press(key); pg.wait_for_timeout(350)
    pg.wait_for_timeout(2500)
    for key in ("KeyF", "KeyJ", "KeyD", "KeyG"):
        pg.keyboard.press(key); pg.wait_for_timeout(350)
    # pause + resume
    try:
        pg.click("#pauseBtn"); pg.wait_for_timeout(600)
        pg.click("#resumeBtn"); pg.wait_for_timeout(500)
    except Exception as e:
        print("pause cycle skipped:", str(e)[:100])
    pg.wait_for_timeout(1500)
    print("phase at end:", phase())
    browser.close()

harvest = {}
for t in msgs:
    if not is_csp(t): continue
    dm = re.search(r"directive '(script-src-attr|script-src|style-src-attr|style-src)", t)
    directive = dm.group(1) if dm else "unknown"
    for h in re.findall(r"\('(sha256-[A-Za-z0-9+/=]+)'\)", t):
        harvest.setdefault(directive, set()).add(h)
print("violations seen:", sum(1 for t in msgs if is_csp(t)))
for k, v in harvest.items(): print("harvest", k, len(v))
_hpath = os.path.join(AP, "harvested-hashes.json")
_merged = {}
if os.path.exists(_hpath):
    for k, d in json.load(open(_hpath)).items():
        _merged[k] = {h: set(v) for h, v in d.items()}
for k, hs in harvest.items():
    for h in hs:
        _merged.setdefault(k, {}).setdefault(h, set()).add(PATH)
json.dump({k: {h: sorted(v) for h, v in d.items()} for k, d in _merged.items()},
          open(_hpath, "w"), indent=1)
print("merged into", _hpath)
