import asyncio, json, base64
from playwright.async_api import async_playwright

BASE = "http://127.0.0.1:8902/game/index.html"
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
        await page.touchscreen.tap(66, 110)          # Blaze
        await page.wait_for_timeout(3000)
        await page.touchscreen.tap(195, 500)         # START MISSION (defaults)
        await page.wait_for_timeout(2500)
        for _ in range(6):                            # dismiss codec
            await page.touchscreen.tap(195, 536)
            await page.wait_for_timeout(800)
        await page.wait_for_timeout(1500)
        await shot(page, "fix3r-grounded")
        # JUMP: sample the whole arc at harness speed
        await page.touchscreen.tap(335, 613)
        for i in range(6):
            await page.wait_for_timeout(700)
            await shot(page, f"fix3r-jump{i}")
        # DOUBLE JUMP: tap again (may be mid-air or just landed; buffered queue)
        await page.touchscreen.tap(335, 613)
        await page.wait_for_timeout(500)
        await page.touchscreen.tap(335, 613)
        for i in range(4):
            await page.wait_for_timeout(700)
            await shot(page, f"fix3r-djump{i}")
        await page.wait_for_timeout(5000)             # settle / land
        # ATK: burst-capture the swing
        await page.touchscreen.tap(335, 699)
        for i in range(8):
            await shot(page, f"fix3r-atk{i}")
            await page.wait_for_timeout(150)
        print("ERRORS", json.dumps(errors[:8]), flush=True)
        await browser.close()

asyncio.run(main())
