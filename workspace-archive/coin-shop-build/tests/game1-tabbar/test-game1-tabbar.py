# Game 1 (Slingshot Cascade) tab-bar + pause-menu tests — Playwright/Chromium.
# Jeff's HUD law (2026-10-21): ONE browser-style tab bar at the top holds only
# play essentials; every menu button lives behind ⏸; the field stays clear.
# Run the server first:  node tests/game1-tabbar/serve.mjs   (port 8941, cwd = staged root)
# Screenshots land beside this file: desktop / landscape / portrait + pause menu.
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
BASE = "http://127.0.0.1:8941"
URL = BASE + "/fire-world/slingshot-cascade/index.html"

passed = failed = 0
failures = []


def check(cond, label):
    global passed, failed
    if cond:
        passed += 1
        print("  PASS " + label)
    else:
        failed += 1
        failures.append(label)
        print("  FAIL " + label)


SEED = (
    "localStorage.setItem('fb_auth_token', %s);"
    "localStorage.setItem('fb_auth_user', %s);"
    "localStorage.setItem('fb_auth_token_at', String(Date.now()));"
    % (json.dumps("test-token-game1"), json.dumps(json.dumps({"email": "t@example.com", "name": "T"})))
)


def new_page(browser, width, height):
    ctx = browser.new_context(viewport={"width": width, "height": height})
    ctx.add_init_script(SEED)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    # Hermetic: the gate's production Worker is aborted (trust-cache path),
    # everything else must come from the local test server.
    page.route("**://fire-babys-auth.jeffpruden288.workers.dev/**", lambda r: r.abort())
    page.route("https://firebabys.io/**", lambda r: r.abort())
    return ctx, page, errors


def start_game(page):
    page.goto(URL)
    page.wait_for_selector("#overlay", state="visible", timeout=20000)
    page.click("#obtn")  # PLAY -> math gate; answer it like a player would
    page.wait_for_selector("#mathgate", state="visible", timeout=10000)
    q = page.locator("#mq").inner_text()
    a, b = (int(x) for x in q.replace(" ", "").split("+"))
    page.fill("#ma", str(a + b))
    page.click("#mathgate > button")  # UNLOCK
    page.wait_for_function("typeof G !== 'undefined' && G.state === 'play'", timeout=20000)
    page.wait_for_selector("#overlay", state="hidden", timeout=10000)


def box(page, sel):
    return page.evaluate(
        """(s) => { const el = document.querySelector(s); if (!el) return null;
           const r = el.getBoundingClientRect();
           return {x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom}; }""",
        sel)


def visible(page, sel):
    loc = page.locator(sel)
    return loc.count() > 0 and loc.first.is_visible()


