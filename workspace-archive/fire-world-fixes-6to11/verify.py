#!/usr/bin/env python3
"""Independent first-time-visitor verification for Fire World games 6-11 redos.
Black-box: serves the staged build tree; https://firebabys.io/* is routed to
the same staged files so auth-gate.js / rating.js load as in production.
Hard gate = pageerrors (JS exceptions). Checks per game, desktop + phone:
boots clean, math gate present and passable, game starts, canvas animates,
keyboard input safe, pause/mute/restart controls safe, FPS, screenshot."""
import json, os, re, threading, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

ROOT = os.path.expanduser("~/workspace/fire-world-fixes-6to11")
SERVE = os.path.join(ROOT, "serve")
SHOTS = os.path.join(ROOT, "shots")
os.makedirs(SHOTS, exist_ok=True)
PORT = 8941
BASE = f"http://127.0.0.1:{PORT}"
RESULTS = []

GAMES = [
    ("06-magma-bounce", "/fire-world/games/game-06-blazes-magma-bounce.html"),
    ("07-turbo-drift", "/fire-world/games/game-07-rukos-turbo-drift.html"),
    ("08-spark-jump", "/fire-world/games/game-08-sizzles-spark-jump.html"),
    ("09-ember-cascade", "/fire-world/games/game-09-ember-cascade.html"),
    ("10-caldera-climb", "/fire-world/games/game-10-caldera-climb.html"),
    ("11-trench-dodge", "/fire-world/games/game-11-magma-trench-dodge.html"),
]

def log(game, check, ok, detail=""):
    RESULTS.append({"game": game, "check": check, "ok": bool(ok), "detail": str(detail)[:400]})
    print(("PASS " if ok else "FAIL ") + f"[{game}] {check} {detail}")
    # write-through: a killed run still leaves its results on disk
    try:
        with open(os.path.join(ROOT, "verify-results.json"), "w") as fh:
            json.dump(RESULTS, fh, indent=1)
    except Exception:
        pass

def serve():
    class H(SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=SERVE, **k)
        def log_message(self, *a):
            pass
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()

def new_page(browser, phone=False, seed_auth=True):
    ctx = browser.new_context(viewport={"width": 390, "height": 844} if phone else {"width": 1280, "height": 800},
                              is_mobile=phone, has_touch=phone)
    if seed_auth:
        # Behave like a returning signed-in player: the auth gate finds a token,
        # its session check can't reach the network in the harness, and its own
        # code falls back to trusting the cached user -> gate unlocks.
        ctx.add_init_script("""try {
            localStorage.setItem('fb_auth_token', 'harness-token');
            localStorage.setItem('fb_auth_user', JSON.stringify({email: 'harness@firebabys.io', name: 'Harness'}));
          } catch (e) {}""")
    page = ctx.new_page()
    page.set_default_timeout(9000)
    errs = {"page": [], "console": []}
    reqs = []
    page.on("request", lambda r: reqs.append(r.url))
    page.on("pageerror", lambda e: errs["page"].append(str(e)))
    page.on("console", lambda m: errs["console"].append(m.text) if m.type == "error" else None)
    def route(r):
        url = r.request.url
        if url.startswith("https://firebabys.io/"):
            path = url[len("https://firebabys.io/"):].split("?")[0]
            local = os.path.join(SERVE, path)
            if os.path.isfile(local):
                r.fulfill(path=local)
                return
            r.abort()
            return
        if url.startswith("http://127.0.0.1"):
            r.continue_()
            return
        r.abort()
    page.route("**/*", route)
    return ctx, page, errs, reqs

def fps(page, secs=3):
    return page.evaluate("""(secs)=>new Promise(res=>{let n=0;const t0=performance.now();
      function f(t){n++;if(t-t0<secs*1000)requestAnimationFrame(f);else res(Math.round(n/secs*10)/10);}
      requestAnimationFrame(f);})""", secs)

