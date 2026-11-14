# Fire Babys Arena (game-60) QC suite — Playwright/Chromium.
# Covers: clean load, math gate, character select (12 heroes, base-ball portraits),
# loadout + STARTER KIT defaults, NO-POWER-STATS LAW (gear changes no numbers),
# a full ladder bout (KO -> round 2 -> splash -> match end -> next bout),
# local couch versus (P2 controls hurt P1), tab bar + pause (HUD law),
# portrait blocker, and ONLINE 1v1: two real pages vs the LIVE multiplayer Worker
# (host creates room, guest joins by code, host-authoritative state reaches guest).
# Run the server first:  node tests/arena/serve.mjs   (port 8946, cwd = tree root)
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
BASE = "http://127.0.0.1:8946"
URL = BASE + "/fire-world/games/game-60-fire-babys-arena.html"

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
    % (json.dumps("test-token-arena"), json.dumps(json.dumps({"email": "t@example.com", "name": "Tester"})))
)


# Test-only shim: point the page's multiplayer calls at the local protocol
# mirror (tests/arena/mock-worker.py). Page code runs unchanged; only the
# transport origin differs. (Sandbox Chromium has zero external egress —
# even example.com fails — so the LIVE Worker is verified separately by
# tests/arena/test-live-worker.py with two real protocol clients.)
SHIM = (
    "const _OF = window.fetch;"
    "window.fetch = (u, o) => _OF(String(u).replace('https://fire-babys-multiplayer.jeffpruden288.workers.dev', 'http://127.0.0.1:8947'), o);"
    "const _OW = window.WebSocket;"
    "window.WebSocket = function(u, p) { return new _OW(String(u).replace('wss://fire-babys-multiplayer.jeffpruden288.workers.dev', 'ws://127.0.0.1:8948'), p); };"
    "window.WebSocket.prototype = _OW.prototype;"
)


def new_page(browser, width=1280, height=800, touch=False, shim=False):
    kw = {"viewport": {"width": width, "height": height}}
    if touch:
        kw["has_touch"] = True
        kw["user_agent"] = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    ctx = browser.new_context(**kw)
    ctx.add_init_script(SEED)
    if shim:
        ctx.add_init_script(SHIM)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    # Hermetic for auth (locker falls back to the starter-kit default);
    # the multiplayer Worker is NEVER routed — online tests hit it live.
    page.route("**://fire-babys-auth.jeffpruden288.workers.dev/**", lambda r: r.abort())
    page.route("https://firebabys.io/**", lambda r: r.abort())
    return ctx, page, errors


def answer_math(page):
    page.wait_for_selector("#mathgate", state="visible", timeout=10000)
    q = page.locator("#mq").inner_text()
    a, b = (int(x) for x in q.replace(" ", "").split("+"))
    page.fill("#ma", str(a + b))
    page.click("#mathgate button")


def pick_fighter(page, char_id):
    page.wait_for_selector("#selectScr", state="visible", timeout=10000)
    page.click('.charCard[data-char="%s"]' % char_id)
    page.click("#selConfirm")
    page.wait_for_selector("#loadoutScr", state="visible", timeout=10000)


def drive_ko(page, victim, attacker_key, max_rounds=400):
    """Step the real sim in-page: pin the attacker beside the victim, keep the
    victim near KO, and throw attacks until the round ends in a KO."""
    return page.evaluate(
        """([victim, key]) => {
          const A = window.FBArena, G = A.G;
          const kd = c => window.dispatchEvent(new KeyboardEvent('keydown', {code: c}));
          const ku = c => window.dispatchEvent(new KeyboardEvent('keyup', {code: c}));
          const vic = victim === 'p2' ? G.p2 : G.p1, atk = victim === 'p2' ? G.p1 : G.p2;
          let sawKo = false;
          for (let i = 0; i < 900; i++) {
            if (G.phase === 'ko') sawKo = true;
            if (sawKo && (G.phase === 'morph' || G.phase === 'splash' || G.phase === 'over')) break;
            if (G.phase === 'fight') {
              vic.hp = Math.min(vic.hp, 4);
              atk.x = vic.x - 58 * (atk.face >= 0 ? 1 : -1) * (atk === G.p1 ? 1 : -1);
              atk.x = vic.x + (atk.x < vic.x ? -58 : 58);
              atk.face = atk.x < vic.x ? 1 : -1;
              kd(key); for (let t = 0; t < 7; t++) A.simTick(0.016);
              ku(key); for (let t = 0; t < 7; t++) A.simTick(0.016);
            } else { A.simTick(0.016); }
          }
          return {phase: G.phase, sawKo, p1wins: G.p1.wins, p2wins: G.p2.wins,
                  round: G.round, coins: G.sessionCoins};
        }""",
        [victim, attacker_key],
    )