def run_viewport(browser, name, width, height, full_checks):
    print(f"== {name} {width}x{height} ==")
    ctx, page, errors = new_page(browser, width, height)
    try:
        start_game(page)
        check(True, f"{name}: game reaches play state")

        # --- the bar: present, pinned to the very top, single row ----------
        bar = box(page, "#fbTabbar")
        check(bar is not None and abs(bar["y"]) < 1 and bar["h"] >= 44, f"{name}: tab bar pinned at top, >=44px tall (h={bar and bar['h']})")
        status = box(page, "#fbStatus")
        check(status is not None and abs(status["y"] - bar["bottom"]) < 2, f"{name}: status strip directly under the bar")
        skels = page.locator("#skels").inner_text()
        check("Skeletons" in skels and "Slimer" in skels, f"{name}: status line shows Skeletons + Slimer ({skels!r})")
        for sel, lbl in [("#score", "score"), ("#level", "level"), ("#shots", "targets"),
                         ("#best", "trophy"), ("#heroBar", "character tabs"), ("#pauseBtn", "pause")]:
            b = box(page, sel)
            check(b is not None and b["y"] >= bar["y"] - 1 and b["bottom"] <= bar["bottom"] + 1,
                  f"{name}: {lbl} lives inside the tab bar")
        powb = page.locator("#fbTabbar .fbtn")
        check(powb.count() == 1 and powb.first.is_visible() and powb.first.inner_text().strip() == "POW",
              f"{name}: POW is a tab in the bar")
        pow_box = box(page, "#fbTabbar .fbtn")
        pause_box = box(page, "#pauseBtn")
        check(pow_box and pause_box and pow_box["x"] > box(page, "#heroBar")["right"] - 2 and pause_box["x"] > pow_box["right"] - 2,
              f"{name}: order … characters · POW · pause at the right end")

        # --- nothing else on the play field ---------------------------------
        for sel, lbl in [("#back", "exit"), ("#muteBtn", "sound"), ("#fbRestart", "restart"), ("#fb-lang-btn", "language")]:
            check(not visible(page, sel), f"{name}: {lbl} NOT on screen while playing")
        ctl = page.evaluate("(() => { const e = document.getElementById('fbCtl'); return e ? getComputedStyle(e).display : 'gone'; })()")
        check(ctl == "none", f"{name}: old bottom POW dock (#fbCtl) is gone")
        hb = box(page, "#heroBar")
        check(hb["y"] < height * 0.4, f"{name}: no bottom character bar (heroBar top y={hb['y']:.0f})")

        # --- layout math: ground sits low enough that towers clear the bar --
        clear = page.evaluate(
            """() => { const gy = groundY(); const topWorld = gy - 285; // tallest tower block centre-ish
               const screenTop = gy + (topWorld - gy) * FB_ZOOM;
               const hdr = document.getElementById('fbTabbar').offsetHeight + document.getElementById('fbStatus').offsetHeight;
               return {gy, screenTop, hdr}; }""")
        check(clear["screenTop"] >= clear["hdr"] - 2,
              f"{name}: tallest tower top (screen y={clear['screenTop']:.0f}) clears header ({clear['hdr']}px)")

        # --- character tabs switch the loaded Baby --------------------------
        page.click("#heroBar .heroChip[data-hero='aqua']")
        check(page.evaluate("G.hero") == "aqua", f"{name}: Aqua tab loads Aqua")
        sel_ability = page.evaluate(
            """() => { const c = document.querySelector('#heroBar .heroChip.sel'); if (!c) return '';
               const sm = c.querySelector('small'); const cs = sm ? getComputedStyle(sm) : null;
               return sm && cs.display !== 'none' ? sm.textContent : ''; }""")
        check("Splash" in sel_ability, f"{name}: selected tab shows its ability ({sel_ability!r})")
        page.click("#heroBar .heroChip[data-hero='sparky']")
        check(page.evaluate("G.hero") == "sparky", f"{name}: Sparky tab loads Sparky")

        if full_checks:
            # --- launch a shot, then POW fires the special ------------------
            pt = page.evaluate(
                """() => { const s = G.sling, gy = groundY();
                   return { x: W * 0.5 + (s.x - W * 0.5) * FB_ZOOM, y: gy + (s.y - gy) * FB_ZOOM }; }""")
            page.mouse.move(pt["x"], pt["y"])
            page.mouse.down()
            page.mouse.move(pt["x"] - 55, pt["y"] + 38, steps=6)
            page.mouse.up()
            page.wait_for_function("G.projectiles.length > 0 || G.shotsUsed > 0", timeout=5000)
            check(page.evaluate("G.shotsUsed") == 1, "desktop: drag launched a shot")
            page.click("#fbTabbar .fbtn")  # POW
            time.sleep(0.35)
            used = page.evaluate("(() => { const p = G.projectiles[0]; return p ? !!p.specialUsed : 'gone'; })()")
            check(used is True or used == "gone", f"desktop: POW fired the hero special (specialUsed={used})")
            page.wait_for_function("G.projectiles.length === 0", timeout=15000)

            # --- pause menu: everything lives here, everything works --------
            page.click("#pauseBtn")
            check(visible(page, "#pausedTxt"), "desktop: pause opens the menu")
            check(page.evaluate("!!window.__fbPaused"), "desktop: game is paused")
            for sel, lbl in [("#resumeBtn", "Resume"), ("#muteBtn", "Sound"), ("#fbRestart", "Restart"),
                             ("#fb-lang-btn", "Language"), ("#back", "Fire World exit")]:
                check(visible(page, sel), f"desktop: menu shows {lbl}")
            lang_in_menu = page.evaluate(
                "(() => { const b = document.getElementById('fb-lang-btn'); return !!(b && document.getElementById('pausedTxt').contains(b)); })()")
            check(lang_in_menu, "desktop: language button moved into the pause menu")
            page.screenshot(path=str(HERE / "pause-menu-desktop.png"))

            page.click("#muteBtn")
            check(page.evaluate("!!window.__fbMuted"), "desktop: Sound toggles mute ON")
            check(page.locator("#muteBtn").inner_text() == "🔇", "desktop: mute icon flips to 🔇")
            page.click("#muteBtn")
            check(page.evaluate("!window.__fbMuted"), "desktop: Sound toggles mute OFF")

            page.click("#fb-lang-btn")
            page.wait_for_selector("#fb-lang-pick.open", timeout=5000)
            check(True, "desktop: Language opens the picker from the menu")
            page.click("#fb-lang-close")
            page.wait_for_function("!document.getElementById('fb-lang-pick').classList.contains('open')", timeout=5000)

            page.click("#fbRestart")
            page.wait_for_function("!window.__fbPaused && G.state === 'play'", timeout=5000)
            check(not visible(page, "#pausedTxt"), "desktop: Restart closes the menu and rebuilds the level")
            check(page.evaluate("G.shotsUsed") == 0, "desktop: Restart reset the level")

            page.click("#pauseBtn")
            check(visible(page, "#pausedTxt"), "desktop: pause reopens the menu")
            page.click("#resumeBtn")
            check(not visible(page, "#pausedTxt") and not page.evaluate("!!window.__fbPaused"),
                  "desktop: Resume closes the menu and unpauses")

        page.screenshot(path=str(HERE / f"gameplay-{name}.png"))
        check(not errors, f"{name}: zero pageerrors" + ("" if not errors else " -> " + " | ".join(errors[:3])))
    finally:
        ctx.close()


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        run_viewport(browser, "desktop", 1280, 800, full_checks=True)
        run_viewport(browser, "landscape", 844, 390, full_checks=False)
        run_viewport(browser, "portrait", 390, 844, full_checks=False)
        browser.close()
    print(f"\n==== {passed} passed, {failed} failed ====")
    if failures:
        print("FAILURES:")
        for f in failures:
            print(" - " + f)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