def canvas_fingerprint(page):
    return page.evaluate("""(()=>{const c=document.querySelector('canvas');if(!c)return 'nocanvas';
      try{const x=c.getContext('2d');const w=c.width,h=c.height;if(!w||!h)return 'zero';
      const d=x.getImageData(0,0,w,h).data;let s=0;for(let i=0;i<d.length;i+=997)s=(s+d[i]*(i%89+1))>>>0;return 'px'+s;}
      catch(e){return 'err:'+e.message;}})()""")

def gate_answer(page):
    """If the math gate is visible, answer it. Returns True/False."""
    try:
        ma = page.query_selector("#ma")
        if not ma or not ma.is_visible():
            return False
        txt = (page.query_selector("#mq").inner_text() or "").strip()
        nums = [int(x) for x in re.findall(r"\d+", txt)][:2]
        if len(nums) < 2:
            return False
        ma.fill(str(nums[0] + nums[1]))
        unlocked = False
        for el in page.query_selector_all("button"):
            if (el.inner_text() or "").strip().upper() == "UNLOCK" and el.is_visible():
                el.click(); unlocked = True; break
        if not unlocked:
            page.evaluate("typeof checkMath === 'function' && checkMath()")
        page.wait_for_timeout(600)
        return True
    except Exception:
        return False

def click_start(page):
    """Click the game's own start control: prefer #obtn, then a text-matched button."""
    ob = page.query_selector("#obtn")
    if ob and ob.is_visible():
        ob.click(); page.wait_for_timeout(700); return "#obtn"
    best = page.evaluate("""() => {
      const keys = ['play', 'start', 'begin', 'go!', 'level 1'];
      const els = [...document.querySelectorAll('button, a, [role=button]')];
      for (const e of els) {
        const r = e.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0)) continue;
        const t = (e.textContent || '').trim().toLowerCase();
        if (keys.some(k => t.includes(k))) { e.click(); return t.slice(0, 24); }
      }
      return null;
    }""")
    page.wait_for_timeout(700)
    return f"text:{best}" if best else "none"

