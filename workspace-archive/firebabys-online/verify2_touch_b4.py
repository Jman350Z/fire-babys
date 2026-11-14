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
        # --- incremental calibration: 1s drags north until the crate at (2,8) stops the hero ---
        prev = await shot(page, "fix2f-start")
        drag_time = 0.0
        stuck = 0
        for i in range(16):
            await drag(page, cdp, JOY[0], JOY[1] - 50, 2.0)
            drag_time += 2.0
            cur = await shot(page, f"fix2f-cal{i}")
            d = frame_diff(prev, cur)
            prev = cur
            print(f"  inc {i} drag={drag_time:.0f}s diff={d:.2f}", flush=True)
            if d < 1.6:
                stuck += 1
                if stuck >= 2:
                    break
            else:
                stuck = 0
        eff = 6.82 / drag_time
        print(f"EFF {eff:.3f} m/real-s (drag {drag_time:.0f}s)", flush=True)
        # --- route (2,9) -> cage 1 front (4,3): E1 N2 E1 N4 ---
        yaw = 0.0
        async def leg(dname, tiles):
            nonlocal yaw
            M = DIRS[dname]
            dist = tiles * TILE * 1.04
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
            await page.wait_for_timeout(600)
        for dname, tiles in [("E", 1), ("N", 2), ("E", 1), ("N", 4)]:
            await leg(dname, tiles)
        await shot(page, "fix2f-atcage")
        await page.touchscreen.tap(256, 785)          # CRCH on (smaller cone)
        await page.wait_for_timeout(800)
        await touch(cdp, "touchStart", [ACT])         # hold ACT to rescue
        await page.wait_for_timeout(7000)
        await touch(cdp, "touchEnd", [])
        await page.wait_for_timeout(1500)
        await shot(page, "fix2f-rescue")
        for _ in range(4):                            # dismiss rescue codec if any
            await page.touchscreen.tap(195, 536)
            await page.wait_for_timeout(800)
        await shot(page, "fix2f-after")
        print("ERRORS", json.dumps(errors[:8]), flush=True)
        await browser.close()

asyncio.run(main())
