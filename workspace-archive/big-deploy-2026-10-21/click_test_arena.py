#!/usr/bin/env python3
"""Refresh-1 Arena check: serve ~/workspace/.deploy locally as
https://firebabys.io with the staged strict CSP (same policy builder as
click_test.py), load game-60 (Arena), walk menu -> ladder -> math gate ->
pick Blaze -> loadout -> FIGHT, assert the bout actually starts (phase
'morph'/'fight', HP bars present), throw attacks, open pause.
Collect CSP violations + pageerrors; exit nonzero on any failure."""
import json, os, re, sys
from playwright.sync_api import sync_playwright

WS = os.path.expanduser("~/workspace")
SERVE = os.path.join(WS, ".deploy")
HMAP = json.load(open(os.path.join(WS, "a-plus-project", "hashmap.json")))

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

CSP_HINTS = ("refused to", "content security policy", "violates the following", "applying inline")
results = []
def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + ((" :: " + extra) if extra else ""), flush=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--use-gl=swiftshader"])
    ctx = browser.new_context(viewport={"width": 1280, "height": 800},
        user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36")
    ctx.add_init_script("try{localStorage.setItem('fb_auth_token','test-token-arena');"
                        "localStorage.setItem('fb_auth_user', JSON.stringify({email:'t@example.com',name:'Tester'}));"
                        "localStorage.setItem('fb_auth_token_at', String(Date.now()));"
                        "localStorage.setItem('fb_lang','en');}catch(e){}")
    pg = ctx.new_page()
    msgs = []
    pg.on("console", lambda m: msgs.append(("console-" + m.type, m.text[:500])))
    pg.on("pageerror", lambda e: msgs.append(("pageerror", str(e)[:500])))

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
        route.abort()  # external (auth/multiplayer workers) not needed for a local ladder bout
    pg.route("**/*", handler)

    URL = "https://firebabys.io/fire-world/games/game-60-fire-babys-arena.html"
    pg.goto(URL, wait_until="load", timeout=30000)
    try:
        pg.wait_for_selector("#overlay", state="visible", timeout=20000)
        check("arena menu loads", True)
    except Exception as e:
        check("arena menu loads", False, str(e)[:120])

    pg.click("#ladderBtn")
    # math gate
    try:
        pg.wait_for_selector("#mathgate", state="visible", timeout=10000)
        qel = pg.query_selector("#mq"); inp = pg.query_selector("#ma")
        m = re.search(r"(\d+)\s*([+\-x×])\s*(\d+)", qel.inner_text())
        a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
        inp.fill(str(a + b if op == "+" else (a - b if op == "-" else a * b)))
        pg.click("#mathgate button")
        check("math gate solved", True)
    except Exception as e:
        check("math gate solved", False, str(e)[:120])

    # pick Blaze -> loadout screen
    try:
        pg.wait_for_selector("#selectScr", state="visible", timeout=10000)
        pg.click('.charCard[data-char="blaze"]')
        pg.click("#selConfirm")
        pg.wait_for_selector("#loadoutScr", state="visible", timeout=10000)
        check("fighter select + loadout screen", True)
    except Exception as e:
        check("fighter select + loadout screen", False, str(e)[:120])

    # FIGHT -> bout starts (poll via evaluate: wait_for_function's injected
    # predicate compilation is itself blocked by strict CSP 'unsafe-eval')
    def phase():
        try: return pg.evaluate("() => window.FBArena && window.FBArena.G ? window.FBArena.G.phase : null")
        except Exception: return None
    def wait_phase(want, timeout_s=15):
        for _ in range(timeout_s * 4):
            if phase() in want: return True
            pg.wait_for_timeout(250)
        return False
    try:
        pg.click("#fightBtn")
        check("bout starts (morph/fight phase)", wait_phase({"morph", "fight"}))
        wait_phase({"fight"})
        hp = pg.evaluate("() => ({p1: window.FBArena.G.p1.hp, p2: window.FBArena.G.p2.hp, max: window.FBArena.G.p1.maxHp})")
        check("both fighters at full HP", hp["p1"] == hp["max"] and hp["p2"] > 0, str(hp))
        # move + attack keys (round-2 controls: D move, F punch, J kick, W jump)
        for key in ("KeyD", "KeyF", "KeyJ", "KeyW", "KeyW", "KeyG"):
            pg.keyboard.press(key); pg.wait_for_timeout(300)
        pg.wait_for_timeout(1500)
        check("fight continues after inputs", phase() == "fight")
        # pause menu
        pg.click("#pauseBtn"); pg.wait_for_timeout(600)
        check("pause menu opens", pg.query_selector("#resumeBtn") is not None)
        pg.click("#resumeBtn"); pg.wait_for_timeout(400)
        check("resume works", phase() == "fight")
    except Exception as e:
        check("bout flow", False, str(e)[:160])

    csp_msgs = [m for m in msgs if any(h in m[1].lower() for h in CSP_HINTS)]
    perrs = [m for m in msgs if m[0] == "pageerror"]
    check("ZERO CSP violations on game-60", len(csp_msgs) == 0, f"count={len(csp_msgs)} {csp_msgs[:2]}")
    check("ZERO pageerrors on game-60", len(perrs) == 0, f"count={len(perrs)} {perrs[:2]}")
    browser.close()

fails = [r for r in results if not r[1]]
print(f"\n==== arena click-test: {len(results) - len(fails)}/{len(results)} passed ====")
sys.exit(1 if fails else 0)