def run_game(browser, name, path, phone):
    tag = name + ("-phone" if phone else "")
    ctx0, page0, errs0, _ = new_page(browser, phone=phone, seed_auth=False)
    try:
        page0.goto(BASE + path, wait_until="domcontentloaded")
        page0.wait_for_timeout(1100)
        body0 = page0.inner_text("body")
        log(tag, "signed-out visitor sees sign-in gate", "SIGN IN TO PLAY" in body0, "")
    except Exception as e:
        log(tag, "signed-out visitor sees sign-in gate", False, str(e)[:100])
    ctx0.close()
    ctx, page, errs, reqs = new_page(browser, phone=phone)
    try:
        page.goto(BASE + path, wait_until="domcontentloaded")
    except Exception as e:
        log(tag, "page loads (domcontentloaded)", False, str(e)[:120])
        ctx.close(); return
    page.wait_for_timeout(1300)
    log(tag, "boots, 0 page errors", len(errs["page"]) == 0, errs["page"][:2])
    log(tag, "voting system absent (no rating.js request)", not any("rating.js" in u for u in reqs), "")
    has_canvas = page.query_selector("canvas") is not None
    log(tag, "canvas present", has_canvas, "")
    # Real visitor flow: keep pressing the obvious next step (PLAY -> math
    # gate -> stage intro / level picker -> play) like a human would.
    gated = False
    steps = []
    for _ in range(6):
        if gate_answer(page):
            gated = True; steps.append("gate"); continue
        nxt = page.evaluate("""() => {
          const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
            return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
          const ov = document.getElementById('overlay');
          if (ov && vis(ov)) {
            const ob = document.getElementById('obtn');
            if (ob && vis(ob)) { const t = (ob.textContent || '').trim().slice(0, 20); ob.click(); return 'obtn:' + t; }
            const btns = [...ov.querySelectorAll('button')].filter(vis);
            const lvl = btns.find(bk => /^\\s*1\\s*$/.test(bk.textContent || ''));
            if (lvl) { lvl.click(); return 'level:1'; }
            if (btns.length) { const t = (btns[0].textContent || '').trim().slice(0, 20); btns[0].click(); return 'ovbtn:' + t; }
            return 'overlay-nobtn';
          }
          const pb = document.getElementById('pauseBtn');
          if (pb) { const r = pb.getBoundingClientRect();
            if (document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === pb) return 'inplay';
          }
          return 'nooverlay';
        }""")
        steps.append(nxt)
        if nxt in ("inplay", "nooverlay", "overlay-nobtn"):
            break
        page.wait_for_timeout(650)
    has_gate = page.query_selector("#ma") is not None
    log(tag, "math gate handled", gated or not has_gate, f"steps={steps}")
    page.wait_for_timeout(700)
    fp1 = canvas_fingerprint(page)
    page.keyboard.down("ArrowRight"); page.wait_for_timeout(150); page.keyboard.up("ArrowRight")
    page.wait_for_timeout(1000)
    fp2 = canvas_fingerprint(page)
    log(tag, "canvas animating after start", fp1 != fp2 and not str(fp1).startswith("err"), f"fp {fp1}->{fp2}")
    for btn, label in [("#pauseBtn", "pause"), ("#muteBtn", "mute"), ("#restartBtn", "restart")]:
        el = page.query_selector(btn)
        if el:
            try:
                if el.is_visible():
                    el.click(); page.wait_for_timeout(350)
                    log(tag, f"{label} control clickable, no errors", len(errs["page"]) == 0, errs["page"][:2])
                else:
                    log(tag, f"{label} control clickable", False, f"{btn} present but not visible in play state")
                    if label == "pause":  # resume so later checks run in play state
                        pass
                    continue
            except Exception as e:
                log(tag, f"{label} control clickable", False, str(e)[:120])
                continue
        elif label == "restart":
            found = page.evaluate("""(()=>{const out=[];
              document.querySelectorAll('button,[role=button],a').forEach(e=>{
                const s=((e.id||'')+' '+(e.className||'')+' '+(e.textContent||'')).toLowerCase();
                if(s.includes('restart')||s.includes('retry')||s.includes('\u21bb'))out.push((e.id||e.className||e.textContent.trim().slice(0,20)));});
              return out.slice(0,5);})()""")
            log(tag, "restart affordance exists (scanned)", len(found) > 0, found)
        else:
            log(tag, f"{label} control present", False, f"{btn} missing")
        if label == "pause":
            el2 = page.query_selector("#resumeBtn")
            if el2 and el2.is_visible():
                el2.click(); page.wait_for_timeout(300)
    for key in ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]:
        page.keyboard.down(key); page.wait_for_timeout(120); page.keyboard.up(key)
    page.keyboard.down("Space"); page.wait_for_timeout(450); page.keyboard.up("Space")
    page.wait_for_timeout(400)
    log(tag, "keyboard input causes no errors", len(errs["page"]) == 0, errs["page"][:2])
    if phone:
        page.touchscreen.tap(195, 420)
        page.wait_for_timeout(400)
        log(tag, "touch tap causes no errors", len(errs["page"]) == 0, errs["page"][:2])
    f = fps(page)
    log(tag, "FPS >= 30 (SwiftShader harness)", f >= 30, f"{f} fps")
    page.screenshot(path=f"{SHOTS}/{name}-{'phone' if phone else 'desktop'}.png")
    log(tag, "no page errors during full pass", len(errs["page"]) == 0, errs["page"][:2])
    if errs["console"]:
        print(f"  note [{tag}] console errors (non-gating): {errs['console'][:3]}")
    ctx.close()

def main():
    threading.Thread(target=serve, daemon=True).start()
    time.sleep(0.6)
    import sys
    only = sys.argv[1:]
    games = [(n, p) for n, p in GAMES if not only or any(n.startswith(o) for o in only)]
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        for name, path in games:
            run_game(browser, name, path, phone=False)
            run_game(browser, name, path, phone=True)
        browser.close()
    fails = [r for r in RESULTS if not r["ok"]]
    print(f"\n==== {len(RESULTS) - len(fails)}/{len(RESULTS)} checks passed ====")
    for r in fails:
        print("FAILED:", r["game"], "|", r["check"], "|", r["detail"])
    with open(os.path.join(ROOT, "verify-results.json"), "w") as fh:
        json.dump(RESULTS, fh, indent=1)

if __name__ == "__main__":
    main()
