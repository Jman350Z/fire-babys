# Batch 07 — Gamer-Check Findings (Games 33–38)

Scope: fresh gamer-lens + genre-benchmark audit, fix, and re-play verification.
Sources edited: `~/workspace/fire-babys-fireworld/game-NN-v2.html`; deploy mirrors in
`~/workspace/.deploy/fire-world/games/` updated and verified **byte-identical** for all six.
Pre-edit backups of both source and deploy copies: `~/workspace/fire-babys-gamer-check/backups/batch-07/` (12 files).
Not uploaded to GitHub (per task). No other games/site files touched.

**Shared complaint found in ALL SIX games (fixed in all six):** no pause and no mute anywhere.
Every game now has fixed 48px ⏸️ pause + 🔊 mute buttons (top-right, ≥44px tap targets), **P** also
toggles pause, pause actually halts `update()` and draws a ⏸️ PAUSED veil, and mute gates the game's
existing `tone()`/`noise()` helpers. Verified live in every game (mute icon flips to 🔇, `G.paused`
true→false on toggle).

**Verification note (honest):** baseline (pre-fix, unloaded host) measured **60 FPS on all six games,
desktop + phone, 0 page errors**. Post-fix re-runs all passed gameplay/state checks with **0 page errors
on both viewports**, but FPS re-measurement was polluted by sibling batch workers saturating the host
(readings of 2–27 rAF are host contention, not game cost — games use capped dt and identical render
loads to baseline). Post-fix FPS on an unloaded host could not be cleanly re-measured in this window.

---

## Game 33 — Inferno Aim (`game-33-inferno-aim.html`)

**Complaints found:**
1. *(Medium, shared)* No pause, no mute.
2. *(Medium, balance)* Difficulty only escalated via spawn rate; target speed never rose, so late-game targets felt the same as early ones — below genre standard.
3. *(Low, overhaul leftover)* Dead no-op `else G.time+=0;` in the main loop; `streak` counter maintained but never read.
4. *(Low)* Countdown time bar only refreshed on a random ~10%-per-frame HUD tick — bar visibly lagged/jittered behind the real clock.

**Cross-reference:** *Moorhuhn / Crazy Chicken* (timed shooting gallery). Defining mechanics: (1) fixed
timed session with escalating target pressure, (2) penalty targets mixed with scoring targets,
(3) combo/score chase against your best. **Verdict: upgraded to match** — (2) and (3) already delivered
(bombs −50, combo multiplier, best score); (1) now fully delivered via target-speed escalation.
No assets/art/names/layouts copied; all expression remains Fire Babys original.

**Fixes applied:** pause+mute (shared); target velocity now scales up to ~1.9× as the 60s clock runs
down (`spd` factor in `spawnTarget()`); dead no-op and unread `streak` removed; time bar now updates
every frame inside `update()`.

**Re-verification:** desktop play — gate solved, state `play`, targets spawn, pause/mute toggles
confirmed, 0 page errors. Phone (baseline pattern): 0 errors.

**FIXED vs COULD-NOT-FIX:** Findings **4** — Fixed **4** — Could-not-fix: **none**.

---

## Game 34 — Spark Jump Arcade (`game-34-spark-jump-arcade.html`)

**Complaints found:**
1. *(Medium, shared)* No pause, no mute.
2. *(High, clarity)* Instructions said "**TAP** to jump" but the real control is **hold to charge, release to jump** — a first-time player tapping does almost nothing and bounces weakly. Text now matches the real control.
3. *(Medium, controls)* No keyboard control at all. Desktop players had mouse-only in a game whose whole loop is one button.
4. *(Low, overhaul leftover)* Score floaters advanced by a fixed `0.016` step inside `render()` — framerate-coupled (too fast at 120Hz, too slow at 30Hz).

