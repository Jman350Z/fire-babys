import asyncio, json, base64, io, math, time
from playwright.async_api import async_playwright
from PIL import Image

BASE = "http://127.0.0.1:8902/game/index.html"
OUTDIR = "/home/hatch/workspace/firebabys-online"
JOY = (90, 754)
ACT = (335, 785)
TILE = 1.6
WALK = 3.4
DIRS = {"N": (0.0, -1.0), "E": (1.0, 0.0), "S": (0.0, 1.0), "W": (-1.0, 0.0)}

async def shot(page, name):
    cdp = await page.context.new_cdp_session(page)
    res = await cdp.send("Page.captureScreenshot", {"format": "png"})
    data = base64.b64decode(res["data"])
    with open(f"{OUTDIR}/{name}.png", "wb") as f:
        f.write(data)
    await cdp.detach()
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
        await shot(page, "fix3-select")
        await page.touchscreen.tap(66, 110)          # Blaze
        await page.wait_for_timeout(3000)
        # change kit: Crystal Armor (3rd armor), Ember Blade (2nd sword)
        await page.touchscreen.tap(284, 410)
        await page.wait_for_timeout(1000)
        await page.touchscreen.tap(194, 457)
        await page.wait_for_timeout(1000)
        await shot(page, "fix3-equip")
        await page.touchscreen.tap(195, 500)         # START MISSION
        await page.wait_for_timeout(2500)
        await shot(page, "fix3-codec0")
        await page.touchscreen.tap(195, 536)         # codec advance by tap
        await page.wait_for_timeout(1200)
        await shot(page, "fix3-codec1")
        for _ in range(6):                            # dismiss codec fully
            await page.touchscreen.tap(195, 536)
            await page.wait_for_timeout(800)
        await page.wait_for_timeout(1500)
        await shot(page, "fix3-play")
        # JUMP, then double JUMP mid-air
        await page.touchscreen.tap(335, 613)
        await page.wait_for_timeout(550)
        await shot(page, "fix3-jump1")
        await page.touchscreen.tap(335, 613)
        await page.wait_for_timeout(450)
        await shot(page, "fix3-jump2")
        await page.wait_for_timeout(4500)
        # ATK sword swing
        await page.touchscreen.tap(335, 699)
        await page.wait_for_timeout(450)
        await shot(page, "fix3-attack")
        await page.wait_for_timeout(2500)
        # WPN menu -> swap to Tidebrand (3rd sword row)
        await page.touchscreen.tap(256, 699)
        await page.wait_for_timeout(1500)
        await shot(page, "fix3-weapons")
        await page.touchscreen.tap(195, 430)
        await page.wait_for_timeout(1500)
        await shot(page, "fix3-swapped")
        await page.wait_for_timeout(2000)
        # --- calibration drive: joystick north until the crate at (2,8) stops the hero (6.82 m) ---
        await touch(cdp, "touchStart", [JOY])
        await touch(cdp, "touchMove", [(JOY[0], JOY[1] - 46)])
        t0 = time.time()
        prev = await shot(page, "fix3-cal0")
        stuck = 0
        elapsed = 0.0
        while elapsed < 25.0:
            await page.wait_for_timeout(400)
            cur = await shot(page, "fix3-calX")
            d = frame_diff(prev, cur)
            prev = cur
            elapsed = time.time() - t0
            print(f"  cal t={elapsed:.1f} diff={d:.2f}", flush=True)
            if d < 1.2:
                stuck += 1
                if stuck >= 2:
                    break
            else:
                stuck = 0
        await touch(cdp, "touchEnd", [])
        eff = 6.82 / elapsed if elapsed > 0 else 0.34
        print(f"EFF {eff:.3f} m/real-s after {elapsed:.1f}s", flush=True)
        await shot(page, "fix3-calibrated")
        # --- route from tile (2,9) to cage 1 front (4,3): E1 N2 E1 N4 ---
        yaw = 0.0
        async def leg(dname, tiles):
            nonlocal yaw
            M = DIRS[dname]
            dist = tiles * TILE * 1.06
            dur = dist / eff
            rx = M[0] * math.cos(yaw) - M[1] * math.sin(yaw)
            ry = M[0] * math.sin(yaw) + M[1] * math.cos(yaw)
            tx = JOY[0] + int(rx * 46)
            ty = JOY[1] + int(ry * 46)
            await touch(cdp, "touchStart", [JOY])
            await touch(cdp, "touchMove", [(tx, ty)])
            await page.wait_for_timeout(int(dur * 1000))
            await touch(cdp, "touchEnd", [])
            game_s = (tiles * TILE) / WALK
            hy = math.atan2(-M[0], -M[1])
            blend = 1.0 - math.exp(-0.9 * game_s)
            dy = (hy - yaw + math.pi) % (2 * math.pi) - math.pi
            yaw += dy * min(1.0, blend)
            print(f"  leg {dname}x{tiles} drag->({tx},{ty}) dur={dur:.2f} yaw={yaw:.2f}", flush=True)
            await page.wait_for_timeout(500)
        for dname, tiles in [("E", 1), ("N", 2), ("E", 1), ("N", 4)]:
            await leg(dname, tiles)
        await shot(page, "fix3-atcage")
        # crouch (smaller detection cone), then hold ACT to rescue
        await page.touchscreen.tap(256, 785)
        await page.wait_for_timeout(800)
        await touch(cdp, "touchStart", [ACT])
        await page.wait_for_timeout(6500)
        await touch(cdp, "touchEnd", [])
        await page.wait_for_timeout(1500)
        await shot(page, "fix3-rescue")
        for _ in range(4):                            # dismiss any rescue codec
            await page.touchscreen.tap(195, 536)
            await page.wait_for_timeout(800)
        await shot(page, "fix3-after")
        print("ERRORS", json.dumps(errors[:8]), flush=True)
        await browser.close()

asyncio.run(main())
