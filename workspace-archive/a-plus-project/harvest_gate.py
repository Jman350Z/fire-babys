#!/usr/bin/env python3
"""Deep harvest: load named pages WITHOUT an auth token (real first-visit flow,
auth gate renders), strict FINAL policy enforcing locally. Capture full CSP
console violations + hash every inline handler/style/script in the live DOM."""
import json, os, re, sys, hashlib, base64
from playwright.sync_api import sync_playwright

WS = os.path.expanduser("~/workspace")
SERVE = os.path.join(WS, ".deploy")
AP = os.path.join(WS, "a-plus-project")
sys.path.insert(0, AP)
import importlib.util
spec = importlib.util.spec_from_file_location("hc", os.path.join(AP, "harness_csp.py"))

# Re-implement the policy builder locally (importing harness would run it).
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
def sha(t): return "sha256-" + base64.b64encode(hashlib.sha256(t.encode("utf-8")).digest()).decode()

PAGES = ["/", "/fire-world/games/game-05-lord-infernos-ballista-siege.html",
         "/fire-world/slingshot-cascade/", "/fire-world/games/game-04-cinders-ice-rink-chaos.html",
         "/fire-world.html"]

def solve_gate(page):
    try:
        qel = page.query_selector("#mq"); inp = page.query_selector("#ma")
        if qel and inp:
            t = qel.inner_text()
            m = re.search(r"(\d+)\s*([+\-x×])\s*(\d+)", t)
            if m:
                a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
                ans = a + b if op == "+" else (a - b if op == "-" else a * b)
                inp.fill(str(ans))
                for sel in ["#mathgate button", "button:has-text('UNLOCK')"]:
                    btn = page.query_selector(sel)
                    if btn: btn.click(); page.wait_for_timeout(400); break
    except Exception: pass

out = {}
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--use-gl=swiftshader"])
    for path in PAGES:
        ctx = browser.new_context(viewport={"width": 844, "height": 390},
            user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36")
        pg = ctx.new_page()
        msgs = []
        pg.on("console", lambda m: msgs.append(m.text))
        pg.on("pageerror", lambda e: msgs.append("PAGEERROR: " + str(e)))
        def handler(route):
            req = route.request; u = req.url
            if u.startswith("https://firebabys.io"):
                from urllib.parse import urlparse
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
            route.continue_()
        pg.route("**/*", handler)
        dom = {}
        try:
            pg.goto("https://firebabys.io" + path, timeout=25000, wait_until="load")
            pg.wait_for_timeout(3000)   # let the auth gate render fully
            dom = pg.evaluate("""() => {
              const r = {handlers: [], styles: [], scripts: [], styleAttrs: []};
              document.querySelectorAll('*').forEach(el => {
                for (const at of el.getAttributeNames ? el.getAttributeNames() : []) {
                  if (at.startsWith('on')) r.handlers.push(el.getAttribute(at));
                  if (at === 'style') r.styleAttrs.push(el.getAttribute(at));
                }
              });
              document.querySelectorAll('style').forEach(s => r.styles.push(s.textContent));
              document.querySelectorAll('script:not([src])').forEach(s => r.scripts.push(s.textContent));
              return r;
            }""")
            solve_gate(pg)
            pg.mouse.click(422, 195); pg.wait_for_timeout(1200)
            pg.keyboard.press("Space"); pg.wait_for_timeout(1200)
        except Exception as e:
            msgs.append("HARNESS-ERR: " + str(e)[:200])
        csp = [m for m in msgs if "Content Security Policy" in m or "Refused to" in m]
        out[path] = {"csp_msgs": csp,
                     "dom_handlers": sorted({sha(v) for v in dom.get("handlers", [])}),
                     "dom_handler_vals": sorted(set(dom.get("handlers", [])))[:20],
                     "dom_styles": sorted({sha(v) for v in dom.get("styles", [])}),
                     "dom_scripts": sorted({sha(v) for v in dom.get("scripts", [])}),
                     "dom_style_attrs": sorted({sha(v) for v in dom.get("styleAttrs", [])})}
        print(path, "| CSP msgs:", len(csp), "| DOM handlers:", len(out[path]["dom_handlers"]),
              "| DOM styles:", len(out[path]["dom_styles"]), "| DOM scripts:", len(out[path]["dom_scripts"]),
              "| DOM styleAttrs:", len(out[path]["dom_style_attrs"]), flush=True)
        for m in csp[:3]: print("   ", m[:300], flush=True)
        ctx.close()
    browser.close()
json.dump(out, open(os.path.join(AP, "gate-harvest.json"), "w"), indent=1)
print("wrote gate-harvest.json")
