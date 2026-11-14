# Fire Babys Gamer Check — Batch 03 (games 09–14)

Fresh gamer-lens + genre-benchmark audit, 2026-10-12. Every game played in Playwright
(desktop 1280×800 and phone 390×844 @ DPR 2, touch) plus deterministic in-page simulation
(`update()` stepped directly) for physics/logic claims. Sources edited:
`~/workspace/fire-babys-fireworld/game-NN-v2.html`, then copied byte-identical to the
`.deploy/fire-world/games/` mirrors (md5-verified). Originals backed up in
`~/workspace/fire-babys-gamer-check/backups/batch-03/`. Overhaul BUG-LOG re-checked:
prior entries for 09–14 (cascade specials, pinball flippers, trench jump-cut, speedway
leaks, etc.) were re-tested in passing — none regressed.

**Shared findings (all 6 games, counted per game):** no working **pause**, no **mute**,
no mid-game **restart**. All three added to every game: ⏸/🔊/↻ buttons (44px tap targets,
top-right, below the HUD), P/Esc pauses, M mutes (persisted via `localStorage fb_muted`,
respected by every `tone()`/`noise()` helper), restart resets the current
run/level with the game's own reset semantics, "⏸ PAUSED" overlay drawn on canvas.
Verified per game by clicking the real buttons in Playwright (pause flag + label flip,
MUTED flag flip, restart returns to `state:'play'`), plus a full death → overlay →
PLAY AGAIN cycle per game on phone — all pass, 0 page errors.

**Performance note (applies to all games):** rAF FPS in the shared test VM read ~3–17 for
every game, *before and after* changes — the VM was running ~10 workers' headless
browsers simultaneously and starves rAF; it is not a game signal. Per-frame CPU cost was
therefore A/B-measured on the heaviest renderer (game 09) at identical in-game load,
patched vs original backup, same browser session: **0.2–0.5 ms vs 0.2–0.3 ms per
update+render — no regression.** No heavy per-frame effects were added anywhere
(all new feedback reuses the existing particle/floater pools).

---

## 09 — Ember Cascade (tower defense)

**Complaints found (8):**
1. [Shared ×3] No pause / no mute / no restart. **FIXED** (see above).
2. [Medium] Placement dead zones: tap-snap radius was 60px while desktop columns sit
   ~215px apart — taps between slots silently did nothing (confirmed: a probe click
   85px from a slot placed nothing, no feedback). **FIXED:** snap radius now scales to
   ~half the column spacing (min 64px); a missed tap shows "Tap a glowing circle!" + a
   dull thock.
3. [Medium] The upgrade mechanic was undiscoverable and failed silently: tapping your
   own tower with <100🔥 (or at Lv3) did nothing at all, and the title screen never
   mentioned upgrades. **FIXED:** title screen explains upgrades; taps now answer
   "Need 100🔥 to upgrade" / "MAX LEVEL" (verified floaters in sim).
4. [Low] Shots damaged whatever enemy stood near a *stale snapshot* of the target's
   position — shots whiffed or hit the wrong invader when the target moved/died.
   **FIXED:** shots track their target and hit its current position (snapshot kept as
   fallback).
5. [Low] No hit feedback on enemies (particles only). **FIXED:** white hit-flash
   (0.12s, dt-decayed) on every damage tick, incl. splash/chain via the shared
   `damageEnemy()`.
6. [Low] Wave breaks were dead time — nothing to do but watch a countdown.
   **FIXED:** see cross-reference upgrade.

**Cross-reference:** *Kingdom Rush / Bloons TD 6* — tower defense. Defining style
mechanics: (1) fixed enemy paths + slot placement with range/targeting decisions —
ours already delivers (3 lanes, 4 tower types, furthest-along targeting); (2) earned
currency spent on placement **and multi-level upgrades** — ours had it but hid it →
**upgraded** (discoverability + feedback, item 3); (3) player control of wave pacing —
genre standard is the early wave-call for bonus currency — ours lacked any →
**implemented our own way:** "⏩ WAVE NOW" button during breaks, bonus = 5🔥 × seconds
skipped (verified: +15🔥 for a 3s skip, timer consumed). **Verdict: upgraded to match.**
No reference assets/art/names/layouts used.

**Fixes + re-verification:** items 1–6 above. Re-played: placement sim (3 towers,
2400 steps) — wave 4, score 850, lives 10/10 held (baseline wave 3 / 510 at same
length; variance is wave randomness + the targeting fix). Phone re-check after a
retry-glitch run: 3/3 towers placed, wave 3, score 450, lives 10. Wave-now, upgrade
feedback, miss feedback all asserted in-page. Page errors: 0 (one favicon 404 from the
local static server — environmental, all games).

