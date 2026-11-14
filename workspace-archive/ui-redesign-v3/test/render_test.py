#!/usr/bin/env python3
"""Rendered checks + screenshots for the v3 staging build (local file://).

(d) Phone viewport (390x844), first load, NO interaction:
    count game tiles in #game-grid that are actually rendered/visible
    (laid out, display!=none, visibility!=hidden) — must equal total.
(d2) FIRST-VIEWPORT metric (tightening pass): count tiles whose
    bounding box intersects the initial viewport (no scrolling) at
    390x844 and at 1440x900 — phone must show the full first row
    (2 tiles, 2-col grid), desktop the full first row (4 tiles).
(e) Click the existing "Shop" tab control (untouched hub script):
    #shop must get .fb-on, be on-screen as a drawer, AND the games
    grid must remain fully rendered (no card hidden by the drawer).
(f) Click "Games": drawer must close; grid still fully rendered.
Screenshots: shot-phone.png, shot-phone-games.png, shot-phone-shop.png,
             shot-desktop.png
"""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path.home() / "workspace/ui-redesign-v3"
URL = (ROOT / "fire-world.html").as_uri()

COUNT_JS = """() => {
  const cards = [...document.querySelectorAll('#game-grid .card')];
  const vis = cards.filter(c => {
    const s = getComputedStyle(c);
    return s.display !== 'none' && s.visibility !== 'hidden' &&
           c.getClientRects().length > 0;
  });
  return { total: cards.length, visible: vis.length };
}"""

VIEWPORT_JS = """() => {
  const cards = [...document.querySelectorAll('#game-grid .card')];
  const hit = cards.filter(c => {
    const s = getComputedStyle(c);
    const r = c.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' &&
           r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  });
  const g = document.getElementById('game-grid').getBoundingClientRect();
  const gc = document.getElementById('fb-gcount').getBoundingClientRect();
  return { total: cards.length, in_viewport: hit.length,
           grid_top: Math.round(g.top), gcount_top: Math.round(gc.top),
           gcount_in_viewport: gc.top < innerHeight && gc.bottom > 0 };
}"""

results = {}
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--no-sandbox"])
    # ---------- phone, first load ----------
    pg = b.new_page(viewport={"width": 390, "height": 844})
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL, wait_until="domcontentloaded")
    pg.wait_for_timeout(1800)
    results["first_load"] = pg.evaluate(COUNT_JS)
    results["phone_first_viewport"] = pg.evaluate(VIEWPORT_JS)
    pg.screenshot(path=str(ROOT / "shot-phone.png"))
    # scroll a bit into the grid
    pg.evaluate("document.getElementById('game-grid').scrollIntoView()")
    pg.wait_for_timeout(600)
    pg.screenshot(path=str(ROOT / "shot-phone-games.png"))
    pg.evaluate("window.scrollTo(0,0)")
    pg.wait_for_timeout(300)
    # ---------- open Shop drawer via the real tab control ----------
    pg.click(".fb-tab[data-tab='shop']")
    pg.wait_for_timeout(600)
    shop = pg.evaluate("""() => {
      const s = document.getElementById('shop');
      const r = s.getBoundingClientRect();
      const cs = getComputedStyle(s);
      return { fb_on: s.classList.contains('fb-on'),
               visibility: cs.visibility,
               rect: {x: r.x, y: r.y, w: r.width, h: r.height},
               in_viewport: r.bottom > 0 && r.top < innerHeight && r.width > 0 && r.height > 0,
               items_rendered: document.querySelectorAll('#fbshop-items .shopitem').length };
    }""")
    results["shop_open"] = shop
    results["grid_while_shop_open"] = pg.evaluate(COUNT_JS)
    pg.screenshot(path=str(ROOT / "shot-phone-shop.png"))
    # ---------- open Chest drawer ----------
    pg.click(".fb-tab[data-tab='chest']")
    pg.wait_for_timeout(600)
    results["chest_open"] = pg.evaluate("""() => {
      const s = document.getElementById('locker');
      const r = s.getBoundingClientRect();
      return { fb_on: s.classList.contains('fb-on'),
               visibility: getComputedStyle(s).visibility,
               in_viewport: r.bottom > 0 && r.top < innerHeight && r.width > 0 && r.height > 0,
               shop_closed: !document.getElementById('shop').classList.contains('fb-on') };
    }""")
    results["grid_while_chest_open"] = pg.evaluate(COUNT_JS)
    # ---------- back to Games: drawer closes, grid intact ----------
    pg.click(".fb-tab[data-tab='games']")
    pg.wait_for_timeout(600)
    results["after_games_tab"] = pg.evaluate("""() => ({
      shop_vis: getComputedStyle(document.getElementById('shop')).visibility,
      locker_vis: getComputedStyle(document.getElementById('locker')).visibility
    })""")
    results["grid_after_close"] = pg.evaluate(COUNT_JS)
    results["page_errors_phone"] = errors
    pg.close()
    # ---------- desktop ----------
    dp = b.new_page(viewport={"width": 1440, "height": 900})
    dp.goto(URL, wait_until="domcontentloaded")
    dp.wait_for_timeout(1500)
    results["desktop_first_load"] = dp.evaluate(COUNT_JS)
    results["desktop_first_viewport"] = dp.evaluate(VIEWPORT_JS)
    dp.screenshot(path=str(ROOT / "shot-desktop.png"))
    dp.close()
    b.close()

fl = results["first_load"]
results["PASS_first_load_all_games_visible"] = fl["total"] > 0 and fl["visible"] == fl["total"]
results["PASS_shop_drawer"] = bool(results["shop_open"]["fb_on"] and results["shop_open"]["in_viewport"]
                                   and results["shop_open"]["visibility"] == "visible")
results["PASS_grid_intact_with_shop_open"] = results["grid_while_shop_open"]["visible"] == fl["total"]
results["PASS_chest_drawer"] = bool(results["chest_open"]["fb_on"] and results["chest_open"]["in_viewport"])
results["PASS_drawers_close"] = (results["after_games_tab"]["shop_vis"] == "hidden"
                                 and results["after_games_tab"]["locker_vis"] == "hidden")
# first-viewport gates: full first row of numbered tiles on load —
# phone grid is 2 columns, desktop grid is 4 columns
results["PASS_phone_first_viewport_row"] = results["phone_first_viewport"]["in_viewport"] >= 2
results["PASS_desktop_first_viewport_row"] = results["desktop_first_viewport"]["in_viewport"] >= 4
results["ALL_PASS"] = all(v for k, v in results.items() if k.startswith("PASS_"))
print(json.dumps(results, indent=2))
(ROOT / "test/render-results.json").write_text(json.dumps(results, indent=2))
sys.exit(0 if results["ALL_PASS"] else 1)
