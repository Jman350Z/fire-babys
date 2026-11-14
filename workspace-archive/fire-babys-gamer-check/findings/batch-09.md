# Fire Babys Gamer Check — Batch 09 (Games 45–50)

Fresh gamer-lens + genre-benchmark audit, 2026-10-12. Method: full code read of each game,
Playwright play-throughs on desktop 1280×800 and phone 390×844 (math gate solved, real
canvas mouse/touch input), page-error capture, rAF FPS counter, load timing. Every fix was
re-played after applying. Sources edited in `~/workspace/fire-babys-fireworld/game-NN-v2.html`
and copied byte-identical to the deploy mirror in `~/workspace/.deploy/fire-world/games/`.
Originals backed up in `~/workspace/fire-babys-gamer-check/backups/batch-09/`.

Overhaul BUG-LOG check for these games: 45 (1 fixed), 46 (6 fixed), 47 (1 fixed), 48 (3 fixed),
49 (1 fixed), 50 (1 fixed) — all previously logged items confirmed still fixed; everything
below is NEW gamer-lens findings beyond that log.

Shared environment note: during testing the VM was heavily contended by sibling batch
workers (load avg ~15, dozens of Playwright browsers). This caused intermittent Playwright
*test-harness* failures (overlay-button click timeouts, one driver disconnect, one
non-reproducing "H is not defined" harness error on 50-phone). Workaround in tests only:
JS clicks for overlay buttons, real mouse/touch kept for all canvas gameplay. Phone taps on
the real buttons (incl. the new ⏸ button) verified working. No game code was changed for
test-environment reasons. FPS baseline before fixes was not separately measured; all final
builds measure 60–61 FPS in play on both viewports, load 0.11–0.57s locally, zero page errors
in every final run.

---

## Game 45 — Lord Inferno's Strike

**Complaints found**
1. **[High] The 🔆 Inferno Nova weapon was keyboard-only (SPACE/X)** — on a phone there was
   literally no way to fire the game's signature weapon. The HUD mentioned the charge count
   but a touch player could never spend it.
2. **[Med] Castle HP invisible in the HUD** — the only HP readout was a 120px bar drawn under
   the castle sprite at the bottom of the screen; a player watching incoming enemies at the
   top had no idea how close they were to losing.
3. **[Med, latent] Wave-clear scheduling was a soft-lock waiting to happen** — next wave was
   started by a `setTimeout` guarded on `state==='play'`, with a fake 999-second "walker"
   pushed into the spawn queue as a sentinel. Anything that changed state during that 1.2s
   window (e.g. pausing) would leave the sentinel in the queue and the next wave would never
   start.
4. **[Low] Mana bar updated on only ~10% of frames** (a `Math.random()<0.1` throttle in
   `updateHUD`) — the resource you're timing every tap against visibly stuttered/stepped.
5. **[Low] Resize could strand enemies outside the new viewport bounds.**
6. **[All-games] No pause, no mute, no in-game restart** — the only way to restart was to lose
   or leave the page; SFX could not be silenced.

**Cross-reference** — *Defend Your Castle* (XGen Studios, click/tap defense). Genre: tap-defense.
Defining mechanics: (1) direct tap/click damage against enemies advancing on your base in
escalating waves; (2) enemy variety — fast/weak vs slow/tanky — forcing target priority;
(3) a visible base-HP fail state. Verdict: **matches** — walker/runner/brute variety, wave
escalation, and castle HP were all present; the mana economy is our own original twist.
The gaps were presentation/controls (weapon unusable on touch, HP not in HUD), fixed below.
No assets, art, names, or expression taken from the reference.

**Fixes + upgrades applied**
- On-screen **🔆 NOVA! button** (bottom-right, thumb-sized) that appears whenever a charge is
  held; keyboard SPACE/X still works.
- Castle HP now in the HUD wave pill (`🌊 Wave N • 🏰 NN%`), updated live.
- Wave scheduling rebuilt pause-safe: next wave is a ticked entry in the spawn queue
  (`{kind:'wave'}`), sentinel hack deleted.
- Mana bar now updates every frame via a cached element.
- Resize listener clamps enemy X into the new bounds.
- Pause (⏸ button + P key, with PAUSED banner), mute (🔊/🔇 + M key, silences both tone and
  noise helpers), restart (↻ button) — added to all six games in this batch.

**Re-verification** — Desktop: 11 kills, score 160, castle 100%, wave pill reads
"🌊 Wave 1 • 🏰 100%", forced Nova charge → button visible → click consumed it (1→0),
pause/mute/restart all verified, FPS 61, 0 errors. Phone 390×844: same flow, Nova button
verified, FPS 60, 0 errors. Final round-2 smoke: play state reached, 0 errors.

