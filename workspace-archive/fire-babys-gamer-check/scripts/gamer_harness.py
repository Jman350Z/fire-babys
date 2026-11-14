#!/usr/bin/env python3
import json, re, os, sys, time
from playwright.sync_api import sync_playwright

BASE="http://localhost:8947"
URLS=[
 "/play.html","/3d.html","/fire-world/game-02-blaze-runner.html",
]+[f"/fire-world/games/{n}" for n in sorted(os.listdir(os.path.expanduser("~/workspace/.deploy/fire-world/games")))]+[
 "/fire-world/rukos-panic-dash/","/fire-world/slingshot-cascade/","/fire-world/trinitys-holy-lightning-rescue/","/fire-world/tristans-dark-knight-rescue/"
]
def solve_gate(page):
    try:
        q=page.query_selector("#mq"); inp=page.query_selector("#ma")
        if q and inp:
            t=q.inner_text(); m=re.search(r"(\d+)\s*([+\-x×])\s*(\d+)",t)
            if m:
                a,op,b=int(m.group(1)),m.group(2),int(m.group(3))
                ans=a+b if op=="+" else (a-b if op=="-" else a*b)
                inp.fill(str(ans))
                for sel in ["#mathgate button","button:has-text('UNLOCK')"]:
                    btn=page.query_selector(sel)
                    if btn: btn.click(); page.wait_for_timeout(400); break
                return True
    except Exception: pass
    return False

def run_one(p, url, mobile):
    ctx=p.chromium.launch(headless=True)  # placeholder replaced below
    return None

results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True, args=["--use-gl=swiftshader"])
    for url in URLS:
        for mobile in (False, True):
            if mobile and url in ("/play.html","/3d.html"): pass
            page_errors=[]; console_errors=[]
            ctx=browser.new_context(viewport={"width":390,"height":844} if mobile else {"width":1280,"height":800}, is_mobile=mobile, has_touch=mobile, user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15" if mobile else None)
            pg=ctx.new_page()
            pg.on("pageerror", lambda e, pe=page_errors: pe.append(str(e)[:300]))
            pg.on("console", lambda m, ce=console_errors: ce.append(m.text[:200]) if m.type=="error" else None)
            t0=time.time(); loaded=False; fps=None
            try:
                pg.goto(BASE+url, timeout=30000, wait_until="load"); loaded=True
                pg.wait_for_timeout(1200)
                # dismiss title
                try:
                    ov=pg.query_selector("#overlay")
                    if ov and ov.is_visible():
                        if pg.query_selector("#mathgate:not(.hidden)"): solve_gate(pg)
                        btn=pg.query_selector("#obtn")
                        if btn and btn.is_visible(): btn.click(); pg.wait_for_timeout(600)
                        if pg.query_selector("#mathgate:not(.hidden)"): solve_gate(pg); pg.wait_for_timeout(400)
                    else:
                        for sel in ["button:has-text('START')","button:has-text('PLAY')","button:has-text('TAP TO START')"]:
                            b=pg.query_selector(sel)
                            if b and b.is_visible(): b.click(); pg.wait_for_timeout(500); break
                except Exception: pass
                # inputs
                try:
                    for k in ["ArrowLeft","ArrowRight","Space","ArrowUp"]:
                        pg.keyboard.press(k); pg.wait_for_timeout(120)
                    box=None
                    c=pg.query_selector("canvas")
                    if c: box=c.bounding_box()
                    if box:
                        pg.mouse.click(box["x"]+box["width"]/2, box["y"]+box["height"]/2)
                        if mobile: pg.touchscreen.tap(box["x"]+box["width"]/2, box["y"]+box["height"]/2)
                except Exception: pass
                # FPS: count rAF over 2.5s
                try:
                    fps=pg.evaluate("""() => new Promise(res=>{let n=0;const t0=performance.now();function f(){n++;if(performance.now()-t0<2500)requestAnimationFrame(f);else res(Math.round(n/((performance.now()-t0)/1000)))}requestAnimationFrame(f)})""")
                except Exception: fps=None
                pg.wait_for_timeout(300)
            except Exception as e:
                page_errors.append("NAV:"+str(e)[:200])
            load_ms=int((time.time()-t0)*1000)
            results.append({"url":url,"mobile":mobile,"loaded":loaded,"page_errors":page_errors,"console_errors":console_errors[:5],"fps":fps,"elapsed_ms":load_ms})
            print(f"{url} mobile={mobile} loaded={loaded} pe={len(page_errors)} ce={len(console_errors)} fps={fps}", flush=True)
            ctx.close()
    browser.close()
with open(os.path.expanduser("~/workspace/fire-babys-gamer-check/dynamic-results.json"),"w") as f: json.dump(results,f,indent=1)
print("DONE", len(results))
