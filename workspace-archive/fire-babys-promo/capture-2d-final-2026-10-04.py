import asyncio, os
from playwright.async_api import async_playwright
OUT = os.path.expanduser("~/workspace/goals/realm-clash-battle-game/hidden_files/art-drop/clips-2026-10-04")
async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"])
        page = await browser.new_page(viewport={"width": 480, "height": 800}, has_touch=True, is_mobile=True)
        game = os.path.expanduser("~/workspace/your_files/fire-babys/Fire Babys.html")
        try:
            await page.goto(f"file://{game}", wait_until="networkidle", timeout=60000)
            await page.wait_for_timeout(5000)
            await page.touchscreen.tap(240, 360); await page.wait_for_timeout(2500)
            await page.touchscreen.tap(140, 460); await page.wait_for_timeout(2500)
            await page.screenshot(path=os.path.join(OUT, "2d_f_step1.png"))
            await page.touchscreen.tap(240, 500); await page.wait_for_timeout(2500)  # skip for now
            await page.screenshot(path=os.path.join(OUT, "2d_f_step2.png"))
            # try clicking FIGHT at a couple of positions
            await page.touchscreen.tap(240, 640); await page.wait_for_timeout(3000)
            await page.screenshot(path=os.path.join(OUT, "2d_f_step3.png"))
            n = 0
            for i in range(12):
                path = os.path.join(OUT, f"2d_fg_{i:02d}.png")
                await page.screenshot(path=path); n += 1
                await page.wait_for_timeout(900)
            print(f"2D final: {n} shots", flush=True)
        except Exception as e:
            print("2D final error:", e, flush=True)
        await browser.close()
asyncio.run(main())
