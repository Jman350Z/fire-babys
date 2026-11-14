import asyncio, json, base64

async def shot(page, name):
    cdp = await page.context.new_cdp_session(page)
    res = await cdp.send('Page.captureScreenshot', {'format': 'png'})
    with open(f'/home/hatch/workspace/firebabys-online/{name}.png', 'wb') as f:
        f.write(base64.b64decode(res['data']))
    await cdp.detach()
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--mute-audio"])
        ctx = await browser.new_context(viewport={"width":390,"height":844}, device_scale_factor=2,
            is_mobile=True, has_touch=True,
            user_agent="Mozilla/5.0 (Linux; Android 14; Moto G) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36")
        page = await ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await page.goto("http://127.0.0.1:8902/game/index.html")
        await page.wait_for_timeout(25000)
        await shot(page, "fix2-final-select")
        await page.touchscreen.tap(66, 110)   # Blaze card
        await page.wait_for_timeout(4000)
        await page.touchscreen.tap(195, 500)  # START MISSION
        await page.wait_for_timeout(5000)
        await page.touchscreen.tap(195, 536)  # codec advance
        await page.wait_for_timeout(1500)
        await page.touchscreen.tap(195, 536)
        await page.wait_for_timeout(4000)
        await shot(page, "fix2-final-play")
        print("ERRORS", json.dumps(errs))
        await browser.close()

asyncio.run(main())
