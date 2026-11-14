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
        await shot(page, "fix2-select")
        # tap Blaze (first card)
        await page.touchscreen.tap(98, 165)
        await page.wait_for_timeout(3000)
        await shot(page, "fix2-equip-default")
        # change kit: Crystal Armor (3rd armor), Tidebrand (3rd sword)
        await page.touchscreen.tap(284, 410)
        await page.wait_for_timeout(1200)
        await page.touchscreen.tap(284, 457)
        await page.wait_for_timeout(1200)
        await shot(page, "fix2-equip-changed")
        # START MISSION
        await page.touchscreen.tap(195, 500)
        await page.wait_for_timeout(2500)
        await shot(page, "fix2-codec")
        # tap through the codec (2 lines, typewriter -> advance)
        for i in range(7):
            await page.touchscreen.tap(195, 600)
            await page.wait_for_timeout(900)
        await page.wait_for_timeout(2000)
        await shot(page, "fix2-play")
        # JUMP then double JUMP (game time runs slow in this harness,
        # so the hero hangs in the air long enough to catch)
        await page.touchscreen.tap(335, 613)
        await page.wait_for_timeout(600)
        await shot(page, "fix2-jump1")
        await page.touchscreen.tap(335, 613)
        await page.wait_for_timeout(500)
        await shot(page, "fix2-jump2")
        await page.wait_for_timeout(4000)
        # ATK sword swing (Tidebrand equipped)
        await page.touchscreen.tap(335, 699)
        await page.wait_for_timeout(400)
        await shot(page, "fix2-attack-tide")
        await page.wait_for_timeout(2500)
        # CRCH toggle on, then off
        await page.touchscreen.tap(256, 785)
        await page.wait_for_timeout(1500)
        await shot(page, "fix2-crch")
        await page.touchscreen.tap(256, 785)
        await page.wait_for_timeout(1000)
        # WPN menu -> swap to Ember Blade (2nd row)
        await page.touchscreen.tap(256, 699)
        await page.wait_for_timeout(1500)
        await shot(page, "fix2-weapons")
        await page.touchscreen.tap(195, 405)
        await page.wait_for_timeout(1500)
        await shot(page, "fix2-swapped")
        # swing the new blade
        await page.touchscreen.tap(335, 699)
        await page.wait_for_timeout(350)
        await shot(page, "fix2-attack-ember")
        print("ERRORS", json.dumps(errors[:8]), flush=True)
        await browser.close()

asyncio.run(main())