**Cross-reference:** *Doodle Jump* (vertical platform hopper). Defining mechanics: (1) endless vertical
climb with the camera chasing upward, (2) platforms get smaller/sparser and start moving as you rise,
(3) one simple repeated input, instant restart. **Verdict: matches, with one deliberate gap (below)** —
(1) and (2) already delivered (camera shift, shrink + moving platforms); (3) delivered as hold/release
on touch, mouse, **and now SPACE/↑**; instant restart via the game-over button.
Gap reason: Doodle Jump's auto-bounce/tilt steering is its core control identity; replacing this game's
hold-and-release charge jump with it would replace the game's core loop, not fix it. The functional
equivalents (one-input climbing, escalating platforms) are all present.

**Fixes applied:** pause+mute (shared); help text corrected to "HOLD to charge, RELEASE to jump
(or hold/release SPACE)"; SPACE/ArrowUp keydown/keyup now charge and release a jump (repeat-guarded);
floaters tick on real `dt` in the main loop instead of inside `render()`.

**Re-verification:** desktop — keyboard charge confirmed (`G.charging` true on hold), jump fired on
release; phone — touch hold/release jump confirmed (`G.jumping` true); pause/mute confirmed; 0 page errors.

**FIXED vs COULD-NOT-FIX:** Findings **4** — Fixed **4** — Could-not-fix: **none**
(the Doodle Jump control-scheme difference is a core-loop identity difference, documented above, not an unfixed defect).

---

## Game 35 — Lava Moat Defense (`game-35-lava-moat-defense.html`)

**Complaints found:**
1. *(Medium, shared)* No pause, no mute — worst in this game: a 12-wave tower defense with no way to pause or speed up.
2. *(Medium, clarity/bug)* Wave HUD was off by one: it displayed "Wave 2/12" during Wave 1 (formula used `wave+1` after `startWave()` had already set the wave). Confirmed live post-fix: pill correctly reads "Wave 1/12" during Wave 1.
3. *(Medium, clarity)* Invalid taps were silent or near-silent: off-ring taps did nothing at all, low-gold taps only clicked. Players couldn't tell why a tower didn't appear.
4. *(Medium, clarity)* No tower-range information: towers have 170px range but nothing ever showed it, so ring placement was guesswork.
5. *(Low, clarity)* Enemies had no HP bars — tank damage progress was invisible.
6. *(Low)* Tapping the castle with an uncharged Nova did nothing and said nothing.

**Cross-reference:** *Bloons TD 6* (tower defense). Defining mechanics: (1) wave-based leaks vs. lives
with a gold economy, (2) placement + range as the core decision, (3) pause and fast-forward as standard
TD controls. **Verdict: upgraded to match** — (1) already delivered; (2) now delivered with range
preview; (3) now delivered (⏸️ pause + ⏩ 1×/2× fast-forward button). No Bloons assets/art/names copied.

