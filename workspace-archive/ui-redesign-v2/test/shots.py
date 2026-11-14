#!/usr/bin/env python3
"""Design-proof screenshots of the staged v2 hub (Playwright, cached Chromium).

The page is served locally. The live sign-in gate script (auth-gate.js,
a separate overlay that is NOT part of the hub design and is unchanged)
is request-blocked so the hub itself is visible, and the first-run tour
is marked seen — this renders the hub exactly as a signed-in player
sees it. Output: top-2-viewports clips at phone + desktop widths.
"""
from playwright.sync_api import sync_playwright

URL = 'http://127.0.0.1:8901/fire-world.html'
OUT = '/home/hatch/workspace/ui-redesign-v2'

with sync_playwright() as p:
    browser = p.chromium.launch()
    for name, w, h in (('phone', 390, 844), ('desktop', 1280, 800)):
        ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2)
        ctx.add_init_script("localStorage.setItem('fb_onboarded_v1','1')")
        ctx.route('**/auth-gate.js', lambda r: r.abort())
        page = ctx.new_page()
        page.goto(URL, wait_until='networkidle', timeout=45000)
        page.wait_for_timeout(700)
        page.screenshot(path=f'{OUT}/shot-{name}.png', clip={'x': 0, 'y': 0, 'width': w, 'height': h * 2})
        print(f'shot-{name}.png  ({w}x{h*2} @2x)')
        if name == 'phone':
            page.click('.fb-tab[data-tab="shop"]')
            page.wait_for_timeout(600)
            page.screenshot(path=f'{OUT}/shot-phone-shop.png', clip={'x': 0, 'y': 0, 'width': w, 'height': h * 2})
            print('shot-phone-shop.png (Shop panel)')
        ctx.close()
    browser.close()
print('done')
