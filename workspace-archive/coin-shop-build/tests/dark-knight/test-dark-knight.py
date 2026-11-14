#!/usr/bin/env python3
"""Dark Knight browser harness (Jeff, 2026-10-21).

Serves ~/workspace/.deploy as https://firebabys.io (route interception,
same pattern as a-plus-project/harness_csp.py) with the STAGED strict
CSP from a-plus-project/hashmap.json as the enforcing header, and
mocks the auth Worker: /auth/config + /auth/session succeed for a
harness player, and GET /presence returns a test-controlled arrival.

Proves:
  hub (fire-world.html):
    - no arrival -> no banner
    - fresh arrival A -> banner shows with the exact text, fixed overlay
    - banner auto-removes after ~6s
    - the NEXT poll (30s) with the same arrival does NOT re-show it
    - a NEW arrival B shows again; a reload with B does NOT (seen-set
      persisted in localStorage); a stale arrival is retired unseen
    - 0 CSP violations, 0 page errors throughout
  3d.html + play.html (their own meta CSP + the staged header CSP):
    - fresh arrival -> banner shows; 0 CSP violations; no page errors
      beyond the no-arrival baseline pass of the same page

Writes results.json next to this file; exit 1 on any failure.
Run: python3 tests/dark-knight/test-dark-knight.py
"""
import json, os, re, sys, time
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

WS = os.path.expanduser("~/workspace")
SERVE = os.path.join(WS, ".deploy")
HMAP = json.load(open(os.path.join(WS, "a-plus-project", "hashmap.json")))
AUTH_HOST = "https://fire-babys-auth.jeffpruden288.workers.dev"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results.json")

CT = {".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css",
      ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json",
      ".zip": "application/zip", ".svg": "image/svg+xml", ".ico": "image/x-icon"}

CSP_HINT = ("Refused to", "Content Security Policy", "violates the following",
            "Content-Security-Policy", "Applying inline")
def is_csp(t): return any(h.lower() in t.lower() for h in CSP_HINT)

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

# Test-controlled presence state; the route handler reads it live.
STATE = {"arrival": None, "presence_hits": 0}

def make_handler():
    def handler(route):
        req = route.request
        u = req.url
        if u.startswith(AUTH_HOST):
            pth = urlparse(u).path
            if pth == "/presence":
                STATE["presence_hits"] += 1
                body = json.dumps({"ok": True, "arrival": STATE["arrival"]}).encode()
                route.fulfill(status=200, headers={"Content-Type": "application/json"}, body=body)
                return
            if pth == "/auth/config":
                route.fulfill(status=200, headers={"Content-Type": "application/json"},
                              body=b'{"ok":true,"googleClientId":"","emailVerification":false}')
                return
            if pth == "/auth/session":
                route.fulfill(status=200, headers={"Content-Type": "application/json"},
                              body=b'{"ok":true,"email":"harness@example.com","name":"Harness Player","role":"player","isAdmin":false}')
                return
            route.fulfill(status=200, headers={"Content-Type": "application/json"}, body=b'{"ok":true}')
            return
        if u.startswith("https://firebabys.io"):
            pth = urlparse(u).path
            fs = os.path.join(SERVE, pth.lstrip("/"))
            if os.path.isdir(fs): fs = os.path.join(fs, "index.html")
            if not os.path.splitext(fs)[1]: fs += ".html"
            if os.path.isfile(fs):
                ext = os.path.splitext(fs)[1]
                hdrs = {"Content-Type": CT.get(ext, "application/octet-stream")}
                if ext == ".html": hdrs["Content-Security-Policy"] = strict_csp(pth)
                route.fulfill(status=200, headers=hdrs, body=open(fs, "rb").read())
                return
            route.fulfill(status=404, headers={"Content-Type": "text/html"}, body=b"nf")
            return
        if u.startswith(("data:", "blob:", "about:", "ws://", "wss://")):
            route.continue_(); return
        # Hermetic: no other network leaves the harness.
        route.abort()
    return handler

RESULTS = {"checks": [], "pages": {}}
def check(cond, label):
    RESULTS["checks"].append({"ok": bool(cond), "label": label})
    print(("  PASS " if cond else "  FAIL ") + label, flush=True)

