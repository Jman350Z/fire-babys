#!/usr/bin/env python3
"""2D capture using touchscreen taps (game canvas may need touch events)."""
import asyncio, os
from playwright.async_api import async_playwright

OUT = os.path.expanduser("~/workspace/goals/realm-clash-battle-game/hidden_files/art-drop/clips-2026-10-04")
os.makedirs(OUT, exist_ok=True)

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"])
        page = await browser.new_page(viewport={"width": 480, "height": 800}, has_touch=True, is_mobile=True)
        game = os.path.expanduser("~/workspace/your_files/fire-babys/Fire Babys.html")
        try:
            await page.goto(f"file://{game}", wait_until="networkidle", timeout=60000)
            await page.wait_for_timeout(5000)
            await page.touchscreen.tap(240, 360)   # TAP TO START
            await page.wait_for_timeout(2500)
            await page.screenshot(path=os.path.join(OUT, "2d_t_menu.png"))
            await page.touchscreen.tap(140, 460)   # PLAY
            await page.wait_for_timeout(2500)
            await page.screenshot(path=os.path.join(OUT, "2d_t_prep.png"))
            await page.touchscreen.tap(240, 640)   # FIGHT
            await page.wait_for_timeout(4000)
            await page.screenshot(path=os.path.join(OUT, "2d_t_battle.png"))
            n = 0
            for i in range(12):
                path = os.path.join(OUT, f"2d_tg_{i:02d}.png")
                await page.screenshot(path=path); n += 1
                await page.wait_for_timeout(900)
            print(f"2D touch: {n} shots", flush=True)
        except Exception as e:
            print("2D touch error:", e, flush=True)
        await browser.close()

asyncio.run(main())
