#!/usr/bin/env python3
"""Rendered-visibility test (real Chromium, Playwright).
For each version: load, then click Games/Shop/Chest in turn and assert
with Playwright's is_visible() (non-empty bounding box AND no
display:none/visibility:hidden anywhere up the ancestor chain) that
exactly the right content is on screen. jsdom class checks cannot see
the v1 nesting bug; this can.
"""
from playwright.sync_api import sync_playwright

CASES = [
    ('v1 (live build)', 'http://127.0.0.1:8901/v1.html'),
    ('v2 (this proof)', 'http://127.0.0.1:8901/fire-world.html'),
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    for label, url in CASES:
        ctx = browser.new_context(viewport={'width': 390, 'height': 844})
        ctx.add_init_script("localStorage.setItem('fb_onboarded_v1','1')")
        ctx.route('**/auth-gate.js', lambda r: r.abort())
        pg = ctx.new_page()
        pg.goto(url, wait_until='networkidle', timeout=45000)
        pg.wait_for_timeout(400)
        out = []
        def vis(sel): return pg.locator(sel).first.is_visible()
        out.append(('games view: grid visible', vis('#game-grid')))
        out.append(('games view: shop hidden', not vis('#gameshop')))
        pg.click('.fb-tab[data-tab="shop"]'); pg.wait_for_timeout(350)
        out.append(('shop view: game shop box visible', vis('#gameshop')))
        out.append(('shop view: merch shop visible', vis('#merchshop')))
        out.append(('shop view: grid hidden', not vis('#game-grid')))
        pg.click('.fb-tab[data-tab="chest"]'); pg.wait_for_timeout(350)
        out.append(('chest view: locker box visible', vis('#lockerbox')))
        out.append(('chest view: shop hidden', not vis('#gameshop')))
        pg.click('.fb-tab[data-tab="games"]'); pg.wait_for_timeout(350)
        out.append(('back to games: grid visible', vis('#game-grid')))
        print(f'== {label} ==')
        for name, ok in out:
            print(f"  {'PASS' if ok else 'FAIL'}  {name}")
        ctx.close()
    browser.close()
