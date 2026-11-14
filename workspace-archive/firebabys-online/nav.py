"""Drive the persistent CDP Chromium (port 9222) through the exported
Rebellion build. Usage: python3 nav.py '<json list of steps>'.
State (hero pos / cam yaw / calibrated speed) persists in /tmp/nav_state.json.
Steps: {"goto":1} {"wait":ms} {"shot":"name"} {"click":[x,y]}
{"key":"Space"} {"legs":[["N",2],["E",1]]} {"calibrate":1}
{"hold_e":real_seconds} {"crouch":1} {"esc":1} {"geterrs":1}
"""
import asyncio, json, math, os, sys, io, base64
from playwright.async_api import async_playwright
from PIL import Image

STATE_F = "/tmp/nav_state.json"
OUTDIR = "/home/hatch/workspace/firebabys-online"
URL = "http://127.0.0.1:8902/game/index.html"
TILE = 1.6
WALK = 3.4

def load_state():
    if os.path.exists(STATE_F):
        return json.load(open(STATE_F))
    return {"pos": [4.0, 21.6], "yaw": 0.0, "eff": None, "ratio": 2.0, "moving": 0.0}

def save_state(s):
    json.dump(s, open(STATE_F, "w"))

def wrap(a):
    while a > math.pi: a -= 2 * math.pi
    while a < -math.pi: a += 2 * math.pi
    return a

DIRS = {"N": (0.0, -1.0), "E": (1.0, 0.0), "S": (0.0, 1.0), "W": (-1.0, 0.0)}

async def shot_bytes(page):
    cdp = await page.context.new_cdp_session(page)
    res = await cdp.send("Page.captureScreenshot", {"format": "png"})
    await cdp.detach()
    return base64.b64decode(res["data"])

def frame_diff(a: bytes, b: bytes) -> float:
    ia = Image.open(io.BytesIO(a)).convert("L").resize((160, 90))
    ib = Image.open(io.BytesIO(b)).convert("L").resize((160, 90))
    pa, pb = ia.load(), ib.load()
    tot = 0
    for y in range(90):
        for x in range(160):
            tot += abs(pa[x, y] - pb[x, y])
    return tot / (160 * 90)

