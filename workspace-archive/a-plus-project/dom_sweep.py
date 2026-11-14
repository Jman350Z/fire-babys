#!/usr/bin/env python3
"""All-page DOM sweep: for every staging page, load locally under the final strict
policy (no auth seed), exercise lightly, and record the VALUES of every inline
event handler, style attribute, <style> block and inline <script> in the live DOM,
plus any CSP console messages. Output: dom-sweep.json"""
import json, os, re
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
def all_pages():
    out = []
    for dp, dn, fs in os.walk(SERVE):
        for f in sorted(fs):
            if f.endswith(".html"): out.append("/" + os.path.relpath(os.path.join(dp, f), SERVE))
    return sorted(out)
def solve_gate(page):
    try:
        qel = page.query_selector("#mq"); inp = page.query_selector("#ma")
        if qel and inp:
            t = qel.inner_text(); m = re.search(r"(\d+)\s*([+\-x×])\s*(\d+)", t)
            if m:
                a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
                ans = a + b if op == "+" else (a - b if op == "-" else a * b)
                inp.fill(str(ans))
                for sel in ["#mathgate button", "button:has-text('UNLOCK')"]:
                    btn = page.query_selector(sel)
                    if btn: btn.click(); page.wait_for_timeout(300); break
    except Exception: pass

DUMP_JS = """() => {
  const r = {handlers: [], styles: [], scripts: [], styleAttrs: []};
  document.querySelectorAll('*').forEach(el => {
    if (!el.getAttributeNames) return;
    for (const at of el.getAttributeNames()) {
      if (at.startsWith('on')) r.handlers.push(el.getAttribute(at));
      if (at === 'style') r.styleAttrs.push(el.getAttribute(at));
    }
  });
  document.querySelectorAll('style').forEach(s => r.styles.push(s.textContent));
  document.querySelectorAll('script:not([src])').forEach(s => r.scripts.push(s.textContent));
  return r;
}"""

out = {}
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--use-gl=swiftshader"])
    for path in all_pages():
        ctx = browser.new_context(viewport={"width": 844, "height": 390},
            user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36")
        pg = ctx.new_page()
        msgs = []
        pg.on("console", lambda m: msgs.append(m.text))
        def handler(route):
            u = route.request.url
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
        dom = {"handlers": [], "styles": [], "scripts": [], "styleAttrs": []}
        try:
            pg.goto("https://firebabys.io" + path, timeout=25000, wait_until="load")
            pg.wait_for_timeout(2200)
            solve_gate(pg)
            pg.wait_for_timeout(500)
            try: pg.mouse.click(422, 195)
            except Exception: pass
            pg.wait_for_timeout(700)
            dom = pg.evaluate(DUMP_JS)
        except Exception as e:
            msgs.append("HARNESS-ERR: " + str(e)[:150])
        out[path] = {"handlers": sorted(set(dom["handlers"])), "styles": sorted(set(dom["styles"])),
                     "scripts": sorted(set(dom["scripts"])), "styleAttrs": sorted(set(dom["styleAttrs"])),
                     "csp_msgs": [m for m in msgs if "Content Security Policy" in m or "Refused to" in m]}
        print(path, "| H:", len(out[path]["handlers"]), "SA:", len(out[path]["styleAttrs"]),
              "ST:", len(out[path]["styles"]), "SC:", len(out[path]["scripts"]),
              "CSP:", len(out[path]["csp_msgs"]), flush=True)
        ctx.close()
    browser.close()
json.dump(out, open(os.path.join(AP, "dom-sweep.json"), "w"), indent=1)
print("wrote dom-sweep.json")
