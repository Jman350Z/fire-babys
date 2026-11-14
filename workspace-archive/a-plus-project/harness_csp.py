#!/usr/bin/env python3
"""Phase 2 proof: serve ~/workspace/.deploy locally (via route interception of
https://firebabys.io), once with the OLD CSP and once with the STRICT CSP as the
ENFORCING header. Collect console errors + pageerrors per page; strict must add
zero CSP violations and zero new errors vs baseline.
Usage: harness_csp.py [substring-filter ...]  (writes phase2-results.json)"""
import json, os, re, sys, time
from playwright.sync_api import sync_playwright

WS = os.path.expanduser("~/workspace")
SERVE = os.path.join(WS, ".deploy")
AP = os.path.join(WS, "a-plus-project")
HMAP = json.load(open(os.path.join(AP, "hashmap.json")))
OLD_CSP = ("default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; "
           "connect-src 'self' https: wss:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'")
ONLY = [a for a in sys.argv[1:]]

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
            if f.endswith(".html"):
                out.append("/" + os.path.relpath(os.path.join(dp, f), SERVE))
    return sorted(out)

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
                return True
    except Exception: pass
    return False

def run_pass(browser, policy_name, csp_fn):
    results = {}
    pages = [p for p in all_pages() if not ONLY or any(o in p for o in ONLY)]
    for path in pages:
        ctx = browser.new_context(viewport={"width": 844, "height": 390},
                                  user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36")
        ctx.add_init_script("try{localStorage.setItem('fb_auth_token','harness-token');localStorage.setItem('fb_lang','en');}catch(e){}")
        pg = ctx.new_page()
        msgs = []
        def on_console(m):
            txt = m.text
            msgs.append((m.type, txt if is_csp(txt) else txt[:400]))
        pg.on("console", on_console)
        pg.on("pageerror", lambda e: msgs.append(("pageerror", str(e)[:400])))
        def handler(route):
            req = route.request
            u = req.url
            if u.startswith("https://firebabys.io"):
                from urllib.parse import urlparse
                pth = urlparse(u).path
                fs = os.path.join(SERVE, pth.lstrip("/"))
                if os.path.isdir(fs): fs = os.path.join(fs, "index.html")
                if not os.path.splitext(fs)[1]: fs += ".html"
                if os.path.isfile(fs):
                    ext = os.path.splitext(fs)[1]
                    hdrs = {"Content-Type": CT.get(ext, "application/octet-stream")}
                    if ext == ".html": hdrs["Content-Security-Policy"] = csp_fn(pth)
                    route.fulfill(status=200, headers=hdrs, body=open(fs, "rb").read())
                    return
                route.fulfill(status=404, headers={"Content-Type": "text/html"}, body=b"nf")
                return
            if u.startswith(("data:", "blob:", "about:")):
                route.continue_(); return
            route.continue_()
        pg.route("**/*", handler)
        try:
            pg.goto("https://firebabys.io" + path, timeout=25000, wait_until="load")
            pg.wait_for_timeout(1200)
            solve_gate(pg)
            pg.wait_for_timeout(600)
            try:
                pg.mouse.click(422, 195)
                pg.keyboard.press("Space")
            except Exception: pass
            pg.wait_for_timeout(900)
        except Exception as e:
            msgs.append(("harness-error", str(e)[:200]))
        results[path] = msgs
        ctx.close()
        print(f"[{policy_name}] {path}: {len(msgs)} msgs", flush=True)
    return results

CSP_HINT = ("Refused to", "Content Security Policy", "violates the following",
            "Content-Security-Policy", "Applying inline")
def is_csp(t): return any(h.lower() in t.lower() for h in CSP_HINT)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--use-gl=swiftshader"])
    base = run_pass(browser, "baseline-old", lambda p: OLD_CSP)
    strict = run_pass(browser, "strict", strict_csp)
    browser.close()

report = {}
for path in strict:
    b_err = [t for ty, t in base.get(path, []) if ty in ("error", "pageerror")]
    s_all = strict[path]
    s_csp = [t for ty, t in s_all if is_csp(t)]
    s_err = [t for ty, t in s_all if ty in ("error", "pageerror")]
    new_err = [t for t in s_err if t not in b_err]
    report[path] = {"csp_violations": s_csp, "new_errors_vs_baseline": new_err,
                    "baseline_errors": len(b_err), "strict_errors": len(s_err)}
json.dump(report, open(os.path.join(AP, os.environ.get("PHASE2_OUT", "phase2-results.json")), "w"), indent=1)
# Harvest: hashes Chromium says are required, grouped by the directive named
# in each violation — these are runtime-generated styles to allowlist globally.
harvest = {}
for path, msgs in strict.items():
    for ty, t in msgs:
        if not is_csp(t): continue
        dm = re.search(r"directive '(script-src-attr|script-src|style-src-attr|style-src)", t)
        directive = dm.group(1) if dm else "unknown"
        for h in re.findall(r"\('(sha256-[A-Za-z0-9+/=]+)'\)", t):
            harvest.setdefault(directive, {}).setdefault(h, set()).add(path)
_hpath = os.path.join(AP, "harvested-hashes.json")
_merged = {}
if os.path.exists(_hpath):
    for k, d in json.load(open(_hpath)).items():
        _merged[k] = {h: set(v) for h, v in d.items()}
for k, d in harvest.items():
    for h, ps in d.items():
        _merged.setdefault(k, {}).setdefault(h, set()).update(ps)
json.dump({k: {h: sorted(v) for h, v in d.items()} for k, d in _merged.items()},
          open(_hpath, "w"), indent=1)
print("harvested required hashes by directive:")
for k, d in harvest.items(): print(" ", k, len(d), "hashes")
bad = {p: r for p, r in report.items() if r["csp_violations"] or r["new_errors_vs_baseline"]}
print("\n==== PHASE 2 SUMMARY ====")
print("pages tested:", len(report))
print("pages with CSP violations:", sum(1 for r in report.values() if r["csp_violations"]))
print("pages with NEW errors vs baseline:", sum(1 for r in report.values() if r["new_errors_vs_baseline"]))
for p, r in bad.items():
    print("---", p)
    for t in r["csp_violations"][:4]: print("  CSP:", t[:250])
    for t in r["new_errors_vs_baseline"][:4]: print("  NEWERR:", t[:250])
