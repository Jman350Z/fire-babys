import asyncio, json, base64
from playwright.async_api import async_playwright

BASE = "http://127.0.0.1:8902/game/index.html"
OUTDIR = "/home/hatch/workspace/firebabys-online"
JOY = (101, 743)
ACT = (335, 785)
EFF = 0.379  # measured three times by wall-bump calibration

async def shot(page, name):
    cdp = await page.context.new_cdp_session(page)
    res = await cdp.send("Page.captureScreenshot", {"format": "png"})
    with open(f"{OUTDIR}/{name}.png", "wb") as f:
        f.write(base64.b64decode(res["data"]))
    await cdp.detach()
    print("SHOT", name, flush=True)

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
        await page.touchscreen.tap(195, 500)         # START MISSION (defaults)
        await page.wait_for_timeout(2500)
        for _ in range(6):                            # dismiss codec
            await page.touchscreen.tap(195, 536)
            await page.wait_for_timeout(800)
        await page.wait_for_timeout(1200)
        # pin 1: north into the (2,8) crate face -> (4.0, 14.78)
        await drag(page, cdp, JOY[0], JOY[1] - 50, 20.0)
        # east one tile -> column x=3 (5.6 m)
        await drag(page, cdp, JOY[0] + 50, JOY[1], 1.6 / EFF)
        await page.wait_for_timeout(1500)
        # pin 2: north into the (3,4) crate face -> (5.6, 8.38)
        await drag(page, cdp, JOY[0], JOY[1] - 50, 20.0)
        await shot(page, "fix2j-pin2")
        # diagonal NE into the cage/crate inside corner -> ~(6.78, 6.78),
        # 1.67 m from the cage center, pinned by collision
        await drag(page, cdp, JOY[0] + 35, JOY[1] - 35, 11.0)
        await shot(page, "fix2j-corner")
        # crouch, then hold ACT for the rescue
        await page.touchscreen.tap(256, 785)
        await page.wait_for_timeout(800)
        await touch(cdp, "touchStart", [ACT])
        await page.wait_for_timeout(16000)
        await touch(cdp, "touchEnd", [])
        await page.wait_for_timeout(1200)
        await shot(page, "fix2j-rescue")
        for _ in range(4):                            # dismiss rescue codec
            await page.touchscreen.tap(195, 536)
            await page.wait_for_timeout(800)
        await shot(page, "fix2j-after")
        print("ERRORS", json.dumps(errors[:8]), flush=True)
        await browser.close()

asyncio.run(main())