**FIXED vs COULD-NOT-FIX — 09: findings 8, fixed 8, could-not-fix: none.**

---

## 10 — Caldera Climb (match-3)

**Complaints found (9):**
1. [Shared ×3] No pause / no mute / no restart. **FIXED**.
2. [High] **Dead boards were a soft stall:** if a cascade settled into a board with no
   legal move, the player could only burn moves swapping illegally until game over —
   no reshuffle existed. **FIXED:** `hasPossibleMove()` + `ensureMoves()` auto-reshuffle
   (colors reshuffled among non-special gems until match-free *and* a move exists),
   called after every settle and at level start, with a "NO MOVES — SHUFFLED!" banner.
   Proven on a constructed dead board (ABAB/CDCD pattern: 0 matches, 0 moves →
   after `ensureMoves()`: a move exists, still 0 matches).
3. [High] **Short swipes didn't register:** a swipe only counted if the finger *ended*
   in the neighbouring cell; the short, flicky swipes kids actually make (<1 cell)
   were read as taps. **FIXED:** pointer-up now uses pixel travel — a >0.35-cell swipe
   inside one cell swaps in the swipe direction (pointercancel also clears state).
   Verified: sub-cell swipe took moves 30→29 with the swap animating.
4. [Medium] Swap-back race: during the 200ms illegal-swap undo, input stayed live and
   the same gems could be re-swapped mid-undo. **FIXED:** input locks during undo
   (verified `animating===true` during undo, no move charged).
5. [Medium] `levelComplete()`/`gameOver()` had no state guard — concurrent resolve
   paths (cascade timeout + special callbacks) could double-fire them.
   **FIXED:** both now bail unless `state==='play'`.
6. [Low] No hint when stuck. **FIXED:** after 5s idle, a legal move pulses gold
   (verified: hint `[0,3,1,3]` appears; clears on any swap attempt).
7. [Low] No keyboard play at all. **FIXED:** arrows select a gem, next arrow swaps it
   that way.

**Cross-reference:** *Candy Crush Saga* — match-3. Defining style mechanics:
(1) swap-to-match with cascading refills and earned specials (4→line blast, 5→color
bomb, cascades→Ember Nova) — ours already delivers; (2) **automatic reshuffle when no
moves remain** — missing → implemented (item 2); (3) **idle hint highlighting a working
move** — missing → implemented (item 6). **Verdict: upgraded to match.**

**Fixes + re-verification:** items 1–7. Re-played desktop + phone: start, swaps
(tap/swipe/sub-cell swipe), hints, pause/mute/restart buttons, game-over → TRY AGAIN
(smoke). 0 page errors. FPS 60 desktop / 17 phone in the contended VM (best readings of
the day — same environment caveat as above).

**FIXED vs COULD-NOT-FIX — 10: findings 9, fixed 8, could-not-fix 1:**
- *Pause during an in-flight cascade:* pause freezes gameplay time, input and the idle
  clock immediately, but a cascade whose `setTimeout` chain is already running plays
  out its current ~0.5s before the board rests (no moves/score are affected by it).
  Fully freezing mid-cascade requires replacing the timeout-chain resolver with a
  tick-driven one — a rewrite of the game's core loop with real regression risk to a
  working game, so it was not done under a "fix safely" mandate.

---

## 11 — Magma Trench Dodge (one-touch runner)

**Complaints found (7):**
1. [Shared ×3] No pause / no mute / no restart. **FIXED**.
2. [Medium] **Stuck "holding" state:** jump release was only heard on the canvas — a
   finger released off-canvas (or a `pointercancel`) left `holding` true forever, so
   jump physics stayed in floaty low-gravity mode and later jump-cuts never landed.
   **FIXED:** one idempotent `releaseJump()` now bound to canvas + window `pointerup`,
   `pointercancel`, and keyup. Verified: two releases after a full-power jump leave
   `vy` at exactly one cut (−1000 → −400, not −160), `holding:false`.
3. [Low] The eruption noise played when a geyser *spawned* — 0.8s before the eruption
   it describes, while the telegraph was still flashing. **FIXED:** `sfx.erupt()` moved
   to the warn→erupt transition.
4. [Low] No reward/feedback for brave close calls. **FIXED:** see cross-reference.
5. [Cosmetic] Dead `parts:[]` field in the state literal. **FIXED:** removed.

