#!/usr/bin/env python3
"""Visual-update verification + screenshots for SPLASH (play.html) and 3D (3d.html).
Usage: python3 shoot.py <base_url> <tag>   e.g. python3 shoot.py http://localhost:8901 before
Saves <tag>-splash-title.png, <tag>-splash-deploy.png, <tag>-splash-fight.png,
      <tag>-3d-title.png, <tag>-3d-game.png into the current directory,
plus prints a JSON summary of page errors / probes.
"""
import json, sys, time
from playwright.sync_api import sync_playwright

BASE = sys.argv[1].rstrip('/')
TAG = sys.argv[2]

def run():
    out = {}
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'])
        # ---------- SPLASH ----------
        pg = b.new_page(viewport={'width': 420, 'height': 780})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + '/play.html', wait_until='load', timeout=30000)
        pg.wait_for_timeout(3500)
        probe = pg.evaluate("""() => ({
            hasGame: typeof Game !== 'undefined',
            phase: (typeof Game !== 'undefined') ? Game.phase : null,
            hasUnits: typeof UNIT_DEFS !== 'undefined',
            titleOv: !!document.getElementById('titleOv'),
            titleVisible: (() => { var o = document.getElementById('titleOv'); return o ? o.style.display !== 'none' : false; })()
        })""")
        pg.screenshot(path=f'{TAG}-splash-title.png')
        # dismiss title via TAP TO START
        try:
            pg.click('#titleStart', timeout=3000)
        except Exception:
            pg.evaluate("() => { if (window.__TITLE_DEBUG) __TITLE_DEBUG.play(); }")
        pg.wait_for_timeout(1200)
        # first-run hatch prompt (patch 013): skip it to reach the deploy grid
        try:
            pg.click('#hatchSkipBtn', timeout=2500)
            pg.wait_for_timeout(600)
        except Exception:
            pass
        # place units via the game's own entry point (same probe the overhaul used)
        place = pg.evaluate("""() => {
            var r = [];
            try { selTroop = 'brawler'; r.push(['tryPlace(0,0)', String(tryPlace(0,0)), 'deployed=' + deployed.length]); } catch(e) { r.push(['tryPlace(0,0) threw', String(e)]); }
            try { selTroop = 'guardian'; r.push(['tryPlace(1,0)', String(tryPlace(1,0)), 'deployed=' + deployed.length]); } catch(e) { r.push(['tryPlace(1,0) threw', String(e)]); }
            try { selTroop = 'archer'; r.push(['tryPlace(2,0)', String(tryPlace(2,0)), 'deployed=' + deployed.length]); } catch(e) { r.push(['tryPlace(2,0) threw', String(e)]); }
            return { results: r, deployed: (typeof deployed !== 'undefined') ? deployed.length : -1 };
        }""")
        pg.wait_for_timeout(600)
        pg.screenshot(path=f'{TAG}-splash-deploy.png')
        # start the fight
        try:
            pg.click('#bigBtn', timeout=3000)
        except Exception as e:
            place['fight_click_error'] = str(e)
        pg.wait_for_timeout(3200)
        phase2 = pg.evaluate("() => (typeof Game !== 'undefined') ? Game.phase : null")
        pg.screenshot(path=f'{TAG}-splash-fight.png')
        out['splash'] = {'page_errors': errs, 'probe': probe, 'place': place, 'phase_after_fight_click': phase2}
        pg.close()
        # ---------- 3D ----------
        pg = b.new_page(viewport={'width': 420, 'height': 780})
        errs3 = []
        pg.on('pageerror', lambda e: errs3.append(str(e)))
        pg.goto(BASE + '/3d.html', wait_until='load', timeout=45000)
        pg.wait_for_timeout(6000)
        has_canvas = pg.evaluate("() => !!document.querySelector('canvas')")
        pg.screenshot(path=f'{TAG}-3d-title.png')
        # try to start: the button pulses forever (never "stable"), so click via JS
        started = False
        try:
            started = pg.evaluate("() => { var b = document.getElementById('startbtn'); if (b) { b.click(); return true; } return false; }")
        except Exception:
            started = False
        if not started:
            for sel in ['#startbtn', 'text=TAP TO START']:
                try:
                    pg.click(sel, timeout=1500, force=True)
                    started = True
                    break
                except Exception:
                    pass
        if not started:
            pg.mouse.click(210, 390)
        pg.wait_for_timeout(1500)
        # the world builds after start; hide DOM overlays so the shot shows the
        # game's real 3D rendering (crew at the start pad, scenery, lighting)
        pg.wait_for_timeout(4500)
        try:
            pg.evaluate("""() => {
                document.querySelectorAll('.ov').forEach(function(el){ el.style.display = 'none'; });
                ['mpmenuov','mplobbyov','loadov'].forEach(function(id){ var e = document.getElementById(id); if (e) e.style.display = 'none'; });
            }""")
        except Exception:
            pass
        # nudge movement keys for a touch of life
        for k in ['KeyW', 'ArrowUp']:
            try:
                pg.keyboard.down(k); pg.wait_for_timeout(900); pg.keyboard.up(k)
            except Exception:
                pass
        pg.wait_for_timeout(1200)
        pg.screenshot(path=f'{TAG}-3d-game.png')
        out['3d'] = {'page_errors': errs3, 'canvas': has_canvas, 'start_clicked': started}
        pg.close()
        b.close()
    print(json.dumps(out, indent=1))

run()
