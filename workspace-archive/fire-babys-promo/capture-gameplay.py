#!/usr/bin/env python3
"""Capture real gameplay screenshots from Fire Babys 2D and 3D games, assemble into clips."""
import asyncio, os, sys
from playwright.async_api import async_playwright

OUT = os.path.expanduser("~/workspace/fire-babys-promo/gameplay")
os.makedirs(OUT, exist_ok=True)

async def capture_3d(pw):
    print("Capturing 3D game...")
    browser = await pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    page = await browser.new_page(viewport={"width": 480, "height": 800}, has_touch=True, is_mobile=True)
    shots = []
    try:
        await page.goto("https://firebabys.io/3d.html", wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(4000)
        # tap to start
        try:
            await page.mouse.click(240, 400)
            await page.wait_for_timeout(2000)
            await page.mouse.click(240, 400)
            await page.wait_for_timeout(2000)
        except Exception as e:
            print("tap issue:", e)
        # screenshot every 1s for 10s
        for i in range(10):
            path = os.path.join(OUT, f"3d_{i:02d}.png")
            await page.screenshot(path=path)
            shots.append(path)
            await page.wait_for_timeout(1000)
    except Exception as e:
        print("3D capture error:", e)
    await browser.close()
    return shots

async def capture_2d(pw):
    print("Capturing 2D game...")
    browser = await pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    page = await browser.new_page(viewport={"width": 480, "height": 800}, has_touch=True, is_mobile=True)
    shots = []
    game2d = os.path.expanduser("~/workspace/your_files/fire-babys/Fire Babys.html")
    if not os.path.exists(game2d):
        # find the actual 2D game file
        import glob
        cands = glob.glob(os.path.expanduser("~/workspace/your_files/fire-babys/*.html"))
        print("2D candidates:", cands)
        game2d = cands[0] if cands else None
    if not game2d:
        print("No 2D game found"); await browser.close(); return []
    try:
        await page.goto(f"file://{game2d}", wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(3000)
        try:
            await page.mouse.click(240, 400)
            await page.wait_for_timeout(2000)
        except Exception as e:
            print("tap issue:", e)
        for i in range(10):
            path = os.path.join(OUT, f"2d_{i:02d}.png")
            await page.screenshot(path=path)
            shots.append(path)
            await page.wait_for_timeout(1000)
    except Exception as e:
        print("2D capture error:", e)
    await browser.close()
    return shots

async def main():
    async with async_playwright() as pw:
        s3 = await capture_3d(pw)
        s2 = await capture_2d(pw)
    print(f"3D: {len(s3)} shots, 2D: {len(s2)} shots")

asyncio.run(main())