## Game 46 — Magma Jump 2D

**Complaints found**
1. **[Critical] The climber could not be climbed.** Jump velocity −560 against gravity
   1800 gives an 87px apex; a wall-to-wall crossing takes 0.78–0.86s, so every legit hop
   ended **112–182px lower than it started** (computed and confirmed in play). Height score
   could only come from finding 2 below.
2. **[High] Mid-air tap-spam exploit** — tapping anywhere, any time, reset `vy=-560` and
   flipped direction, so rhythmic tapping flew straight up the middle, bypassing walls,
   lava, and the entire core loop. This was also the *only* way the game "worked".
3. **[Med] Wall slide was only capped on the exact contact frame** — after sticking, gravity
   re-accelerated the player down the wall at full rate; no controlled slide.
4. **[Low] Combo never decayed** — one star early made every later star pay out at up to x8
   forever.
5. **[Low] Star points were mixed into the height score** — the game-over "Height: Xm" and
   the best-meters pill were polluted by star points, so the headline number lied.
6. **[Low] No feedback when landing on a wall** (no sound/particles on stick).
7. **[Low] No keyboard control on desktop.**
8. **[All-games] No pause, no mute, no in-game restart.**

**Cross-reference** — *Ninja Jump* (Backflip Studios, wall-jump climber). Genre: one-tap
wall-jump climber. Defining mechanics: (1) one-tap jumps that launch you wall-to-wall and
only work from a wall; (2) a slow, controlled wall slide between jumps; (3) hazards mounted
on the walls plus collectibles and a combo to chase while climbing, with falling = death.
Verdict: **upgraded to match** — items 1–3 above were exactly where ours fell short of the
genre standard; all three are now implemented our own way (physics values tuned for our
wall spacing, dust-burst feedback, Fire Babys art unchanged). No assets, names, layouts, or
expression taken from the reference.

**Fixes + upgrades applied**
- Physics retune: gravity 1800→1500, jump velocity −560→−780. A hop now **gains** 118–152px
  (verified numerically for phone and desktop wall gaps).
- Jumps only launch from a wall (`vx===0` while clinging) — the tap-spam flight exploit is
  dead (verified: mid-air tap leaves `vy` untouched).
- Continuous wall-slide cap of 90px/s while clinging.
- Combo decays back to x1 after 4s without collecting a star.
- Star points moved to a separate ⭐ bonus: score is pure height again; game-over shows
  Height + Star bonus + Total, and best is stored on the total (old bests remain comparable —
  they were stored in the same mixed units). Combo pill shows the running bonus.
- Dust-burst particles when sticking to a wall.
- Space / ArrowUp also jump. Pause/mute/restart cluster (phone tap on ⏸ verified).

**Re-verification** — A bot playing *legitimately* (tap only while clinging) climbed
**18.2m on desktop and 9.1m on phone** in 16s and was still alive (previously: net descent
on every hop). Mid-air tap confirmed ignored. Planted-star test: bonus +25, combo x2,
score stayed 0 (pure height); after 5 idle seconds combo decayed to x1. FPS 60 both
viewports, 0 errors.

## Game 47 — Pyra Prime Dash

**Complaints found**
1. **[Med] Keyboard steering was far too slow** — 460px/s against gates falling up to
   ~800px/s; on a desktop-width screen a keyboard player physically could not cross in
   time for the next gate. (Drag steering, at 1.6× gain, was fine.)
2. **[Med] No `pointercancel` handler** — an interrupted touch (notification, gesture)
   left `dragX` stuck and the player steering from a dead pointer.
3. **[Low] The streak score multiplier was invisible** — points silently grew at streaks
   of 5/10/… with nothing on screen explaining why.
4. **[Low] Resize could strand the player and already-spawned gates outside the new
   viewport.**
5. **[All-games] No pause, no mute, no in-game restart.**

**Cross-reference** — *Tunnel Rush* (gate-threading runner). Genre: high-speed gate
threader. Defining mechanics: (1) continuous forward speed you don't control — you only
steer; (2) thread successive gates/openings, with speed ramping and openings narrowing
over a run; (3) streak/near-miss bonuses and a small life count. Verdict: **matches** —
speed ramps 420→~800, gate width shrinks 190→110 across the 20 gates, golden gates pay
3×, streak multiplier, 3 lives. Only the keyboard-control parity gap (item 1) fell short
of the standard; fixed. No assets, names, layouts, or expression taken from the reference.

**Fixes + upgrades applied**
- Keyboard steering 460→720px/s.
- `pointercancel` clears the drag.
- Streak multiplier shown in the gates pill (`🚪 n/20 🔥x2`) from streak 5 up.
- Resize listener clamps player and gate X positions into the new bounds.
- Pause/mute/restart cluster.

