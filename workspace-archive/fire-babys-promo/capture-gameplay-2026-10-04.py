#!/usr/bin/env python3
"""Capture REAL gameplay from Fire Babys 3D (live site) and 2D (local file)."""
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
        await page.goto("https://firebabys.io/3d.html", wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)
        # tap TAP TO START button (center-ish, y~430)
        await page.mouse.click(240, 430)
        await page.wait_for_timeout(2500)
        # WHO'S PLAYING screen: name field ~ (240,355), flame circles y~500, START ADVENTURE ~ (240,590)
        inp = page.locator("input").first
        if await inp.count():
            await inp.click()
            await page.wait_for_timeout(500)
            await page.keyboard.type("Scout")
        # pick a flame color circle
        for y in (500, 505):
            try:
                await page.mouse.click(120, y)
                break
            except Exception:
                pass
        await page.wait_for_timeout(500)
        await page.mouse.click(240, 590)  # START ADVENTURE
        await page.wait_for_timeout(6000)
        await page.screenshot(path=os.path.join(OUT, "3d_ready.png"))
        # walk around a bit for life
        for key in ["w", "a", "s", "d", "w"]:
            await page.keyboard.down(key)
            await page.wait_for_timeout(700)
            await page.keyboard.up(key)
        for i in range(12):
            path = os.path.join(OUT, f"3d_g_{i:02d}.png")
            await page.screenshot(path=path)
            shots.append(path)
            if i % 3 == 2:
                await page.keyboard.press(" ")  # maybe fireball/attack
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
        await page.goto(f"file://{game}", wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(4000)
        await page.screenshot(path=os.path.join(OUT, "2d_ready.png"))
        # click FIGHT button (bottom center, y~640)
        await page.mouse.click(240, 640)
        await page.wait_for_timeout(4000)
        await page.screenshot(path=os.path.join(OUT, "2d_battle_start.png"))
        for i in range(12):
            path = os.path.join(OUT, f"2d_g_{i:02d}.png")
            await page.screenshot(path=path)
            shots.append(path)
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
