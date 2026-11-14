import asyncio, json, io, math, time
from playwright.async_api import async_playwright
from PIL import Image

BASE = "http://127.0.0.1:8902/game/index.html"
OUTDIR = "/home/hatch/workspace/firebabys-online"
JOY = (101, 743)
ACT = (335, 785)
TILE = 1.6
DIRS = {"N": (0.0, -1.0), "E": (1.0, 0.0), "S": (0.0, 1.0), "W": (-1.0, 0.0)}

async def shot(page, name):
    cdp = await page.context.new_cdp_session(page)
    res = await cdp.send("Page.captureScreenshot", {"format": "png"})
    await cdp.detach()
    import base64
    data = base64.b64decode(res["data"])
    with open(f"{OUTDIR}/{name}.png", "wb") as f:
        f.write(data)
    print("SHOT", name, flush=True)
    return data

def frame_diff(a: bytes, b: bytes) -> float:
    ia = Image.open(io.BytesIO(a)).convert("L").resize((160, 90))
    ib = Image.open(io.BytesIO(b)).convert("L").resize((160, 90))
    pa, pb = ia.load(), ib.load()
    return sum(abs(pa[x, y] - pb[x, y]) for y in range(90) for x in range(160)) / (160 * 90)

async def touch(cdp, kind, points):
    await cdp.send("Input.dispatchTouchEvent", {
        "type": kind,
        "touchPoints": [{"x": x, "y": y, "id": 1} for (x, y) in points]})

async def drag(page, cdp, tx, ty, seconds):
    await touch(cdp, "touchStart", [JOY])
    await touch(cdp, "touchMove", [(tx, ty)])
    await page.wait_for_timeout(int(seconds * 1000))
    await touch(cdp, "touchEnd", [])

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        ctx = await browser.new_context(
            viewport={"width": 390, "height": 844}, device_scale_factor=2.0,
            is_mobile=True, has_touch=True,
            user_agent="Mozilla/5.0 (Linux; Android 14; moto g) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36")
        page = await ctx.new_page()
        cdp = await ctx.new_cdp_session(page)
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(BASE)
        await page.wait_for_selector("#status", state="detached", timeout=120000)
        print("BOOTED", flush=True)
        await page.wait_for_timeout(5000)
        await page.touchscreen.tap(66, 110)          # Blaze
        await page.wait_for_timeout(3000)
        await page.touchscreen.tap(195, 500)         # START MISSION (bronze + wood defaults)
        await page.wait_for_timeout(2500)
        for _ in range(6):                            # dismiss codec
            await page.touchscreen.tap(195, 536)
            await page.wait_for_timeout(800)
        await page.wait_for_timeout(1200)
        eff = 0.379
        await drag(page, cdp, JOY[0], JOY[1] - 50, 20.0)   # N: bump the (2,8) crate, position pinned
        await shot(page, "fix2i-pinned")
        # --- route (2,9) -> cage 1 front (4,3): E1 N2 E1 N4 ---
        yaw = 0.0
        async def leg(dname, tiles):
            nonlocal yaw
            M = DIRS[dname]
            dist = tiles * TILE * 1.0
            dur = dist / eff
            rx = M[0] * math.cos(yaw) - M[1] * math.sin(yaw)
            ry = M[0] * math.sin(yaw) + M[1] * math.cos(yaw)
            await drag(page, cdp, JOY[0] + int(rx * 50), JOY[1] + int(ry * 50), dur)
            game_s = (tiles * TILE) / 3.4
            hy = math.atan2(-M[0], -M[1])
            blend = 1.0 - math.exp(-0.9 * game_s)
            dy = (hy - yaw + math.pi) % (2 * math.pi) - math.pi
            yaw += dy * min(1.0, blend)
            print(f"  leg {dname}x{tiles} dur={dur:.2f} yaw={yaw:.2f}", flush=True)
            await page.wait_for_timeout(2200)
        for dname, tiles in [("E", 0.8), ("N", 2), ("E", 0.8), ("N", 4), ("N", 1.2)]:
            await leg(dname, tiles)
        await shot(page, "fix2i-atcage")
        await page.touchscreen.tap(256, 785)          # CRCH on (smaller cone)
        await page.wait_for_timeout(800)
        # search spiral: hold ACT (14 real-s > the 1.4 game-s hold at
        # this harness slowdown) at the arrival point, then at small
        # W/N/E/S offsets -- one of them lands inside the 2.3 m range
        async def hold_act(tag):
            await touch(cdp, "touchStart", [ACT])
            await page.wait_for_timeout(16000)
            await touch(cdp, "touchEnd", [])
            await page.wait_for_timeout(800)
            await shot(page, f"fix2i-hold{tag}")
        await hold_act("0")
        for i, (dname, tiles) in enumerate([("S", 0.8), ("W", 0.8), ("S", 0.8), ("E", 0.8)]):
            await leg(dname, tiles)
            await hold_act(str(i + 1))
        for _ in range(4):                            # dismiss rescue codec if any
            await page.touchscreen.tap(195, 536)
            await page.wait_for_timeout(800)
        await shot(page, "fix2i-after")
        print("ERRORS", json.dumps(errors[:8]), flush=True)
        await browser.close()

asyncio.run(main())
