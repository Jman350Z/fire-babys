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
        # Blaze — first card (row 1, col 1)
        await page.touchscreen.tap(66, 110)
        await page.wait_for_timeout(3000)
        await shot(page, "fix2b-equip")
        # Crystal Armor + Ember Blade, then START MISSION
        await page.touchscreen.tap(284, 410)
        await page.wait_for_timeout(1000)
        await page.touchscreen.tap(194, 457)
        await page.wait_for_timeout(1000)
        await page.touchscreen.tap(195, 500)
        await page.wait_for_timeout(2500)
        await shot(page, "fix2b-codec")
        # codec card now docks above the cluster (~y 510-562): tap its center
        for i in range(6):
            await page.touchscreen.tap(195, 536)
            await page.wait_for_timeout(800)
        await page.wait_for_timeout(1500)
        await shot(page, "fix2b-play")
        # JUMP, then double JUMP mid-air
        await page.touchscreen.tap(335, 613)
        await page.wait_for_timeout(550)
        await shot(page, "fix2b-jump1")
        await page.touchscreen.tap(335, 613)
        await page.wait_for_timeout(450)
        await shot(page, "fix2b-jump2")
        await page.wait_for_timeout(4500)
        # ATK — Ember Blade swing
        await page.touchscreen.tap(335, 699)
        await page.wait_for_timeout(450)
        await shot(page, "fix2b-attack-ember")
        await page.wait_for_timeout(2500)
        # CRCH on (hero visibly pitches down) then off
        await page.touchscreen.tap(256, 785)
        await page.wait_for_timeout(1500)
        await shot(page, "fix2b-crch")
        await page.touchscreen.tap(256, 785)
        await page.wait_for_timeout(1000)
        # WPN menu -> Tidebrand (3rd sword row)
        await page.touchscreen.tap(256, 699)
        await page.wait_for_timeout(1500)
        await shot(page, "fix2b-weapons")
        await page.touchscreen.tap(195, 430)
        await page.wait_for_timeout(1500)
        await shot(page, "fix2b-swapped")
        # swing the Tidebrand
        await page.touchscreen.tap(335, 699)
        await page.wait_for_timeout(450)
        await shot(page, "fix2b-attack-tide")
        print("ERRORS", json.dumps(errors[:8]), flush=True)
        await browser.close()

asyncio.run(main())