**Cross-reference:** *Geometry Dash / Subway-Surfers-style one-touch runners.*
Defining style mechanics: (1) **telegraphed hazards** (warn → erupt geysers, visible
spikes) — ours already delivers, and fairness was re-proven on phone geometry:
timed jumps clear spikes and erupting geysers (auto-player survived 38 sim-seconds on
desktop; scripted phone jumps clear both hazard types); (2) **variable jump + double
jump with escalating speed** — already delivers; (3) **near-miss reward + instant
restart** — restart already delivered (death → RUN AGAIN, no gate); near-miss was
missing → **implemented our own way:** skimming an obstacle while airborne and low
pays +10 with a "CLOSE! +10" floater (verified: +10 scored, 97px apex over a 60px
spike — a genuine skim, high clears earn nothing). **Verdict: matches, with the
near-miss upgrade.**

**Fixes + re-verification:** items 1–5. Re-played: no-jump run dies (dist 31m),
auto-play, near-miss, geyser timing, pause/mute/restart, death → RUN AGAIN smoke on
phone. 0 page errors.

**FIXED vs COULD-NOT-FIX — 11: findings 7, fixed 7, could-not-fix: none.**

---

## 12 — Volcanic Pinball (pinball)

**Complaints found (7):**
1. [Shared ×3] No pause / no mute / no restart. **FIXED**.
2. [CRITICAL] **The ball could never enter the playfield.** The plunger lane had no
   exit geometry at all — the "lane divider" code block was a no-op comment. A launched
   ball rode up the lane and fell straight back down it into the drain, every time.
   Sim-proven on the original, both viewports: `enteredPlay:false`, balls 3→2 with
   score 0 and zero playfield contact. Launch power (−1150) was also marginal for a
   full-height table. **FIXED:** launch strengthened to −1500; a curved-lane-top
   deflector (leftward acceleration above 30% table height inside the lane) feeds the
   ball into the playfield; the lane divider is now solid from the playfield side so
   the ball can't fall back in. Verified post-fix: `enteredPlay:true`; 60 sim-seconds
   with a crude flipper auto-player scored **25,194** on desktop (Ember Shield earned,
   all 3 balls still in hand) and on phone the ball entered, scored 675, and drained
   legitimately through the flipper gap to a proper game over.
3. [Medium] **Flipper physics advanced in `render()`** — `flipSeg()` mutated the
   flipper angle on every call and was called from both update and render, so flipper
   speed/behaviour depended on render rate. **FIXED:** angle advances only in
   `update()` (render passes `adv=false`). Verified: three `render()` calls leave the
   flipper angle byte-identical.
4. [Medium] A ball resting somewhere safe (e.g. cradled oddly) could stall forever —
   no nudge existed despite the header comment promising one. **FIXED:** anti-stuck
   nudge after 2.5s at rest + a player table-nudge on ↓ (1.5s cooldown, screen shake).
5. [Low] Ember Shield state was invisible in the HUD (only a ring on the ball).
   **FIXED:** balls pill shows 🛡️ while held, updated the moment the Nova Bumper
   grants it.

**Cross-reference:** real pinball / *Pinball FX*-style video pinball. Defining style
mechanics: (1) **plunger lane curving into the playfield** — broken in ours →
implemented as a functional equivalent (deflector + one-way divider; no copied table
geometry); (2) flipper skill play with bumpers/slingshots/combo multiplier — already
delivers; (3) **table nudge** — missing → implemented (item 4, cooldown as a tilt-lite
limit); (4) ball-save — already delivers via Ember Shield. **Verdict: upgraded to
match.**

**Fixes + re-verification:** items 1–5, re-simmed as above on both viewports;
drain → game over → PLAY AGAIN smoke passes; pause/mute/restart buttons verified.
0 page errors.

**FIXED vs COULD-NOT-FIX — 12: findings 7, fixed 7, could-not-fix: none.**

---

## 13 — Pyra Prime Defense (breakout)

**Complaints found (8):**
1. [Shared ×3] No pause / no mute / no restart. **FIXED**.
2. [Medium] **Level size depended on screen width:** columns were `floor(W/70)` —
   18 wide (162 bricks on L5) on desktop vs 6 wide (54) on phone. Same level number,
   two different games. **FIXED:** columns capped to 6–12 (verified: 12 desktop,
   6 phone).
3. [Medium] Keyboard paddle control hopped 28px per keypress event — no held-key
   glide, so keyboard play felt broken next to drag. **FIXED:** held-key movement at
   660px/s in `update()` (verified: 330px in 0.5s desktop; exactly the wall clamp on
   phone; 0 drift after keyup).
4. [Medium] The ball could settle into near-horizontal endless rallies between walls
   (speed clamp preserved total speed but nothing preserved a vertical component).
   **FIXED:** after every bounce, |vy| is renormalised to ≥22% of ball speed
   (verified: a 700/20 velocity comes out at exactly 0.22 vertical fraction).
5. [Low] Brick hit-flash decay was mutated inside `render()` at a fixed 0.05/frame —
   frame-rate-dependent. **FIXED:** decay moved to `update()` with dt.
