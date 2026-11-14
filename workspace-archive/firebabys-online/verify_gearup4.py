import asyncio, json, base64
from playwright.async_api import async_playwright

BASE = "http://127.0.0.1:8901/game/index.html"
OUTDIR = "/home/hatch/workspace/firebabys-online"

async def shot(page, name):
    cdp = await page.context.new_cdp_session(page)
    res = await cdp.send("Page.captureScreenshot", {"format": "png"})
    with open(f"{OUTDIR}/{name}.png", "wb") as f:
        f.write(base64.b64decode(res["data"]))
    await cdp.detach()
    print("SHOT", name, flush=True)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        ctx = await browser.new_context(
            viewport={"width": 390, "height": 844}, device_scale_factor=2.0,
            is_mobile=True, has_touch=True,
            user_agent="Mozilla/5.0 (Linux; Android 14; moto g) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36")
        page = await ctx.new_page()
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(BASE)
        await page.wait_for_selector("#status", state="detached", timeout=120000)
        print("BOOTED", flush=True)
        await page.wait_for_timeout(5000)
        await page.touchscreen.tap(65, 128)
        await page.wait_for_timeout(2500)
        for i in range(7):
            await page.touchscreen.tap(195, 630)
            await page.wait_for_timeout(800)
        await page.wait_for_timeout(2000)
        cdp = await page.context.new_cdp_session(page)
        jx, jy = 101, 743

        async def leg(dx, dy, hold_s, tid):
            await cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": jx, "y": jy, "id": tid}]})
            await page.wait_for_timeout(300)
            for t in range(1, 7):
                await cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": jx + dx * t / 6, "y": jy + dy * t / 6, "id": tid}]})
                await page.wait_for_timeout(130)
            await page.wait_for_timeout(int(hold_s * 1000))
            await cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
            await page.wait_for_timeout(400)

        # Box sweep around the pad (NE of spawn): right past it, up, back left across it, down
        await leg(46, -20, 4200, 1)   # NE toward/past the pad rim (as before, slightly longer)
        await shot(page, "fix-gearup-d1")
        await leg(0, -50, 1800, 2)    # up (away) across the pad line
        await leg(-50, 0, 1800, 3)    # left back across
        await shot(page, "fix-gearup-d2")
        await leg(20, 42, 1600, 4)    # down-right, closing the box over the pad
        await shot(page, "fix-gearup-d3")
        await cdp.detach()
        print("ERRORS", json.dumps(errors[:6]), flush=True)
        await browser.close()

asyncio.run(main())