**Re-verification** — Keyboard: 252px of movement in a 350ms hold = the new 720px/s.
Drag: a 100px mouse move produced exactly 160px of player movement (1.6× gain intact).
Gate-hit branch exercised through the real update loop: aligning with a golden gate scored
+30 (3×), streak 1, HUD pill updated; the miss branch was exercised in the full harness
(2 misses, lives 3→1). Pause/mute/restart verified. FPS 60 both viewports, 0 errors.
Note: two early closed-loop steering bots scored 0 — root cause was bot error (it didn't
compensate the 1.6× drag gain, oscillating past every gate) compounded by VM contention,
not a game defect; the drag-proof + aligned-gate tests above isolate and confirm the real
mechanics.

## Game 48 — Ash Heap Hero

**Complaints found**
1. **[Med] No `pointercancel` handler** — an interrupted drag left the item stuck to a
   dead pointer.
2. **[Med] Missed items sank visibly *behind* the bins** — the miss threshold was
   `y > H-60`, below the bins' own area (bins occupy H−180…H−70), so items ghosted
   through the bins before the game admitted they were missed.
3. **[Low] Countdown bar updated on only ~10% of frames** (`Math.random()<0.1` HUD
   throttle) — the 90-second clock visibly stepped instead of draining.
4. **[Low] A drag in progress was never released on game over** — the held item kept
   following the pointer behind the results overlay.
5. **[Low] Resize could strand falling items outside the new viewport.**
6. **[All-games] No pause, no mute, no in-game restart.**

**Cross-reference** — *Recycle Roundup* (National Geographic Kids, falling-item sorting).
Genre: drag-sort arcade. Defining mechanics: (1) items fall at steadily increasing
speed; (2) drag each item into its correct category bin; (3) streak-based scoring with a
wrong-bin penalty inside a timed round. Verdict: **matches** — fall speed and spawn rate
both ramp across the 90s, wrong bin costs −15 and the streak, correct sorts pay
10 + 2×streak, bins are labeled with icon + text and highlight on hover. No assets,
names, or expression taken from the reference.

**Fixes + upgrades applied**
- `pointercancel` releases the dragged item (it resumes falling).
- Miss threshold moved to the bins' top edge; the MISSED! floater now appears above the
  bins instead of behind them.
- Time bar updates every frame via a cached element (verified: bar width animates
  continuously).
- `gameOver()` now clears any active drag.
- Resize listener clamps item positions into the new bounds.
- Pause/mute/restart cluster.

**Re-verification** — Desktop and phone: dragging an item into its correct bin scored
+12 (10 + streak bonus), streak HUD updated, time bar animated, pause/mute/restart
verified, FPS 60, 0 errors. Final round-2 smoke: play state, drag attempted, 0 errors
(the run's game clock ran slow only because the shared VM was at load ~15 — the dt clamp
makes game time dilate rather than skip; on-device rAF is unaffected).

## Game 49 — Thermal Track

**Complaints found**
1. **[High] After an off-track fault, tracing could only restart at the START circle** —
   the pointer-down handler accepted touches nowhere else. At 80% progress, one slip
   forced a full re-trace from the top even though your progress was kept, and touching
   the track where you fell off did nothing — it reads as "the game stopped responding".
2. **[Med] Rotation / large resize broke the level** — the track is generated from W/H
   at level start; rotating the phone left a portrait track on a landscape screen.
3. **[Low] Floater text advanced by a hard-coded 0.016s inside `render()`** —
   frame-rate-dependent drift/fade.
4. **[All-games] No pause, no mute, no in-game restart** (pause also needed to cancel
   an active trace cleanly).

