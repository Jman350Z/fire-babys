#!/usr/bin/env python3
"""3D-only capture with proxy passed explicitly to Chromium."""
import asyncio, os
from playwright.async_api import async_playwright

OUT = os.path.expanduser("~/workspace/goals/realm-clash-battle-game/hidden_files/art-drop/clips-2026-10-04")
os.makedirs(OUT, exist_ok=True)
PROXY = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
if PROXY and "://" not in PROXY:
    PROXY = "http://" + PROXY

async def main():
    async with async_playwright() as pw:
        args = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"]
        if PROXY:
            args.append(f"--proxy-server={PROXY}")
            print("Using proxy:", PROXY.split("@")[-1], flush=True)
        browser = await pw.chromium.launch(args=args)
        page = await browser.new_page(viewport={"width": 480, "height": 800}, has_touch=True, is_mobile=True)
        try:
            await page.goto("https://firebabys.io/3d.html", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_timeout(7000)
            await page.screenshot(path=os.path.join(OUT, "3d_title3.png"))
            await page.mouse.click(240, 430)   # TAP TO START
            await page.wait_for_timeout(2500)
            inp = page.locator("input").first
            if await inp.count():
                await inp.click(); await page.wait_for_timeout(500)
                await page.keyboard.type("Scout")
            try: await page.mouse.click(120, 500)
            except Exception: pass
            await page.wait_for_timeout(500)
            await page.mouse.click(240, 590)  # START ADVENTURE
            await page.wait_for_timeout(7000)
            await page.screenshot(path=os.path.join(OUT, "3d_ready3.png"))
            for key in ["w", "a", "s", "d", "w"]:
                await page.keyboard.down(key); await page.wait_for_timeout(700); await page.keyboard.up(key)
            n = 0
            for i in range(12):
                path = os.path.join(OUT, f"3d_g_{i:02d}.png")
                await page.screenshot(path=path); n += 1
                if i % 3 == 2: await page.keyboard.press(" ")
                await page.wait_for_timeout(900)
            print(f"3D: {n} gameplay shots", flush=True)
        except Exception as e:
            print("3D error:", e, flush=True)
        await browser.close()

asyncio.run(main())