async def main():
    steps = json.loads(sys.argv[1])
    st = load_state()
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
        ctx = browser.contexts[0]
        page = ctx.pages[0] if ctx.pages else await ctx.new_page()
        for step in steps:
            if "goto" in step:
                cdp0 = await page.context.new_cdp_session(page)
                await cdp0.send("Emulation.setDeviceMetricsOverride", {
                    "width": 820, "height": 470, "deviceScaleFactor": 1, "mobile": False})
                await cdp0.detach()
                await page.goto(URL)
                await page.wait_for_selector("#status", state="detached", timeout=120000)
                await page.evaluate("""() => {
                    window.__errs = [];
                    const oe = console.error.bind(console);
                    console.error = (...a) => { window.__errs.push(a.join(' ')); oe(...a); };
                }""")
                print("BOOTED", flush=True)
            elif "wait" in step:
                await page.wait_for_timeout(step["wait"])
            elif "shot" in step:
                data = await shot_bytes(page)
                open(f"{OUTDIR}/{step['shot']}.png", "wb").write(data)
                print("SHOT", step["shot"], flush=True)
            elif "click" in step:
                await page.mouse.click(step["click"][0], step["click"][1])
                print("CLICK", step["click"], flush=True)
            elif "key" in step:
                await page.keyboard.press(step["key"])
                print("KEY", step["key"], flush=True)
            elif "dclick" in step:
                await page.mouse.move(step["dclick"][0], step["dclick"][1])
                await page.mouse.down()
                await page.wait_for_timeout(350)
                await page.mouse.up()
                print("DCLICK", step["dclick"], flush=True)
            elif "park" in step:
                await page.mouse.move(30, 460)
                print("PARK", flush=True)
            elif "wheel" in step:
                await page.mouse.move(410, 235)
                await page.mouse.wheel(0, step["wheel"])
                print("WHEEL", step["wheel"], flush=True)
            elif "esc" in step:
                await page.keyboard.press("Escape")
                print("ESC", flush=True)
            elif "crouch" in step:
                await page.keyboard.press("c")
                print("CROUCH TOGGLE", flush=True)
            elif "keydown" in step:
                await page.keyboard.down(step["keydown"])
                print("DOWN", step["keydown"], flush=True)
            elif "keyup" in step:
                await page.keyboard.up(step["keyup"])
                print("UP", step["keyup"], flush=True)
            elif "hold_e" in step:
                await page.keyboard.down("e")
                await page.wait_for_timeout(int(step["hold_e"] * 1000))
                await page.keyboard.up("e")
                print("HOLD_E", step["hold_e"], flush=True)
            elif "calibrate" in step:
                # hold W (north, cam_yaw=0) long enough to guarantee the
                # hero bumps the crate south face at (2,8) and stays there:
                # position becomes known exactly; speed comes from "fps".
                await page.keyboard.down("w")
                await page.wait_for_timeout(26000)
                await page.keyboard.up("w")
                st["pos"] = [4.0, 14.78]
                st["yaw"] = 0.0
                st["moving"] = 6.82 / WALK
                print("CALIBRATED pos=(4.0,14.78) yaw=0 (run fps next)", flush=True)
            elif "legs" in step:
                assert st["eff"], "calibrate first"
                for dname, tiles in step["legs"]:
                    M = DIRS[dname]
                    dist = tiles * TILE
                    dur = dist / st["eff"]
                    yaw = st["yaw"]
                    rx = M[0] * math.cos(yaw) - M[1] * math.sin(yaw)
                    ry = M[0] * math.sin(yaw) + M[1] * math.cos(yaw)
                    keys = []
                    if rx > 0.35: keys.append("d")
                    elif rx < -0.35: keys.append("a")
                    if ry > 0.35: keys.append("s")
                    elif ry < -0.35: keys.append("w")
                    for k in keys: await page.keyboard.down(k)
                    await page.wait_for_timeout(int(dur * 1000))
                    for k in keys: await page.keyboard.up(k)
                    game_s = dist / WALK
                    st["moving"] += game_s
                    follow_t = max(0.0, st["moving"] - 2.5)
                    if follow_t > 0:
                        hy = math.atan2(-M[0], -M[1])
                        blend = 1.0 - math.exp(-0.9 * min(game_s, follow_t + game_s))
                        st["yaw"] = wrap(st["yaw"] + wrap(hy - st["yaw"]) * min(1.0, blend))
                    st["pos"][0] += M[0] * dist * 0.97
                    st["pos"][1] += M[1] * dist * 0.97
                    print(f"  leg {dname}x{tiles} keys={keys} dur={dur:.2f}s pos={st['pos']} yaw={st['yaw']:.2f}", flush=True)
                    await page.wait_for_timeout(120)
            elif "fps" in step:
                fps = await page.evaluate("""() => new Promise(res => {
                    let n = 0; const t0 = performance.now();
                    const f = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f);
                        else res(n / ((performance.now() - t0) / 1000)); };
                    requestAnimationFrame(f); })""")
                rate = min(1.0, fps * 8.0 / 60.0)
                st["eff"] = WALK * rate
                st["ratio"] = rate
                print(f"FPS {fps:.1f} rate={rate:.3f} eff={st['eff']:.3f}", flush=True)
            elif "setstate" in step:
                st.update(step["setstate"])
                print("STATE", st, flush=True)
            elif "geterrs" in step:
                errs = await page.evaluate("() => window.__errs || 'gone'")
                print("PAGEERRS", json.dumps(errs)[:400], flush=True)
            save_state(st)
        await browser.close()

asyncio.run(main())
