# Leftover-Fix Pass — 2026-10-12 (Jeff's "Fix it all" scope order)

All 5 remaining fixable findings from batches 06/07/08 implemented and re-verified.
Sources edited: `~/workspace/fire-babys-fireworld/game-NN-v2.html`, copied byte-identical
(`cmp`-verified after the final edit) to `~/workspace/.deploy/fire-world/games/`.
Pre-edit backups (source + deploy names): `~/workspace/fire-babys-gamer-check/backups/leftover-fix/`.
Not uploaded to GitHub. No other games or shared files touched.

**Verification method:** Playwright/Chromium against the local deploy mirror (port 8933),
desktop 1280×800 AND phone 390×844 (touch) for every game, math gate solved, title → gameplay
driven, plus deterministic probes of the games' own state/functions. **Page/console errors: 0
in every run, both viewports, all five games.** `node --check` passed on every extracted
script; every new function is defined and called (grep-verified).

---

## 1) Game 31 — Boulder's Rampart: tower SELLING via long-press ✅

**Implemented:** Pointer-down on a placed tower now starts a hold instead of acting
immediately. A gold progress ring fills around the tower (with a "💰 SELL +N" label) over
**600 ms of wall-clock time**; completing the hold sells the tower for **70% of total
invested gold** (base cost + upgrade costs actually paid — tracked per tower in a new
`invested` field, with a formula fallback that recomputes the same sum for towers lacking
it). Releasing early = the sell is cancelled and the press falls through to the pre-existing
tap-to-upgrade. Dragging >24 px off the tower cancels outright (no sell, no upgrade — a
"✋ Sell cancelled" message shows). The cell is immediately buildable again. Build flow on
empty cells, pause, and mute are untouched (the hold timer freezes while paused).

**Design note / iteration:** the first implementation timed the hold with the game's
frame-capped dt — probing showed it accumulated at ~0.65× wall-clock under low frame
rates, so a 600 ms hold could take ~900 ms+ on a slow phone. Retimed on raw frame time in
the render loop (still pause-frozen, independent of the ⏩ speed toggle). This is the
non-conflicting deliberate input batch 06 asked for: single-tap = upgrade, double-tap is
never used, and an accidental sell requires a sustained, visibly-progressing hold.

**Verified (both viewports):** build Arrow (−50 🪙) → tap-upgrade to Lv2 (dmgMul 1.5,
−35 🪙) → drag-off cancel (level and gold unchanged) → long-press sell: tower gone, gold
**+59.6/+60.1** (expected floor(0.7×85)=59 + ~1 passive income) → rebuild on the same cell
✓ → 250 ms press does NOT sell and tap-upgrades instead ✓ → pause/mute toggles ✓ → 0 errors.

## 2) Game 35 — Lava Moat Defense: manual upgrade/sell economy ✅

**Implemented:** Tapping a placed tower selects it (gold selection ring + its range ring
lit) and opens a panel in the game's pill/button language: **⬆️ Upgrade**, **💰 Sell**,
**✖ Close**, with a live "🔥 Lv · ⚔️ dmg" readout. Upgrade: max **Lv4**, costs
**40/80/120 🪙** for Lv2/3/4, each level **+45% damage and +8 range**. Sell refunds
**70% of total invested**. Existing range rings, enemy HP bars, Nova, pause and ⏩
fast-forward all still work (verified). The old auto-level-by-kills became a **capped
veteran bonus** (+0.3 dmg/kill, max +6) — kills still matter, but damage no longer grows
unbounded with no player decision; tower stars now show the manual level.