6. [Low] `gameOver()` had no state guard — a same-frame last-brick + last-ball could
   overwrite the win with game over. **FIXED:** guard added (levelComplete already
   had one).

**Cross-reference:** *Breakout / Arkanoid* — paddle-and-bricks. Defining style
mechanics: (1) paddle-position angle control — already delivers (±63° by contact
point); (2) falling power-up variety — already delivers (multi-ball, wide, laser,
slow-mo, sticky, +life, Nova Burst); (3) progressive levels with tougher brick mixes —
already delivers; the genre's anti-stall expectation (ball always returns to play) is
now enforced by item 4. **Verdict: matches, with the anti-stall upgrade.**

**Fixes + re-verification:** items 1–6. Auto-play sim (paddle tracking the ball,
30 sim-seconds): bricks 60→54 desktop / 30→19 phone, score 500/600, lives intact,
state stays in play. Pause/mute/restart verified; ball-loss → game over → TRY AGAIN
smoke passes. 0 page errors.

**FIXED vs COULD-NOT-FIX — 13: findings 8, fixed 8, could-not-fix: none.**

---

## 14 — Sparky Speedway (snake)

**Complaints found (8):**
1. [Shared ×3] No pause / no mute / no restart. **FIXED**.
2. [CRITICAL, phone] **Canvas displayed at DPR× layout size:** `resize()` set the
   bitmap to W×DPR but never set the CSS size, and this game's stylesheet (unlike its
   siblings) has no `canvas{width:100%}` rule — verified bounding box **780×1688 on a
   390×844 phone**, board pushed off-centre/off-screen on retina phones.
   **FIXED:** CSS size set explicitly in `resize()`; verified bounding box now exactly
   390×844.
3. [High] **Quick double-turns were dropped:** only one pending direction existed, so
   an up-then-left flick inside one step lost the first turn (or overwrote it) — the
   classic snake input complaint. **FIXED:** 3-deep turn queue; each queued turn is
   reversal-checked against the previous queued turn, so a queue can never 180 the
   snake. Verified: queue [up, left] executes in order over two steps, snake alive.
4. [Medium] **The golden crystal never expired** — it sat until eaten (verified:
   its spawn timer ran to −0.76 with the crystal still up), so the "+50 bonus" carried
   no urgency or risk. **FIXED:** golden is now a 6-second timed bonus that blinks
   under 2s and despawns (verified expiry + respawn timer reset); title text says so.
5. [Medium] "Smooth snake" interpolated **only the head** — every body segment
   teleported cell to cell (the body branch of the interpolation code multiplied its
   offset by 0, "keep simple"). **FIXED:** full-body interpolation from a per-step
   `prevSnake` snapshot (verified snapshot tracks the snake; render at interp 0.5 is
   error-free).
6. [Low] `placeFood()`/golden spawn used rejection-sampling do-while loops that spin
   forever on a nearly full board. **FIXED:** explicit free-cell list; verified food
   lands in the single free cell of a 399/400-cell board.

**Cross-reference:** classic *Snake* / modern smooth Snake. Defining style mechanics:
(1) grid snake, eat-to-grow, speed ramp — already delivers; (2) **timed bonus food**
(the genre's risk/reward beat) — ours was permanent → implemented (item 4);
(3) **buffered turns + smooth interpolated movement** (the modern standard) — missing →
implemented (items 3, 5). **Verdict: upgraded to match.**

**Fixes + re-verification:** items 1–6, all asserted in-page on both viewports
(dir queue, golden expiry, interpolation snapshot, full-board food placement, canvas
box). Death → PLAY AGAIN smoke passes. 0 page errors.

**FIXED vs COULD-NOT-FIX — 14: findings 8, fixed 8, could-not-fix: none.**

---

## Batch totals

| Game | Findings | Fixed | Could-not-fix |
|---|---|---|---|
| 09 Ember Cascade | 8 | 8 | — |
| 10 Caldera Climb | 9 | 8 | 1 (mid-cascade pause freeze — core-loop rewrite risk, see game 10) |
| 11 Magma Trench Dodge | 7 | 7 | — |
| 12 Volcanic Pinball | 7 | 7 | — |
| 13 Pyra Prime Defense | 8 | 8 | — |
| 14 Sparky Speedway | 8 | 8 | — |
| **Total** | **47** | **46** | **1** |

Brand/safety: no character art changed; Fire Babys remain spherical, bold-outlined,
never harmed (all new feedback is score/UI-level); no beaks/wings/feathers introduced;
all cross-reference borrowing is functional genre mechanics only — zero assets, names,
layouts, or expression copied. Deploy files updated for all six games (source/deploy
pairs md5-identical). Not uploaded to GitHub.