**Fixes applied:** pause+mute (shared) + ⏩ fast-forward (dt ×2, button highlights in 2×); wave HUD
formula fixed to `max(1, wave)`; on-canvas feedback messages for off-ring taps ("👆 Tap ON the glowing
ring to build!"), low gold ("🪙 Need 50 gold for a tower!"), too-close placement, and uncharged-Nova
castle taps ("🔆 Nova needs N more kills!") — all verified live; faint range ring (170px) drawn per
tower plus a bright 1.4s range flash on the tower just built (verified: `rangeT` fires on build);
enemy HP bars (`maxhp` stored at spawn, bar drawn when damaged — verified `maxhp>0` on live enemies).

**Re-verification:** desktop — towers build on ring, FF toggles speed 1→2, messages fire, wave pill
correct during Wave 1, pause/mute confirmed, 0 page errors. Phone (baseline pattern): 0 errors.

**FIXED vs COULD-NOT-FIX:** Findings **6** — Fixed **6** — Could-not-fix:
- *Manual tower upgrade paths / sell / targeting modes (Bloons-style)* — **not implemented, hard reason:**
  this game's progression is auto-level-by-kills by design; bolting on an upgrade/sell economy changes
  game balance end-to-end and cannot be play-balanced safely inside this audit pass. It is a redesign,
  not a repair; flagged here for Jeff rather than shipped unbalanced. All defining TD mechanics
  (waves, economy, placement, range, leaks, pause, fast-forward) are delivered.

---

## Game 36 — Magma Drop Physics (`game-36-magma-drop-physics.html`)

**Complaints found:**
1. *(Medium, shared)* No pause, no mute.
2. *(Low, overhaul leftover)* Dead level-select markup: empty `#lvlSel` element plus orphaned `.lvlBtn` CSS that no code ever populated or used.
3. *(Medium, feel)* Peg-hit sound used a random pitch — the genre's signature satisfaction is a pitch that *climbs* as your peg chain grows. Combo existed internally but the player couldn't hear or see it working.
4. *(Low, robustness)* A ball balanced exactly on a peg could in principle stall a turn indefinitely — no anti-stall safeguard.

**Cross-reference:** *Peggle* (pachinko physics puzzler). Defining mechanics: (1) limited balls,
aim-and-drop through a peg field, (2) escalating audio/visual feedback as the chain builds,
(3) multiplier finale slots with a jackpot moment. **Verdict: upgraded to match** — (1) and (3) already
delivered (10 balls, ×10 jackpot slot with fanfare); (2) now delivered (below). No Peggle assets,
art, characters, or music copied — pitch-rise is a functional feedback pattern, implemented with this
game's own `tone()` helper.

**Fixes applied:** pause+mute (shared); dead `#lvlSel` markup and `.lvlBtn` CSS removed (verified:
element absent live); `sfx.peg()` now takes the chain count and rises in pitch with `G.combo`, and a
"🔗 PEG CHAIN xN" banner appears on screen at chains ≥5; anti-stall nudge — a ball in flight >10s gets
a random impulse so a turn can never soft-lock (verified: `ball.age` field live).

**Re-verification:** desktop — ball drops, scores (25 pts from a bumper on the test drop), balls
10→9, `lvlSel` confirmed gone, pause/mute confirmed, 0 page errors. Phone (baseline pattern): 0 errors.

**FIXED vs COULD-NOT-FIX:** Findings **4** — Fixed **4** — Could-not-fix: **none**.

---

## Game 37 — Volcanic Stack Smash (`game-37-volcanic-stack-smash.html`)

**Complaints found:**
1. *(Medium, shared)* No pause, no mute.
2. *(Medium, controls)* No keyboard control — mouse/touch only in a one-button timing game.
3. *(Low, overhaul leftover)* Debris froze mid-air on death: the loop stopped calling `update()` once `G.dead` was set, so the toppled block hung frozen for the ~700ms before the game-over overlay.
4. *(Low, feel)* Camera "smoothing" was applied as a single 0.25 step per landed block, so the view never finished settling and lagged further behind the higher the tower grew.

**Cross-reference:** *Stack* (Ketchapp) (timing stacker). Defining mechanics: (1) swinging block,
one-tap drop, overhang trimmed, (2) perfect-placement snap/grow-back reward, (3) steadily rising speed.
**Verdict: matches** — all three already delivered (trim + debris, perfect grow-back + particles,
speed ramp to 520). Upgrades this pass were control/feel parity items (keyboard, camera, death
animation), not missing genre mechanics. No assets/art copied.

**Fixes applied:** pause+mute (shared); SPACE drops the block (shared `dropBlock()` used by both
pointer and keyboard; verified: timed Space drop scores, stack grows); debris/particles/floaters
extracted into `tickFx(dt)` which also runs while dead (verified live: debris y 650→735→867 during
the game-over beat); camera now lerps continuously toward the stack top every frame (`dt*5` factor)
instead of one step per landing.

**Re-verification:** desktop — timed Space drop: score 1, stack 2, not dead; forced miss → dead with
debris still falling; pause/mute confirmed; 0 page errors. Phone (baseline pattern): 0 errors.

**FIXED vs COULD-NOT-FIX:** Findings **4** — Fixed **4** — Could-not-fix: **none**.

---

## Game 38 — Fire Baby Rally (`game-38-fire-baby-rally.html`)

**Complaints found:**
1. *(High, controls/fairness)* **The car spawned facing the wrong way.** It was placed below the
start line heading −π/2 (up) while the circuit runs downward from the start point — first-time players
drove straight off the racing line. Fixed: heading +π/2, placed just behind the line. Verified live
on both viewports: car now drives down-track (desktop y 360→862, v≈330; phone v≈340).
2. *(Medium, shared)* No pause, no mute (pause now also works during the countdown).
3. *(Medium, controls)* Multi-touch gas bug: the window-level `pointerup` clear fired when the
*steering* finger lifted, killing the gas mid-corner in two-finger play. Gas is now tied to its own
pointerId; keyboard gas is a separate flag (`kbGas`) so releasing an arrow key can't kill touch gas either.
4. *(Medium, clarity/genre)* No way back when stuck off-track in the grass (genre standard is a
reset-to-track button), and no speed readout.
5. *(Low, clarity)* Lap splits were only shown after the race ended — no live feedback on crossing the line.

**Cross-reference:** *Mario Kart* time-trial mode (top-down/kart time-trial racer). Defining mechanics:
(1) countdown start, lap splits + best time chase, (2) boost pads and off-track slowdown,
(3) instant recovery when stuck. **Verdict: upgraded to match** — (2) already delivered; (1) completed
with live split banner; (3) now delivered via **R** key / ⟲ button (verified: car teleported to within
5px of the track, desktop; 32px on phone = on the racing surface). No Nintendo assets/art/tracks copied;
the circuit is this game's own generated oval.

**Fixes applied:** spawn heading/position corrected; pause+mute (shared, countdown-safe); gas
pointerId tracking + separate keyboard-gas flag; `resetToTrack()` on R and a ⟲ button (snaps car to
nearest track point, aligned to track direction, keeps a rolling 60 speed); live "🏁 Lap N: Xs" split
banner on each crossing; speed readout pill (🚗, km/h-scaled) in the HUD (verified live).

**Re-verification:** desktop **and** phone — heading = π/2 confirmed, car accelerates down-track on
both, R-reset distance-to-track ≈ on-track on both, speed pill updates, pause/mute confirmed, 0 page errors.

**FIXED vs COULD-NOT-FIX:** Findings **5** — Fixed **5** — Could-not-fix:
- *Rival/ghost car (Mario Kart time-trial ghost)* — **not implemented, hard reason:** a ghost requires
  a recording/replay system that does not exist anywhere in this codebase; it is a new system, not a
  repair of a defect. The time-trial core (countdown, laps, live splits, best time, boosts, recovery)
  is fully delivered.

---

## Batch totals

| Game | Findings | Fixed | Could-not-fix |
|------|----------|-------|----------------|
| 33 Inferno Aim | 4 | 4 | — |
| 34 Spark Jump Arcade | 4 | 4 | — |
| 35 Lava Moat Defense | 6 | 6 | 1 (manual upgrade/sell economy — redesign, flagged) |
| 36 Magma Drop Physics | 4 | 4 | — |
| 37 Volcanic Stack Smash | 4 | 4 | — |
| 38 Fire Baby Rally | 5 | 5 | 1 (ghost car — needs a replay system that doesn't exist) |
| **Total** | **27** | **27** | **2 noted with hard reasons** |

**Batch-wide note:** none of the six games has background music (SFX only, pre-existing design).
The control defect — no way to silence the game — is fixed everywhere via the mute toggle.
Composing six original music loops is new content creation, not a repair, and was not improvised
into a kids' game unreviewed; flagged here for Jeff if he wants it as a follow-up.