def new_page(browser):
    ctx = browser.new_context(viewport={"width": 844, "height": 390},
        user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36")
    ctx.add_init_script("try{localStorage.setItem('fb_auth_token','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');"
                        "localStorage.setItem('fb_lang','en');localStorage.setItem('fb_onboarded_v1','1');}catch(e){}")
    pg = ctx.new_page()
    msgs = []
    pg.on("console", lambda m: msgs.append((m.type, m.text[:2000])))
    pg.on("pageerror", lambda e: msgs.append(("pageerror", str(e)[:500])))
    pg.route("**/*", make_handler())
    return ctx, pg, msgs

def csp_of(msgs): return [t for ty, t in msgs if is_csp(t)]
def errors_of(msgs): return [t for ty, t in msgs if ty in ("error", "pageerror")]

# CSP messages are compared by SIGNATURE between a page's no-arrival
# baseline pass and its arrival pass — the check is "Dark Knight added
# no violation", not "this legacy page is spotless". Two signatures
# are known page-owned noise, documented in DARK-KNIGHT-REPORT.md:
#  - play.html: the 'frame-ancestors is ignored in <meta>' notice its
#    own meta CSP emits on every single load.
#  - 3d.html: a rare intermittent block of the game's OWN main script
#    (required hash sha256-y0vg...) seen in ~1 of 20 boots, including
#    boots where the banner never fired; never reproduced in the
#    banner-firing batch (0/6) or the tag-stripped control (0/6).
KNOWN_3D_FLAKE_SIG = None  # filled below from the required-hash form
def csp_sigs(msgs):
    sigs = set()
    for t in csp_of(msgs):
        m = re.search(r"a hash \('(sha256-[^']+)'\)", t)
        if m:
            sigs.add("inline-script:" + m.group(1))
        elif "frame-ancestors" in t and "ignored when delivered via a <meta>" in t:
            sigs.add("meta-notice:frame-ancestors")
        else:
            sigs.add(t[:120])
    return sigs

def banner(pg):
    return pg.query_selector("#fb-dark-knight-banner")

def wait_banner(pg, timeout_ms=6000):
    try:
        pg.wait_for_selector("#fb-dark-knight-banner", timeout=timeout_ms)
        return True
    except Exception:
        return False

now_ms = lambda: int(time.time() * 1000)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--use-gl=swiftshader"])

    # ---------- HUB: full behavior suite ----------
    print("hub /fire-world.html behavior suite:")
    ctx, pg, msgs = new_page(browser)
    STATE["arrival"] = None
    pg.goto("https://firebabys.io/fire-world.html", timeout=25000, wait_until="load")
    pg.wait_for_timeout(1800)
    check(banner(pg) is None, "no arrival -> no banner")
    check(STATE["presence_hits"] >= 1, "watcher polled /presence on load")

    STATE["arrival"] = {"id": "arrival-A-test", "at": now_ms()}
    pg.reload(timeout=25000, wait_until="load")
    check(wait_banner(pg), "fresh arrival A -> banner shows")
    el = banner(pg)
    txt = el.inner_text() if el else ""
    check(txt == "⚔️ A Dark Knight is coming...", f"banner text exact (got {txt!r})")
    pos = pg.evaluate("() => { const b = document.getElementById('fb-dark-knight-banner');"
                      " const cs = getComputedStyle(b); return {position: cs.position, top: cs.top, zIndex: cs.zIndex}; }")
    check(pos["position"] == "fixed" and pos["top"] == "0px", f"banner is a fixed top overlay (got {pos})")
    pg.screenshot(path=os.path.join(os.path.dirname(OUT), "hub-banner.png"))

    # banner auto-removes (~6s visible incl. fade)
    try:
        pg.wait_for_selector("#fb-dark-knight-banner", state="detached", timeout=10000)
        gone = True
    except Exception:
        gone = False
    check(gone, "banner auto-removes after ~6s")

    # next poll (~30s) with the SAME arrival must not re-show
    hits_before = STATE["presence_hits"]
    deadline = time.time() + 40
    repolled = False
    while time.time() < deadline:
        if STATE["presence_hits"] > hits_before:
            repolled = True
            break
        pg.wait_for_timeout(500)
    check(repolled, "watcher polled again (~30s interval)")
    pg.wait_for_timeout(700)
    check(banner(pg) is None, "same arrival on next poll -> banner does NOT re-show")

    # a NEW arrival shows again
    STATE["arrival"] = {"id": "arrival-B-test", "at": now_ms()}
    pg.reload(timeout=25000, wait_until="load")
    check(wait_banner(pg), "new arrival B -> banner shows again")
    try:
        pg.wait_for_selector("#fb-dark-knight-banner", state="detached", timeout=10000)
    except Exception:
        pass
    # reload with the same B: seen-set (localStorage) must suppress it
    pg.reload(timeout=25000, wait_until="load")
    pg.wait_for_timeout(2500)
    check(banner(pg) is None, "reload with same arrival B -> banner does NOT re-show (seen-set)")
    seen = pg.evaluate("() => localStorage.getItem('fb_dk_seen')")
    check(seen and "arrival-A-test" in seen and "arrival-B-test" in seen,
          f"localStorage seen-set holds A and B (got {seen!r})")

    # stale arrival: retired without showing
    STATE["arrival"] = {"id": "arrival-C-stale", "at": now_ms() - 300000}
    pg.reload(timeout=25000, wait_until="load")
    pg.wait_for_timeout(2500)
    check(banner(pg) is None, "stale arrival (5 min old) -> no banner")
    RESULTS["pages"]["/fire-world.html"] = {"csp": csp_of(msgs), "errors": errors_of(msgs)}
    check(len(csp_of(msgs)) == 0, f"hub: 0 CSP violations (got {len(csp_of(msgs))})")
    check(len(errors_of(msgs)) == 0, f"hub: 0 console/page errors (got {errors_of(msgs)[:2]})")
    ctx.close()

    # ---------- 3D + PLAY: boot + banner under their own CSP ----------
    Y0VG_SIG = "inline-script:sha256-y0vgYMqPN08i13vkz3Q53tSuecST14XNS/lISpkRo84="
    for path in ("/3d.html", "/play.html"):
        print(f"{path} boot suite:")
        # baseline pass (no arrival)
        ctx, pg, bmsgs = new_page(browser)
        STATE["arrival"] = None
        try:
            pg.goto("https://firebabys.io" + path, timeout=30000, wait_until="load")
            pg.wait_for_timeout(2500)
        except Exception as e:
            bmsgs.append(("harness-error", str(e)[:200]))
        base_err = errors_of(bmsgs)
        base_sigs = csp_sigs(bmsgs)
        ctx.close()
        # dark pass (fresh arrival); one retry iff the ONLY new CSP
        # signature is the documented intermittent 3D flake.
        flake_retried = False
        for attempt in (1, 2):
            ctx, pg, msgs = new_page(browser)
            STATE["arrival"] = {"id": "arrival-" + path.replace("/", "_") + f"-{attempt}", "at": now_ms()}
            try:
                pg.goto("https://firebabys.io" + path, timeout=30000, wait_until="load")
                shown = wait_banner(pg, timeout_ms=9000)
                pg.wait_for_timeout(800)
            except Exception as e:
                shown = False
                msgs.append(("harness-error", str(e)[:200]))
            new_sigs = csp_sigs(msgs) - base_sigs
            ctx.close()
            if attempt == 1 and path == "/3d.html" and new_sigs == {Y0VG_SIG}:
                flake_retried = True
                print("  NOTE documented 3D intermittent flake hit once; retrying the dark pass")
                continue
            break
        check(shown, f"{path}: fresh arrival -> banner shows")
        errs = errors_of(msgs)
        new_errs = [t for t in errs if t not in base_err]
        RESULTS["pages"][path] = {"csp": csp_of(msgs), "csp_sigs": sorted(csp_sigs(msgs)),
                                  "baseline_csp_sigs": sorted(base_sigs),
                                  "errors": errs, "baseline_errors": base_err,
                                  "flake_retried": flake_retried}
        check(len(new_sigs) == 0, f"{path}: 0 NEW CSP violations vs baseline (got {sorted(new_sigs)})")
        check(len(new_errs) == 0, f"{path}: 0 new errors vs baseline (got {new_errs[:2]})")

    browser.close()

failed = [c for c in RESULTS["checks"] if not c["ok"]]
RESULTS["summary"] = {"passed": len(RESULTS["checks"]) - len(failed), "failed": len(failed)}
json.dump(RESULTS, open(OUT, "w"), indent=1)
print(f"\n==== DARK KNIGHT HARNESS: {RESULTS['summary']['passed']} passed, {RESULTS['summary']['failed']} failed ====")
sys.exit(1 if failed else 0)