**Balance reasoning (against the game's own numbers):** base tower 50 🪙, 11 dmg/0.45 s
≈ 24 DPS, 170 range. Enemies pay 7–22 🪙, passive income 1.2 🪙/s, waves run 7–29 enemies.
A maxed tower costs 290 🪙 total for ≈57 DPS (2.35× damage, 194 range) — roughly six base
towers' worth of gold concentrated into ONE ring slot. Since ring slots are limited by
the 52 px spacing rule, upgrades win late and raw towers win early; neither dominates.
Sell at 70% makes repositioning affordable but never free.

**Verified (both viewports):** build on ring (−50 🪙) → tap tower: selected, panel
visible, range flash fires → Upgrade: Lv2, damage 11 → 15.95, range 170 → 178, −40 🪙 →
Sell: tower gone, **+62.4/+62.2 🪙** (expected floor(0.7×90)=63, minus a frame of
rounding/passive timing), panel hides → ⏩ toggles 1×/2×, pause/mute ✓ → 0 errors.
**Full multi-wave play-test** (auto-player: 4 towers built, upgrades bought with a 50 🪙
reserve, extra towers added): reached **wave 5 of 12 in play, castle at 92/100 HP, gold
tight at 74 🪙, 8 towers standing (one at Lv3)** — the economy is neither trivializing
(leaks happened, gold stayed scarce, upgrades were a real choice) nor useless (upgrades
bought and waves kept progressing).

## 3) Game 38 — Fire Baby Rally: ghost car ✅

**Implemented:** Each lap is recorded as `{t, x, y, a}` position samples every **0.1 s**
(capped at 1800 samples). When a lap finishes, if it beats the stored best lap it replaces
the ghost in `localStorage` (`rally_ghost_v1`). On every subsequent race the ghost is
loaded at reset and drawn as a **translucent (α=0.42) pale car** replaying the recorded
line, indexed by current lap time — so it resets cleanly at every lap crossing. The ghost
is **render-only**: it is never fed into physics, so it cannot collide, block, or slow the
player. First-ever run: no stored ghost, none drawn, no errors. Render cost with the ghost
active measured at **0.27 ms/frame** (phone viewport) — negligible.

**Verified (both viewports):** fresh profile → `G.ghost === null` on race 1 → drove a full
lap with a waypoint-steering controller (7.1 s desktop / 6.1 s phone) → ghost saved
(68/59 samples, stored in localStorage) → reloaded, new race: ghost loaded, `ghostPose(1s)`
matches the recorded sample exactly, `ghostPose(3s)` is further along the recorded line →
pause/mute ✓ → 0 errors.

## 4) Game 40 — Sizzle's Spark Run: slide input + overhead ember banner ✅

**Implemented both halves.** (a) **Slide input:** swipe-down or ↓ now calls one DOWN verb —
on the ground it slides (0.6 s, runner squashes low and wide in the game's existing art
style); mid-jump it keeps the existing fast-drop and queues a slide on landing; jumping
cancels a slide. (b) **New overhead obstacle — the ember banner:** a leafy branch strung
across the lane on vines, drawn in the game's flat shapes + ember palette with a
"▼ SLIDE ▼" teaching label, hanging embers, and its underside level with a standing
runner's head. It mixes into spawns at **15% of rows** (45/300 rows in a spawn probe),
only after 30 m so new players learn the basics first, always in a single lane with sparks
in the others. Collision is judged as the banner reaches the runner's depth: standing or
jumping = hit; **only sliding clears it**.

**Verified (both viewports):** standing into banner = death ✓; sliding under = clean pass
✓; ↓ key slides ✓; swipe-down slides ✓; pause/mute ✓; 0 errors. Render cost 0.037 ms/frame.

**Honest note on existing obstacles:** the task text said "existing ground obstacles still
require jumps" — probing the ORIGINAL backup build proved that is not how this game ever
worked: a rock or firewall in the player's lane kills at **every** jump timing (swept 10
timings on the unmodified backup; the falling-obstacle geometry makes the jump arc always
intersect it) — ground obstacles here are **lane-switch dodges**, and jump exists for the
spark arcs / height play. That behaviour is pre-existing, untouched, and re-verified as
identical: standing into a rock = hit, jump physics unchanged (airborne height/timing),
lane-switch dodge clears the rock. Nothing about the slide change altered it.

## 5) Game 41 — Blaze's Inferno Roll: real DeviceOrientation tilt ✅

**Implemented** following batch 02's game-08 pattern: a global `deviceorientation`
listener feeds `devTilt` (gamma/25 for X; beta with a 45° portrait rest angle /25 for Y,
both clamped to ±1), summed with the existing drag tilt in `update()` — tilt is an
**additional** input; drag and WASD/arrows are unchanged. iOS permission is requested from
user taps — the **▶ PLAY button** and the level-pick buttons — via a guarded
`requestTiltPermission()` (`DeviceOrientationEvent.requestPermission` where it exists,
`.catch(()=>{})`, fully try/caught, exactly the game-08 idiom). Where the API/permission
is absent it is a graceful no-op (`devTilt` stays 0). Title text now says "or TILT your
phone/tablet", and the in-game hint switches to "TILT OR DRAG" once a real sensor event
has been seen.

**Verified (both viewports):** permission helper exists and calling it here is a safe
no-op; **simulated orientation events** dispatched in Playwright: gamma +25 →
`devTilt.x = 1`, ball accelerates (bvx reaches the 380 cap rolling right); gamma −25 →
−1; gamma 0 → 0; null gamma/beta event is a no-op with no crash; keyboard input still
accelerates the ball alongside tilt; pause ✓; 0 errors.
**Verification limit (honest):** the iOS `requestPermission()` prompt itself cannot be
exercised from this VM — no real iOS device is available here. The permission call follows
the exact guarded pattern already shipped in game 08, is attached to real user-gesture
handlers (PLAY tap + level picks), and degrades silently everywhere else; the tilt math
and input path are fully verified via simulated events above.

---

## Totals

| Fix | Status |
|---|---|
| 31 — long-press tower selling (70% refund, tap-upgrade intact) | ✅ done, verified both viewports |
| 35 — manual upgrade (Lv4 cap) / sell (70%) economy, balanced + play-tested to wave 5 | ✅ done, verified both viewports |
| 38 — best-lap ghost car (localStorage, render-only, resets per lap) | ✅ done, verified both viewports |
| 40 — slide input (swipe-down + ↓) + overhead ember banner obstacle (15% of rows) | ✅ done, verified both viewports |
| 41 — DeviceOrientation tilt (additional input, iOS permission from PLAY tap) | ✅ done, verified via simulated events; iOS prompt itself not exercisable from this VM (stated above) |