def start_fight(page):
    """Menu -> math gate -> pick Blaze -> FIGHT, waiting for the fight phase."""
    page.goto(URL)
    page.wait_for_selector("#overlay", state="visible", timeout=20000)
    page.click("#ladderBtn")
    answer_math(page)
    pick_fighter(page, "blaze")
    page.click("#fightBtn")
    page.wait_for_function("window.FBArena && window.FBArena.G.phase === 'fight'", timeout=15000)


with sync_playwright() as pw:
    browser = pw.chromium.launch()

    # ───────────────────────── SUITE 1: local ladder ─────────────────────────
    print("SUITE 1 — load, gate, select, starter-kit loadout, ladder fight")
    ctx, page, errors = new_page(browser)
    page.goto(URL)
    page.wait_for_selector("#overlay", state="visible", timeout=20000)
    check(page.locator("#fbTabbar").is_visible(), "tab bar visible on menu (HUD law)")
    check(page.locator("#pauseBtn").count() == 1, "exactly one pause button")
    page.click("#ladderBtn")
    answer_math(page)
    page.wait_for_selector("#selectScr", state="visible", timeout=10000)
    check(page.locator(".charCard").count() == 12, "character select shows all 12 heroes")
    page.screenshot(path=str(HERE / "select-screen.png"))
    pick_fighter(page, "blaze")
    # starter kit defaults
    armor_sel = page.locator("#armorRow .gearChip.sel").inner_text()
    weapon_sel = page.locator("#weaponRow .gearChip.sel").inner_text()
    check("Bronze Starter Set" in armor_sel, "default armor = Bronze Starter Set (starter kit)")
    check("Wooden Sword" in weapon_sel, "default weapon = Wooden Sword (starter kit)")
    check(page.locator("#outfitRow .gearChip").count() == 2, "loadout offers BOTH starter outfits")
    preview_battle = page.locator("#statPreview").inner_text()
    page.click("#outfitRow .gearChip:first-child")  # school outfit
    preview_school = page.locator("#statPreview").inner_text()
    check(preview_battle == preview_school,
          "NO-POWER-STATS LAW: school outfit preview identical to bronze set (%r)" % preview_battle)
    # NO-POWER-STATS LAW (Jeff, 2026-10-22): gear changes NO numbers.
    gear_eq = page.evaluate("""(() => {
      const A = window.FBArena, blaze = A.ROSTER.find(c => c.id === 'blaze');
      const mk = (armorId, weaponId) => A.makeFighter(blaze, {armorId, weaponId, outfit: 'battle', shades: false}, 300, 1, 'ai');
      const base = mk('bronze_set', 'wooden_sword');
      const heavy = mk('knight_armor', 'weapon_anvil_drop_03');
      const bare = mk('none', 'fists');
      let tableClean = true;
      for (const cat of ['armor', 'weapons'])
        for (const id of Object.keys(A.GEAR[cat]))
          for (const k of ['hp', 'guard', 'pow', 'spd', 'dmg', 'rate'])
            if ((A.GEAR[cat][id][k] || 0) !== 0) tableClean = false;
      const same = (a, b) => a.maxHp === b.maxHp && a.dmgMul === b.dmgMul && a.spdMul === b.spdMul;
      return { tableClean, baseVsHeavy: same(base, heavy), baseVsBare: same(base, bare),
               maxHp: base.maxHp, dmgMul: base.dmgMul, spdMul: base.spdMul };
    })()""")
    check(gear_eq["tableClean"], "NO-POWER-STATS LAW: every GEAR table value is zero")
    check(gear_eq["baseVsHeavy"], "NO-POWER-STATS LAW: knight armor + anvil == bronze + wooden sword numbers")
    check(gear_eq["baseVsBare"], "NO-POWER-STATS LAW: no armor + fists == bronze + wooden sword numbers")
    check(gear_eq["maxHp"] == 104 and abs(gear_eq["dmgMul"] - 1.0) < 1e-9 and abs(gear_eq["spdMul"] - 1.0) < 1e-9,
          "fighter numbers are the character's own (Blaze 104 HP, x1.00 dmg, x1.00 spd)")
    # POWER BOOST REMOVAL (Jeff's no-power law, 2026-10-22): the shop item is
    # a collectible Star Charm now — a maxed locker total changes NO number.
    boost_eq = page.evaluate("""(() => {
      const A = window.FBArena, blaze = A.ROSTER.find(c => c.id === 'blaze');
      const gear = {armorId: 'bronze_set', weaponId: 'wooden_sword', outfit: 'battle', shades: false};
      A.G.locker = { shopBoost: 0 };
      const plain = A.makeFighter(blaze, gear, 300, 1, 'p1');
      A.G.locker = { shopBoost: 0.25 };
      const maxed = A.makeFighter(blaze, gear, 300, 1, 'p1');
      A.G.locker = null;
      const light = f => (5 + (f.mods.dmg || 0) * 0.7) * f.dmgMul;
      const heavy = f => (11 + (f.mods.dmg || 0)) * f.dmgMul;
      return { sameNums: plain.maxHp === maxed.maxHp && plain.dmgMul === maxed.dmgMul && plain.spdMul === maxed.spdMul,
               sameDmg: light(plain) === light(maxed) && heavy(plain) === heavy(maxed),
               noBoostField: !('boost' in maxed), capGone: typeof window.BOOST_DMG_CAP === 'undefined' };
    })()""")
    check(boost_eq["sameNums"], "POWER BOOST REMOVED: maxed Star Charm locker == no-charm locker (HP/dmg/spd identical)")
    check(boost_eq["sameDmg"], "POWER BOOST REMOVED: light/heavy damage output identical with and without charms")
    check(boost_eq["noBoostField"], "POWER BOOST REMOVED: fighter carries no boost field")
    check(boost_eq["capGone"], "POWER BOOST REMOVED: BOOST_DMG_CAP no longer exists")
    page.click("#outfitRow .gearChip:nth-child(2)")  # back to battle set
    page.click("#fightBtn")
    page.wait_for_function("window.FBArena && ['morph','fight'].includes(window.FBArena.G.phase)", timeout=10000)
    st = page.evaluate("({p1: FBArena.G.p1.ch.id, maxHp: FBArena.G.p1.maxHp, ctrl2: FBArena.G.p2.ctrl, tier: FBArena.G.p2.tier})")
    check(st["p1"] == "blaze" and st["maxHp"] == 104, "Blaze fights at his own 104 HP (gear adds nothing)")
    check(st["ctrl2"] == "ai", "ladder opponent is AI")
    page.wait_for_timeout(1600)  # morph intro -> fight
    page.screenshot(path=str(HERE / "fight-ladder.png"))
    r1 = drive_ko(page, "p2", "KeyF")
    check(r1["sawKo"], "round 1 ends in a KO (dizzy sequence)")
    check(r1["p1wins"] == 1, "P1 takes round 1")
    check(r1["coins"] >= 5, "round win earns coins via earn rules (session=%d)" % r1["coins"])
    r2 = drive_ko(page, "p2", "KeyF")
    page.wait_for_function("window.FBArena.G.phase === 'over'", timeout=10000)
    page.wait_for_selector("#endScr", state="visible", timeout=10000)
    title = page.locator("#endTitle").inner_text()
    check("BOUT WON" in title, "match end screen after best-of-3 (%r)" % title)
    st = page.evaluate("({coins: FBArena.G.sessionCoins, roundWinnerIsP1: FBArena.G.roundWinner === FBArena.G.p1})")
    check(st["coins"] >= 20, "match win adds game_complete coins (session=%d)" % st["coins"])
    page.screenshot(path=str(HERE / "match-end.png"))
    page.click("#endMainBtn")
    page.wait_for_function("window.FBArena.G.ladderIdx === 1 && ['morph','fight'].includes(window.FBArena.G.phase)", timeout=10000)
    check(True, "NEXT OPPONENT starts ladder bout 2")
    # pause / HUD law
    page.wait_for_function("window.FBArena.G.phase === 'fight'", timeout=10000)
    page.click("#pauseBtn")
    check(page.evaluate("window.FBArena.G.paused") is True and page.locator("#pauseOv").is_visible(),
          "pause button opens the pause menu (all menu buttons live there)")
    page.click("#resumeBtn")
    check(page.evaluate("window.FBArena.G.paused") is False, "resume unpause")
    check(len(errors) == 0, "zero page errors in local suites %s" % (errors[:2],))
    ctx.close()

    # ───────────────────────── SUITE 2: couch versus ─────────────────────────
    print("SUITE 2 — local versus, P2 controls")
    ctx, page, errors = new_page(browser)
    page.goto(URL)
    page.wait_for_selector("#overlay", state="visible", timeout=20000)
    page.click("#versusBtn")
    answer_math(page)
    pick_fighter(page, "blaze")
    page.click("#fightBtn")
    page.wait_for_selector("#selTitle", state="visible", timeout=10000)
    check("PLAYER 2" in page.locator("#selTitle").inner_text(), "versus asks Player 2 to pick")
    pick_fighter(page, "aqua")
    page.click("#fightBtn")
    page.wait_for_function("window.FBArena && ['morph','fight'].includes(window.FBArena.G.phase)", timeout=10000)
    st = page.evaluate("({c1: FBArena.G.p1.ctrl, c2: FBArena.G.p2.ctrl})")
    check(st == {"c1": "p1", "c2": "p2"}, "versus fighters use P1/P2 keyboard control")
    page.wait_for_function("window.FBArena.G.phase === 'fight'", timeout=10000)
    hp0 = page.evaluate("window.FBArena.G.p1.hp")
    res = page.evaluate(
        """() => { const A = window.FBArena, G = A.G;
          const kd = c => window.dispatchEvent(new KeyboardEvent('keydown', {code: c}));
          const ku = c => window.dispatchEvent(new KeyboardEvent('keyup', {code: c}));
          for (let i = 0; i < 120 && G.p1.hp >= G.p1.maxHp; i++) {
            G.p2.x = G.p1.x + 58; G.p2.face = -1;
            kd('KeyK'); for (let t = 0; t < 7; t++) A.simTick(0.016);
            ku('KeyK'); for (let t = 0; t < 7; t++) A.simTick(0.016);
          }
          return G.p1.hp; }"""
    )
    check(res < hp0, "P2 light attack (K) damages P1 — couch versus works")
    check(len(errors) == 0, "zero page errors in versus %s" % (errors[:2],))
    ctx.close()

    # ───────────────────────── SUITE 3: portrait blocker ─────────────────────
    print("SUITE 3 — portrait orientation blocker (site law)")
    ctx, page, errors = new_page(browser, width=390, height=844, touch=True)
    page.goto(URL)
    page.wait_for_timeout(2500)
    rot = page.evaluate("!!document.getElementById('fb-rotate') && document.getElementById('fb-rotate').offsetParent !== null || (!!document.getElementById('fb-rotate') && getComputedStyle(document.getElementById('fb-rotate')).display !== 'none')")
    check(rot, "portrait phones get the turn-your-phone overlay (#fb-rotate)")
    ctx.close()

    # ───────────────── SUITE 4: ONLINE 1v1 vs the LIVE Worker ─────────────────
    print("SUITE 4 — online 1v1: two pages vs protocol mirror (live Worker verified separately)")
    ctxA, pageA, errA = new_page(browser, shim=True)
    pageA.goto(URL)
    pageA.wait_for_selector("#overlay", state="visible", timeout=20000)
    pageA.click("#onlineBtn")
    answer_math(pageA)
    pageA.wait_for_selector("#onlineScr", state="visible", timeout=10000)
    pageA.click("#createRoomBtn")
    pageA.wait_for_function("document.getElementById('roomCodeBig').textContent.trim().length === 6 && document.getElementById('roomCodeBig').textContent.trim() !== '------'", timeout=25000)
    code = pageA.locator("#roomCodeBig").inner_text().strip()
    check(len(code) == 6, "host created a room, code %s" % code)
    pageA.wait_for_function("window.FBArena.net.NET.connected === true", timeout=15000)
    pageA.screenshot(path=str(HERE / "online-lobby.png"))
    pageA.click("#onlinePickBtn")
    pick_fighter(pageA, "blaze")
    pageA.click("#fightBtn")
    pageA.wait_for_function("!!window.FBArena.net.NET.pick", timeout=10000)

    ctxB, pageB, errB = new_page(browser, shim=True)
    pageB.goto(URL)
    pageB.wait_for_selector("#overlay", state="visible", timeout=20000)
    pageB.click("#onlineBtn")
    answer_math(pageB)
    pageB.wait_for_selector("#onlineScr", state="visible", timeout=10000)
    pageB.fill("#joinCode", code)
    pageB.click("#joinRoomBtn")
    pageB.wait_for_function("window.FBArena.net.NET.connected === true", timeout=25000)
    check(True, "guest joined room %s" % code)
    pageB.click("#onlinePickBtn")
    pick_fighter(pageB, "aqua")
    pageB.click("#fightBtn")
    # host auto-begins when both picks land
    pageA.wait_for_function("window.FBArena.net.NET.began === true && ['morph','fight'].includes(window.FBArena.G.phase)", timeout=25000)
    pageB.wait_for_function("window.FBArena.net.NET.began === true && window.FBArena.G.p1", timeout=25000)
    roles = (pageA.evaluate("window.FBArena.G.netRole"), pageB.evaluate("window.FBArena.G.netRole"))
    check(roles == ("host", "guest"), "roles assigned: page A host, page B guest")
    chars = pageB.evaluate("({p1: FBArena.G.p1.ch.id, p2: FBArena.G.p2.ch.id})")
    check(chars == {"p1": "blaze", "p2": "aqua"}, "guest built the same match from the picks")
    pageB.wait_for_function("!!window.FBArena.net.NET.snap", timeout=20000)
    check(True, "guest receives host state snapshots")
    pageA.wait_for_function("window.FBArena.G.phase === 'fight'", timeout=15000)
    # host walks P1 into P2 and attacks with real keys; guest must see P2 lose HP
    hp_before = pageB.evaluate("window.FBArena.G.p2.hp")
    deadline = time.time() + 15
    hp_after = hp_before
    while time.time() < deadline:
        dist = pageA.evaluate("Math.abs(window.FBArena.G.p1.x - window.FBArena.G.p2.x)")
        if dist > 70:
            pageA.keyboard.down("d")
            pageA.wait_for_timeout(150)
            pageA.keyboard.up("d")
        else:
            pageA.keyboard.press("f")
            pageA.wait_for_timeout(300)
        hp_after = pageB.evaluate("window.FBArena.G.p2.hp")
        if hp_after < hp_before:
            break
    check(hp_after < hp_before, "host attack drops guest-side P2 HP (%s -> %s) — sync works" % (hp_before, hp_after))
    pageB.screenshot(path=str(HERE / "online-guest-view.png"))
    # finish the match on the host with the sim-driver; guest should reach the end screen
    for _ in range(2):
        drive_ko(pageA, "p2", "KeyF")
        try:
            pageA.wait_for_function("window.FBArena.G.phase === 'fight' || window.FBArena.G.phase === 'over'", timeout=12000)
        except Exception:
            break
        if pageA.evaluate("window.FBArena.G.phase") == "over":
            break
    pageA.wait_for_selector("#endScr", state="visible", timeout=20000)
    check(True, "host reaches the match end screen online")
    try:
        pageB.wait_for_selector("#endScr", state="visible", timeout=20000)
        btitle = pageB.locator("#endTitle").inner_text()
        check("WINS" in btitle or "WIN" in btitle, "guest reaches the match end screen (%r)" % btitle)
    except Exception:
        check(False, "guest reaches the match end screen")
    check(len(errA) == 0 and len(errB) == 0, "zero page errors online A=%s B=%s" % (errA[:2], errB[:2]))
    ctxA.close()
    ctxB.close()

    # ─────────────── SUITE 5: double jump + kick mechanics ───────────────
    print("SUITE 5 — double jump, standing kick, low kick block rules, air kick")
    ctx, page, errors = new_page(browser)
    start_fight(page)

    def jump_apex(double):
        return page.evaluate(
            """(double) => {
              const A = window.FBArena, G = A.G, p = G.p1, d = G.p2;
              const kd = c => window.dispatchEvent(new KeyboardEvent('keydown', {code: c}));
              const ku = c => window.dispatchEvent(new KeyboardEvent('keyup', {code: c}));
              G.phase = 'fight'; G.timer = 59;
              d.ctrl = 'remote'; d.remoteIn = {}; d.x = 900; d.y = 472; d.vy = 0;
              p.x = 300; p.y = 472; p.vy = 0; p.vx = 0; p.airborne = false; p.jumps = 0;
              p.pose = 'idle'; p.atkKind = null; p.stateT = 0;
              ku('KeyW'); A.simTick(0.016);
              let minY = p.y, secondMin = null, didSecond = false;
              kd('KeyW');
              for (let i = 0; i < 260; i++) {
                A.simTick(0.016);
                if (p.y < minY) minY = p.y;
                if (double && !didSecond && p.airborne && p.vy >= -60) {
                  ku('KeyW'); A.simTick(0.016); kd('KeyW'); didSecond = true;
                }
                if (didSecond && (secondMin === null || p.y < secondMin)) secondMin = p.y;
                if (i > 12 && !p.airborne) break;
              }
              ku('KeyW');
              return {minY, secondMin};
            }""",
            double,
        )

    single = jump_apex(False)
    double = jump_apex(True)
    check(double["secondMin"] is not None and double["secondMin"] < single["minY"] - 40,
          "double jump rises higher than single (apex %.0f vs %.0f)" % (double["secondMin"] or -1, single["minY"]))

    def kick_test(setup, keys_down, keys_up):
        return page.evaluate(
            """([setup, kdList, kuList]) => {
              const A = window.FBArena, G = A.G, p = G.p1, d = G.p2;
              const kd = c => window.dispatchEvent(new KeyboardEvent('keydown', {code: c}));
              const ku = c => window.dispatchEvent(new KeyboardEvent('keyup', {code: c}));
              G.phase = 'fight'; G.timer = 59;
              d.ctrl = 'remote'; d.hp = d.maxHp; d.y = 472; d.vy = 0; d.vx = 0; d.pose = 'idle'; d.atkKind = null;
              p.y = 472; p.vy = 0; p.vx = 0; p.airborne = false; p.jumps = 0; p.pose = 'idle'; p.atkKind = null; p.stateT = 0;
              eval(setup);
              const hp0 = d.hp;
              let kind = null, flags = null;
              /* settle: release every key + one tick so prevIn edges are clean
                 (back-to-back evaluates leave no rAF frame to do it) */
              ['KeyS', 'KeyJ', 'KeyF', 'KeyW'].forEach(ku); A.simTick(0.016);
              kdList.forEach(kd);
              for (let i = 0; i < 48; i++) {
                A.simTick(0.016);
                if (p.atkKind) kind = p.atkKind;
                if (i === 4) flags = {blocking: d.blocking, blockLow: d.blockLow};
                if (d.hp < hp0) break;
              }
              kuList.forEach(ku);
              return {drop: hp0 - d.hp, kind, flags};
            }""",
            [setup, keys_down, keys_up],
        )

    r = kick_test("d.remoteIn = {}; d.x = 420; p.x = 362; p.face = 1; d.face = -1;", ["KeyJ"], ["KeyJ"])
    check(r["kind"] == "kick" and r["drop"] >= 3, "standing kick (J) connects for %d dmg" % r["drop"])

    r = kick_test("d.remoteIn = {right: true}; d.x = 420; p.x = 368; p.face = 1; d.face = -1;", ["KeyS", "KeyJ"], ["KeyJ", "KeyS"])
    check(r["flags"] and r["flags"]["blocking"] and not r["flags"]["blockLow"],
          "standing blocker is guarding (not low) during the low kick")
    check(r["kind"] == "lowkick" and r["drop"] >= 4,
          "LOW KICK slips under a standing block for %d dmg" % r["drop"])

    r = kick_test("d.remoteIn = {down: true}; d.x = 420; p.x = 368; p.face = 1; d.face = -1;", ["KeyS", "KeyJ"], ["KeyJ", "KeyS"])
    check(r["kind"] == "lowkick" and r["drop"] <= 1,
          "crouch-block stops the low kick (chip only, %d dmg)" % r["drop"])

    r = page.evaluate(
        """() => {
          const A = window.FBArena, G = A.G, p = G.p1, d = G.p2;
          const kd = c => window.dispatchEvent(new KeyboardEvent('keydown', {code: c}));
          const ku = c => window.dispatchEvent(new KeyboardEvent('keyup', {code: c}));
          G.phase = 'fight'; G.timer = 59;
          d.ctrl = 'remote'; d.remoteIn = {}; d.hp = d.maxHp; d.x = 420; d.y = 472; d.vy = 0; d.vx = 0; d.pose = 'idle'; d.atkKind = null;
          p.x = 362; p.y = 472 - 64; p.vy = 0; p.vx = 0; p.airborne = true; p.jumps = 1;
          p.pose = 'idle'; p.atkKind = null; p.stateT = 0; p.face = 1; d.face = -1;
          const hp0 = d.hp; let kind = null;
          ku('KeyJ'); A.simTick(0.016); /* settle prevIn, same as kick_test */
          kd('KeyJ');
          for (let i = 0; i < 48; i++) { A.simTick(0.016); if (p.atkKind) kind = p.atkKind; if (d.hp < hp0) break; }
          ku('KeyJ');
          return {drop: hp0 - d.hp, kind};
        }"""
    )
    check(r["kind"] == "airkick" and r["drop"] >= 3, "air kick connects for %d dmg" % r["drop"])
    check(len(errors) == 0, "zero page errors in mechanics suite %s" % (errors[:2],))
    ctx.close()

    # ─────────────── SUITE 6: gamepads — families, mini, live pad ───────────────
    print("SUITE 6 — gamepads: family detection, fallback tables, mini pad, live mocked pads")
    ctx, page, errors = new_page(browser)
    start_fight(page)
    page.evaluate("() => { const G = window.FBArena.G; G.p2.ctrl = 'remote'; G.p2.remoteIn = {}; G.timer = 59; }")
    unit = page.evaluate(
        """() => {
          const P = window.FBArena.pad;
          const mk = (id, mapping, nb) => ({id, mapping, index: 0, connected: true,
            axes: [0, 0, 0, 0], buttons: Array.from({length: nb}, () => ({pressed: false}))});
          const out = {};
          out.famXbox = P.family(mk('Xbox 360 Controller (XInput STANDARD GAMEPAD Vendor: 045e Product: 028e)', 'standard', 17));
          out.famPS = P.family(mk('Sony Interactive Entertainment DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', 'standard', 18));
          out.famDS4 = P.family(mk('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 05c4)', 'standard', 18));
          out.famGen = P.family(mk('USB Gamepad', '', 10));
          out.stdAtk = P.scheme(mk('Xbox', 'standard', 17)).btns.attack;
          const psNS = P.scheme(mk('Wireless Controller', '', 18)).btns;
          out.psNSAtk = psNS.attack; out.psNSKick = psNS.kick; out.psNSSpecial = psNS.special;
          const miniSch = P.scheme(mk('Mini Pad', '', 6));
          out.mini = miniSch.mini; out.miniJump = miniSch.btns.jump; out.miniSpecial = miniSch.btns.special;
          const mp = mk('Mini Pad', '', 6); mp.buttons[2].pressed = true;
          out.miniReadJump = P.read(mp, miniSch.btns).jump;
          let sparseErr = null;
          try {
            const sp = {id: 'Sparse', mapping: '', index: 0, connected: true, axes: [], buttons: []};
            P.read(sp, P.scheme(sp).btns);
            const bare = {id: 'Bare', mapping: 'standard', index: 0, connected: true};
            P.read(bare, P.scheme(bare).btns);
          } catch (e) { sparseErr = String(e); }
          out.sparseErr = sparseErr;
          /* mini hold-attack = special, driven synchronously so the page's own
             rAF polling cannot interleave */
          const mini = mk('Mini Pad', '', 6);
          Object.defineProperty(window.navigator, 'getGamepads',
            {configurable: true, value: function () { return [mini]; }});
          mini.buttons[0].pressed = true;
          P.poll(0.6); out.hold1 = P.slots[0].inp.special;
          P.poll(0.6); out.hold2 = P.slots[0].inp.special;
          P.poll(0.6); out.hold3 = P.slots[0].inp.special;
          mini.buttons[0].pressed = false; P.poll(0.016);
          return out;
        }"""
    )
    check(unit["famXbox"] == "xbox" and unit["famPS"] == "ps" and unit["famDS4"] == "ps" and unit["famGen"] == "generic",
          "family detection: Xbox / DualSense / DualShock ids recognized")
    check(unit["stdAtk"] == 0, "standard mapping: attack = button 0")
    check(unit["psNSAtk"] == 1 and unit["psNSKick"] == 2 and unit["psNSSpecial"] == 0,
          "nonstandard PS fallback table: Cross=1 attack, Circle=2 kick, Square=0 special")
    check(unit["mini"] is True and unit["miniJump"] == 2 and unit["miniSpecial"] == -1,
          "mini scheme engages under 10 buttons (jump=btn 3, special=hold)")
    check(unit["miniReadJump"] is True, "mini pad read: button 3 = jump")
    check(unit["sparseErr"] is None, "sparse pad (missing buttons/axes) never throws")
    check(unit["hold1"] is False and unit["hold2"] is True and unit["hold3"] is False,
          "mini pad: holding attack 1s fires special exactly once")

    def install_pad(pad_js):
        page.evaluate(
            """() => {
              window.__pad = %s;
              Object.defineProperty(window.navigator, 'getGamepads',
                {configurable: true, value: function () { return [window.__pad]; }});
            }""" % pad_js
        )

    def pad_btn(i, on):
        page.evaluate("window.__pad.buttons[%d].pressed = %s" % (i, "true" if on else "false"))

    def reset_positions():
        page.evaluate(
            """() => { const G = window.FBArena.G;
              G.p2.hp = G.p2.maxHp; G.p1.x = G.p2.x - 58; G.p1.y = 472;
              G.p1.airborne = false; G.p1.vy = 0; G.p1.pose = 'idle'; G.p1.atkKind = null; G.timer = 59; }"""
        )

    XBOX = ("{id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD Vendor: 045e Product: 028e)', mapping: 'standard',"
            " index: 0, connected: true, axes: [0, 0, 0, 0],"
            " buttons: Array.from({length: 17}, () => ({pressed: false, touched: false, value: 0}))}")
    install_pad(XBOX)
    page.wait_for_function("window.FBArena.pad.info().p1 && window.FBArena.pad.info().p1.fam === 'xbox'", timeout=6000)
    check(True, "live Xbox pad assigned to P1")
    check("Xbox" in page.locator("#padChip").inner_text(), "🎮 chip names the Xbox family")
    x0 = page.evaluate("window.FBArena.G.p1.x")
    page.evaluate("window.__pad.axes[0] = 1")
    page.wait_for_timeout(450)
    page.evaluate("window.__pad.axes[0] = 0")
    x1 = page.evaluate("window.FBArena.G.p1.x")
    check(x1 > x0 + 25, "pad stick moves P1 (%.0f -> %.0f)" % (x0, x1))
    reset_positions()
    pad_btn(0, True)
    page.wait_for_function("window.FBArena.G.p2.hp < window.FBArena.G.p2.maxHp", timeout=5000)
    pad_btn(0, False)
    check(True, "Xbox A (btn 0) = attack")
    reset_positions()
    pad_btn(1, True)
    page.wait_for_function("window.FBArena.G.p2.hp < window.FBArena.G.p2.maxHp", timeout=5000)
    pad_btn(1, False)
    check(True, "Xbox B (btn 1) = kick")
    pad_btn(4, True)
    page.wait_for_function("window.FBArena.G.p1.blocking === true", timeout=5000)
    pad_btn(4, False)
    check(True, "Xbox LB (btn 4) = block")
    pad_btn(3, True)
    page.wait_for_function("window.FBArena.G.p1.airborne === true", timeout=5000)
    pad_btn(3, False)
    page.wait_for_timeout(300)  # several polls must sample the release for a clean second edge
    pad_btn(3, True)
    page.wait_for_function("window.FBArena.G.p1.jumps === 2", timeout=5000)
    pad_btn(3, False)
    check(True, "Xbox Y (btn 3): jump, second tap = double jump")
    page.wait_for_function("window.FBArena.G.p1.airborne === false", timeout=6000)
    pad_btn(9, True)
    page.wait_for_function("window.FBArena.G.paused === true", timeout=5000)
    pad_btn(9, False); page.wait_for_timeout(150)
    pad_btn(9, True)
    page.wait_for_function("window.FBArena.G.paused === false", timeout=5000)
    pad_btn(9, False)
    check(True, "Xbox Menu (btn 9) toggles pause")
    ctl = page.evaluate("document.getElementById('pauseCtl').textContent")
    check("Xbox" in ctl, "pause-menu controls show the Xbox layout")

    DS4 = ("{id: 'Wireless Controller (Vendor: 054c Product: 05c4)', mapping: '',"
           " index: 0, connected: true, axes: [0, 0, 0, 0],"
           " buttons: Array.from({length: 18}, () => ({pressed: false, touched: false, value: 0}))}")
    install_pad(DS4)
    page.wait_for_function("window.FBArena.pad.info().p1 && window.FBArena.pad.info().p1.fam === 'ps'", timeout=6000)
    check(True, "live DualShock pad assigned to P1")
    check("PlayStation" in page.locator("#padChip").inner_text(), "🎮 chip names the PlayStation family")
    reset_positions()
    pad_btn(1, True)  # nonstandard PS fallback: Cross (attack) lives at index 1
    page.wait_for_function("window.FBArena.G.p2.hp < window.FBArena.G.p2.maxHp", timeout=5000)
    pad_btn(1, False)
    check(True, "nonstandard PS pad plays via fallback table (Cross @1 = attack)")
    check(len(errors) == 0, "zero page errors in gamepad suite %s" % (errors[:2],))
    ctx.close()

    browser.close()

print("\n%d passed, %d failed" % (passed, failed))
if failures:
    print("FAILURES:")
    for f in failures:
        print(" - " + f)
sys.exit(1 if failed else 0)
