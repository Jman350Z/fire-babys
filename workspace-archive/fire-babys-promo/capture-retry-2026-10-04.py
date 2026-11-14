#!/usr/bin/env python3
"""Retry: real gameplay capture — 3D retry + fixed 2D tap flow."""
import asyncio, os
from playwright.async_api import async_playwright

OUT = os.path.expanduser("~/workspace/goals/realm-clash-battle-game/hidden_files/art-drop/clips-2026-10-04")
os.makedirs(OUT, exist_ok=True)

async def capture_3d(pw):
    print("3D: loading...", flush=True)
    shots = []
    browser = await pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    page = await browser.new_page(viewport={"width": 480, "height": 800}, has_touch=True, is_mobile=True)
    try:
        ok = False
        for attempt in range(3):
            try:
                await page.goto("https://firebabys.io/3d.html", wait_until="domcontentloaded", timeout=45000)
                ok = True
                break
            except Exception as e:
                print(f"3D attempt {attempt+1} failed: {e}", flush=True)
                await page.wait_for_timeout(5000)
        if not ok:
            print("3D: site unreachable", flush=True)
            await browser.close()
            return shots
        await page.wait_for_timeout(6000)
        await page.screenshot(path=os.path.join(OUT, "3d_title2.png"))
        await page.mouse.click(240, 430)   # TAP TO START
        await page.wait_for_timeout(2500)
        inp = page.locator("input").first
        if await inp.count():
            await inp.click(); await page.wait_for_timeout(500)
            await page.keyboard.type("Scout")
        try:
            await page.mouse.click(120, 500)  # flame color
        except Exception: pass
        await page.wait_for_timeout(500)
        await page.mouse.click(240, 590)  # START ADVENTURE
        await page.wait_for_timeout(6000)
        await page.screenshot(path=os.path.join(OUT, "3d_ready2.png"))
        for key in ["w", "a", "s", "d", "w"]:
            await page.keyboard.down(key); await page.wait_for_timeout(700); await page.keyboard.up(key)
        for i in range(12):
            path = os.path.join(OUT, f"3d_g_{i:02d}.png")
            await page.screenshot(path=path); shots.append(path)
            if i % 3 == 2: await page.keyboard.press(" ")
            await page.wait_for_timeout(900)
    except Exception as e:
        print("3D error:", e, flush=True)
    await browser.close()
    print(f"3D: {len(shots)} shots", flush=True)
    return shots

async def capture_2d(pw):
    print("2D: loading...", flush=True)
    shots = []
    browser = await pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    page = await browser.new_page(viewport={"width": 480, "height": 800}, has_touch=True, is_mobile=True)
    game = os.path.expanduser("~/workspace/your_files/fire-babys/Fire Babys.html")
    try:
        await page.goto(f"file://{game}", wait_until="domcontentloaded", timeout=45000)
        await page.wait_for_timeout(4000)
        await page.mouse.click(240, 360)   # TAP TO START
        await page.wait_for_timeout(2500)
        await page.screenshot(path=os.path.join(OUT, "2d_menu.png"))
        await page.mouse.click(140, 460)   # PLAY
        await page.wait_for_timeout(2500)
        await page.screenshot(path=os.path.join(OUT, "2d_prep.png"))
        await page.mouse.click(240, 640)   # FIGHT
        await page.wait_for_timeout(4000)
        await page.screenshot(path=os.path.join(OUT, "2d_battle2.png"))
        for i in range(12):
            path = os.path.join(OUT, f"2d_g2_{i:02d}.png")
            await page.screenshot(path=path); shots.append(path)
            await page.wait_for_timeout(900)
    except Exception as e:
        print("2D error:", e, flush=True)
    await browser.close()
    print(f"2D: {len(shots)} shots", flush=True)
    return shots

async def main():
    async with async_playwright() as pw:
        await capture_3d(pw)
        await capture_2d(pw)

asyncio.run(main())