**Cross-reference** — steady-hand path tracing (the *Operation*-style tracing genre, as
in kids' tracing apps). Genre: precision path tracing. Defining mechanics: (1) follow a
winding path from start to finish without leaving it; (2) a small fault allowance
(3 strikes) before the run ends; (3) paths get narrower/harder per level and faster
completion pays a bonus — and, standard in the genre, **you resume from where you
failed, not from the very beginning**. Verdict: **upgraded to match** — items 1 was the
genre-standard gap; resume-from-progress is now implemented (progress itself was already
kept; only re-entry was broken). TRACK width shrinks 64→44px across the 6 levels and the
speed bonus were already present. No assets, names, layouts, or expression taken from
any reference.

**Fixes + upgrades applied**
- Pointer-down now also starts tracing within 80px of the **current progress point**
  (the START circle still works, and touching it does not reset progress).
- Resize listener rebuilds the current track when the viewport changes materially
  (ΔW>40 or ΔH>160 — rotation-sized, so mobile URL-bar jitter can't wipe a run);
  progress for the level restarts, score and level are kept.
- Floaters now advance on the real frame dt.
- Pause/mute/restart cluster; pausing cancels any active trace.

**Re-verification** — Full trace driven with real mouse input reached **100% progress**
on desktop and phone. Resume test: after lifting mid-track, pressing at the progress
point set `tracing=true` again. Rotation test: portrait 390×844 → landscape rebuilt the
track for 844 width and play continued. Off-count hearts, level-complete and game-over
flows exercised in the harness. FPS 60, 0 errors.

## Game 50 — Ember Bounce Master

**Complaints found**
1. **[Med] Rotation / large resize broke the level** — brick geometry is computed from
   W/H in `initLevel`; rotating mid-level left bricks and ball physics in the old
   layout.
2. **[Med] No `pointercancel` handler** — an interrupted touch left the paddle drag
   stuck to a dead pointer.
3. **[Low] "TAP TO LAUNCH!" hint only showed during the level's first 3 seconds** —
   after losing a life mid-level, the ball sat stuck on the paddle with no hint that a
   tap relaunches it.
4. **[All-games] No pause, no mute, no in-game restart.**

**Cross-reference** — *Breakout* / *Arkanoid* (Atari/Taito, brick-breaker). Genre:
paddle brick-breaker. Defining mechanics: (1) paddle-position angle control of the
bounce; (2) mixed brick durability plus special bricks; (3) falling power-ups caught
with the paddle; (4) discrete levels with a life count. Verdict: **matches** — angle
control (offset-based, up to ~60°), 2-HP bricks, ⭐ star bricks, the Ember Splitter
pierce power-up on a 5s timer, 5 levels, 3 lives. Nothing to upgrade on the loop
itself; the gaps were robustness/clarity (items 1–3). No assets, names, layouts, or
expression taken from the reference — all five level layouts are original strings
(and the overhaul's level-1 row-length fix was re-confirmed: all rows are 10 columns).

**Fixes + upgrades applied**
- Resize listener rebuilds the current level on rotation-sized viewport changes
  (same ΔW>40 / ΔH>160 guard as game 49); score and lives are preserved.
- `pointercancel` clears the paddle drag.
- Launch hint now shows whenever the ball is stuck, not just in the first 3 seconds.
- Pause/mute/restart cluster (restart replays the current level, keeping score/lives).

**Re-verification** — Desktop: tap launched the ball, paddle followed it via drag,
bricks fell 38→31, score 190, lives intact, Splitter drops active, pause/mute/restart
verified, FPS 60, 0 errors. Phone: full flow through gate → level pick → tap launch
verified in two independent runs; rotation test rebuilt the brick field for landscape
(brick width 79px at 844 wide, 32 bricks) and play continued, ball launched by touch.
(The single "H is not defined" failure in the first harness run never reproduced and
left no page error in any later run — a test-environment flake under VM contention,
not a game defect.)

---

## FIXED vs COULD-NOT-FIX (escalation accounting)

| Game | Findings | Fixed | Could-not-fix |
|---|---|---|---|
| 45 Lord Inferno's Strike | 6 | 6 | none |
| 46 Magma Jump 2D | 8 | 8 | none |
| 47 Pyra Prime Dash | 5 | 5 | none |
| 48 Ash Heap Hero | 6 | 6 | none |
| 49 Thermal Track | 4 | 4 | none |
| 50 Ember Bounce Master | 4 | 4 | none |
| **Total** | **33** | **33** | **0** |

**Could-not-fix list: empty for every game.** Every complaint the audit produced had a
safe in-scope fix, and each fix was re-played on the final build (details per game
above). No cross-reference gap was left as "gap noted": game 46's verdict is *upgraded
to match* (physics, wall-only jumps, wall slide) and game 49's is *upgraded to match*
(resume-from-progress); the other four matched their genre benchmark once their control
and clarity defects were fixed. All genre input was functional patterns only — every
game's art, names, layouts, and expression remain 100% Fire Babys original, characters
unchanged and never harmed (46's "burned" game-over is a pre-existing text label for
touching a lava patch; the flame baby itself is never drawn harmed).

**Deploy files changed (staged, byte-identical to sources; NOT uploaded to GitHub):**
- `~/workspace/.deploy/fire-world/games/game-45-lord-infernos-strike.html`
- `~/workspace/.deploy/fire-world/games/game-46-magma-jump-2d.html`
- `~/workspace/.deploy/fire-world/games/game-47-pyra-prime-dash.html`
- `~/workspace/.deploy/fire-world/games/game-48-ash-heap-hero.html`
- `~/workspace/.deploy/fire-world/games/game-49-thermal-track.html`
- `~/workspace/.deploy/fire-world/games/game-50-ember-bounce-master.html`