**Could-not-do: nothing.** Every item was implemented. Deploy files changed (all
byte-identical to canonical sources): `game-31-boulders-rampart.html`,
`game-35-lava-moat-defense.html`, `game-38-fire-baby-rally.html`,
`game-40-sizzles-spark-run.html`, `game-41-blazes-inferno-roll.html`.
Brand/safety: spherical flame baby art untouched; no beaks/wings/feathers anywhere; no
character is depicted harmed by any new mechanic (banner/rock deaths use the game's
existing wipe-out flow); all new art/UI drawn in each game's existing visual language;
kid-safe, no new external assets.


---

## Game 10 — mid-cascade pause freeze ✅

**Finding (batch-03, the batch's only could-not-fix):** pause froze gameplay time, input
and the idle clock immediately, but a cascade whose `setTimeout` chain was already running
played out its current ~0.5s before the board rested. Fixed — surgically, no core-loop
rewrite.

**Fix:** a pause-aware scheduler `pTimeout(fn, ms)` now wraps every gameplay timer in the
game. It counts its delay down only while `G.paused` is false (50 ms poll ticks; the delay
is decremented by real elapsed unpaused time), so a chain scheduled before a pause simply
stops advancing mid-step and resumes exactly where it left off, in the original order.
All 12 gameplay `setTimeout` call sites were routed through it: `resolveBoard`'s
remove/gravity step (300 ms) and its recursive next-match step (200 ms), `trySwap`'s
initial resolve delay (250 ms) and illegal-swap undo (200 ms), the gravity + re-resolve
chains of `activateSpecial` / `activateBomb` / `activateNova` (300 ms + 200 ms each), and
the `levelComplete` / `gameOver` overlay delays (600 ms each). The only raw `setTimeout`
left in the file is inside `pTimeout` itself. Resolution order, scoring, special-gem
behaviour and the batch-03 `hasPossibleMove`/`ensureMoves` integration are untouched —
the diff is the scheduler, the 12 call-site renames, and one guard (below).

**Guard added (needed because frozen timers now live longer):** each `pTimeout` captures
a level epoch; `initLevel()` bumps `G.epoch` (and now also resets `G.animating=false`).
A chain left over from a restarted level therefore drops at its next tick instead of
mutating the fresh board — verified live: pause mid-cascade → click ↻ restart → the new
board is byte-identical 1.4 s later with moves back at 30. Without the freeze this stale
chain fired within ~0.5 s; with the freeze it could otherwise have been held indefinitely
and fired after resume.

**Verification (Playwright, deploy mirror served on port 8934, desktop 1280×800 AND
phone 390×844 touch — 38/38 checks passed, 0 page errors, 0 console errors excl. favicon):**
1. **Freeze:** seeded level, first legal move swapped, pause engaged the moment
   `cascade>=1` — board JSON (gem colour/special/pop per cell + score + moves) at
   pause+300 ms is byte-identical to pause+1500 ms, and the chain is still pending at
   +1500 ms (`animating:true, cascade:1`) instead of played out.
2. **Resume == control:** the paused run's settled board/score/moves are byte-identical
   to an unpaused control run of the same seed (777) and same move ([0,3,1,3], score 180,
   moves 29) on both viewports.
3. **No-cascade pause + buttons:** pause on a settled board freezes it and flips the
   button to ▶; mute toggles 🔊/🔇 and persists `fb_muted` 1/0; restart resets
   score/moves/state — all still work.
4. **Reshuffle:** constructed dead board (batch-03's ABAB/CDCD tile pattern) with one
   planted match; cascade paused mid-chain (board frozen across the hold), resumed,
   settled — `ensureMoves` fired ("NO MOVES — SHUFFLED!" counted via the game's own
   `spawnText`), ending board has 0 matches and a legal move (seed 4, both viewports).
5. **Win/lose:** planted match at target−60 → `levelComplete`, "⭐ LEVEL 1 CLEAR!"
   overlay, NEXT LEVEL advances to level 2; moves=1 swap → `gameOver`, "💥 OUT OF
   MOVES" overlay, TRY AGAIN restarts.

**Negative control:** the same freeze test run against the pre-fix backup fails as
expected — under pause the old chain completes (`animating:false, cascade:0`, snapshots
differ), confirming the test detects the original bug and the fix removes it.

**Files:** source `~/workspace/fire-babys-fireworld/game-10-v2.html` → deploy
`~/workspace/.deploy/fire-world/games/game-10-caldera-climb.html`, pair `cmp`-verified
byte-identical (md5 38c2b49040c2f44ff94f8bff24f1fcc7). Pre-edit backups in
`~/workspace/fire-babys-gamer-check/backups/leftover-fix/` with `-game10` suffix
(`game-10-v2.html-game10`, `game-10-caldera-climb.html-game10`). No art/character
changes; no per-frame cost added (the scheduler polls on its own 50 ms timer, not in
the render loop). Not uploaded to GitHub; no other game or shared file touched.

**Batch-03 tally update for game 10: findings 9, fixed 9, could-not-fix: none.**
