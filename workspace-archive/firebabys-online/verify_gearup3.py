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
        # NE diagonal: right + up, compensating the southward drift
        await cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": jx, "y": jy, "id": 1}]})
        await page.wait_for_timeout(400)
        for t in range(1, 9):
            await cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": jx + 42 * t / 8, "y": jy - 28 * t / 8, "id": 1}]})
            await page.wait_for_timeout(180)
        await page.wait_for_timeout(7000)
        await shot(page, "fix-gearup-c")
        await cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        await cdp.detach()
        print("ERRORS", json.dumps(errors[:6]), flush=True)
        await browser.close()

asyncio.run(main())
