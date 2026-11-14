# Batch 08 — Gamer-Check Findings (Games 39–44) — 2026-10-12

Method: full source read of all six → Playwright baseline (desktop 1280×800 + phone 390×844, math gate solved, title→play) → fixes in canonical source `~/workspace/fire-babys-fireworld/game-NN-v2.html`, copied byte-identical to the `.deploy` mirror → `node --check` on every extracted script + defined-vs-called grep → functional Playwright re-verification of every fix on BOTH viewports, including game-over→restart flows. Originals backed up in `~/workspace/fire-babys-gamer-check/backups/batch-08/` (source + deploy copies).

**Environment caveat on FPS/load numbers:** the VM was running several sibling batch workers' Chromium instances concurrently (load average 11–21 throughout). All FPS figures below are SwiftShader (software) headless readings taken under that contention — floors, not ceilings. Phone viewport (the actual kids' device class) is the meaningful column. Zero page errors and zero console errors in every post-fix run, both viewports, all six games.

**Shared fixes applied to all six games** (counted once per game below): (1) **Pause** — no game in the batch had one. Added a ⏸ button (44px, top-right) + `P`/`Esc`: freezes update, draws a PAUSED veil, input is blocked while paused, and every level/reset path clears pause. (2) **Mute** — no game had one. Added a 🔊/🔇 button; the game's existing `tone()` helper returns early when muted; preference persists in `localStorage` (`fb_mute`).

---

## Game 39 — Caldera Bounce (`game-39-v2.html` → `game-39-caldera-bounce.html`)

**Cross-reference:** *Breakout / Arkanoid* (arcade brick-breaker). Defining style mechanics: (1) paddle-angle control — where the ball lands on the paddle sets the rebound angle; (2) tiered bricks (multi-HP bricks read differently) + falling power-ups; (3) lives + progressive ball speed across levels. **Verdict: matches on all three** (angle control, 2-HP outlined bricks, Blast Ball pickup every 6th break, 5 levels) — the gaps were in control quality and session plumbing, upgraded below.

**Complaints found (6):**
1. **High — keyboard paddle was steppy to the point of being a worse game.** Arrows moved the paddle a fixed 40px per key-repeat event while mouse/touch drag was smooth and continuous; keyboard players lost balls mouse players saved.
2. **Medium — no pause, no mute** (shared fix).
3. **Medium — ball could settle into a near-horizontal stall** after a brick hit (no minimum vertical speed outside the paddle bounce) — the classic Breakout dead-drift.
4. **Low — rotate/resize mid-level stranded the playfield:** bricks/ball kept old-pixel coordinates on the new layout.
5. **Low — spacebar launch ignored level speed** (fixed −450 vs the tap-launch speed that scales per level), so keyboard launches played slower than tap launches.
6. **Low — a missed keyup (window blur) left keys stuck** (would have left the new held-key paddle drifting forever).

**Fixes applied (6/6):** held-key paddle at 640px/s integrated in `update()` (39-1); pause+mute (39-2); minimum |vy| = 150 enforced after every brick bounce (39-3); resize now scales bricks/ball/pickups proportionally (39-4); space launch speed matched to the level's tap-launch speed (39-5); `blur` listener clears held keys (39-6).

**Re-verification:** held ArrowLeft moved the paddle **256px in 600ms** desktop (was one 40px step) and 140px phone (viewport-clamped travel); pause froze ball position exactly; mute toggled to 🔇; forced last-life ball loss → GAME OVER overlay → TRY AGAIN → `state=play, lives=3, score=0`. Errors: 0/0 both viewports. FPS (contended SwiftShader): 18 desktop / 36 phone. Load ~1.7–2.3s under contention (file 16KB).

**FIXED: 6 / 6 findings. COULD-NOT-FIX: none.**

---

## Game 40 — Sizzle's Spark Run (`game-40-v2.html` → `game-40-sizzles-spark-run.html`)

**Cross-reference:** *Subway Surfers* (3-lane endless runner). Defining style mechanics: (1) 3-lane swipe switching + jump, with a quick-drop/slide to cancel airtime; (2) speed and spawn density ramp with distance, distance itself displayed as a score; (3) one-hit runs with combo-chained pickups. **Verdict: upgraded to match** — lane/jump/combo were present; the quick-drop and the live distance readout were missing and are now in. The slide/duck input specifically is in COULD-NOT-FIX with its reason.

**Complaints found (7):**
1. **Medium — no way to cancel a jump.** Genre-standard swipe-down quick-drop was absent: once airborne you were committed (~0.7s), which reads as unresponsive next to every successful runner.
2. **Medium — distance was invisible during play** (score/combo/best only; distance appeared only on the game-over screen) despite the game being a distance runner.
3. **Medium — no pause, no mute** (shared fix).
4. **Medium — the ember background used `shadowBlur` on 24 particles every frame** — the single most expensive canvas operation on low-end phone GPUs/software renderers, spent on background decoration.
5. **Low — rotate/resize left live items floating between lanes** (item x was baked at spawn).
6. **Low — a random `updateHUD()` call fired ~8% of frames** for no reason (DOM churn).
7. **Low — no slide/duck input** (genre staple) — see COULD-NOT-FIX: there is nothing in this game to duck under.

**Fixes applied (6/6):** `doDrop()` — swipe-down or ↓ mid-jump slams vy to 950, documented on the title screen (40-1); distance now rides in the score pill (`⭐ 120 • 45m`), updated once per metre (40-2); pause+mute (40-3); `shadowBlur` removed from `drawEmbers()` (additive `lighter` glow retained) (40-4); resize re-lanes all live items (40-5); stray random HUD call deleted (40-6).

**Re-verification:** HUD read `⭐ 0 • 8m` (desktop) / `⭐ 0 • 11m` (phone) live; jump→↓ dropped the runner out of the air immediately; pause froze distance exactly; phone swipe-left moved lane 1→0; death → WIPED OUT overlay → RUN AGAIN → clean state. Errors: 0/0 both viewports. FPS: 18 desktop / 48 phone.

**FIXED: 6 / 7 findings. COULD-NOT-FIX (1):**
- **Slide/duck input** — no obstacle in this game can be ducked: rocks and firewalls both rise from the ground, so a duck would change nothing visually or mechanically. Adding the input alone would create a *dead input* (worse than its absence); making it meaningful requires designing a new overhead obstacle type, i.e. new game content, not an audit repair.

---

## Game 41 — Blaze's Inferno Roll (`game-41-v2.html` → `game-41-blazes-inferno-roll.html`)

**Cross-reference:** *Labyrinth* (tilt marble maze). Defining style mechanics: (1) momentum tilt control with friction — the ball keeps rolling, you steer the slope; (2) hazard holes/pits that punish the ball's actual body, not just its centre; (3) gated goal — collect everything, then finish, with the gate state readable at a glance. **Verdict: upgraded to match** — tilt/momentum were right; hazard detection and goal-gate feedback were below standard and are now fixed. The overhaul's Low corner-clipping item is **fixed** (it proved cheap and safe — see 41-4).

**Complaints found (8):**
1. **High — the goal gate was silent.** Standing on the 🏁 without all stars did *nothing* — no message, no counter. A kid has no way to learn the goal is star-gated except the title text they read once.
2. **Medium — lava only killed on centre contact:** the ball could sit half-submerged in a lava cell, visually burning, mechanically fine — while the brand rule is the characters are never shown harmed, the *physics lying to the player* is the gamer complaint.
3. **Medium — no pause, no mute** (shared fix). (Pause also matters here: a maze run has no other brake.)
4. **Low (overhaul carry-over) — corner clipping:** collision sampled only the ball's cardinal extremes, so the ball visibly overlapped wall corners diagonally.
5. **Low — no time feedback:** mazes are time-attack by nature; clears showed score only.
6. **Low — stuck input on blur/pointer-cancel:** a missed keyup or an interrupted touch left tilt/keys engaged and the ball driving itself.
7. **Low — ember `shadowBlur`** per frame (as 40-4).
8. **Low — no real device-tilt option** in a tilt-genre game — see COULD-NOT-FIX (iOS permission flow).

**Fixes applied (7/7):** goal now wears a live `N ⭐ LEFT` badge, and standing on the goal under-collected pops a `⭐ COLLECT ALL THE STARS FIRST!` banner (41-1); lava tests centre + 4 edge samples at 0.55R — real overlap kills (41-2); pause+mute (41-3); **corner clipping fixed** — both axis checks now also sample the four diagonal points at R·0.72, a pure addition to the existing tests; traversal re-verified end-to-end on both viewports (41-4); per-level elapsed timer tracked and shown on LEVEL CLEAR / MAZE MASTER overlays (41-5); `blur` clears keys+tilt, `pointercancel` ends drags cleanly (41-6); ember `shadowBlur` removed (41-7).

**Re-verification:** held → on desktop the ball travelled the maze-1 corridor system to bx 6.17 in 2.5s of *contended* game time; on phone it reached bx 9.2 — the goal column — with stars outstanding, and the state stayed `play` (gate held, badge/banner path executed, no crash, no false win); pause froze the ball exactly even with a direction held. Errors: 0/0 both viewports. FPS: 10 desktop (worst contention window of the batch) / 47 phone.

**FIXED: 7 / 8 findings. COULD-NOT-FIX (1):**
- **Real device-tilt (DeviceOrientation) control** — iOS Safari gates it behind `DeviceOrientationEvent.requestPermission()`, a browser-chrome prompt flow that cannot be exercised or verified in this audit environment; shipping an unverifiable permission path into a kids' game risks a permanently dead control on the main device class. Drag-tilt + WASD/arrows are the functional equivalent and are verified working.

---

## Game 42 — Ruko's Speed Trap (`game-42-v2.html` → `game-42-rukos-speed-trap.html`)

**Cross-reference:** *Cyclone* (arcade stop-the-light timing game). Defining style mechanics: (1) one-button timing against a moving marker — the whole game is a single, perfectly readable input; (2) escalation by marker speed + shrinking target across rounds; (3) graded hits (perfect/good/miss) with streak scoring. **Verdict: upgraded to match** — structure was right, but the escalation curve broke the genre's core promise (that a perfect hit is a *skill*), fixed below.

**Complaints found (5):**
1. **High — round 10's PERFECT was physically a coin flip.** Old curve: needle 7.5 rad/s, perfect half-window 0.075 rad → the perfect zone existed for ~20ms — *less than one 60fps frame* (needle steps 0.125 rad/frame). Whether you landed PERFECT depended on frame phase, not timing.
2. **Medium — tick SFX spam:** the overhaul wired `sfx.tick()` to every 1/8-turn step = up to ~19 square-wave ticks/second at late-round speed — a buzz, not a tick.
3. **Medium — no pause, no mute** (shared fix; pause veil is fully opaque here so pausing can't be used to study the needle — dial hidden, "no peeking" note on the veil).
4. **Low — a pause during the 0.9s result beat started the next round behind the veil** (setTimeout ignored pause).
5. **Low — ember `shadowBlur`** per frame (as 40-4).

**Fixes applied (5/5):** speed curve flattened to `2 + round×0.35` (round 10: 5.5 rad/s), target floor widened (0.22 → 0.28 rad), perfect slice widened (0.3 → 0.4 of target) — round-10 perfect window is now ~41ms spanning ≥2 frames at 60fps: brutally hard, but *hittable by skill* (42-1); tick throttled to 4 per revolution (42-2); pause (opaque, cheat-proof) + mute (42-3); round-advance timer re-queues while paused (42-4); ember `shadowBlur` removed (42-5).

**Re-verification:** pause froze needle angle exactly; three taps advanced rounds 1→4 with live values matching the new curve (round 4: speed 3.4, targetW 0.442); forced round 10 → tap → GAME OVER overlay → PLAY AGAIN → round 1. Errors: 0/0 both viewports. FPS: 16 desktop / 41 phone.

**FIXED: 5 / 5 findings. COULD-NOT-FIX: none.**

---

## Game 43 — Boulder's Blockade (`game-43-v2.html` → `game-43-boulders-blockade.html`)

**Cross-reference:** *Rush Hour* (sliding-block traffic puzzle). Defining style mechanics: (1) axis-locked drag blocks on a 6×6 grid, one target block, one exit; (2) move counting against a par, with star ratings; (3) **undo** + reset as table-stakes puzzle tools. **Verdict: upgraded to match** — the board/drag core was solid (post-overhaul), but undo was missing and the move counter didn't mean what par says it means.

**Complaints found (7):**
1. **High — move counting made par and stars meaningless.** One *drag* counted as one move no matter how many cells it crossed, while par was calibrated in cell moves: a 4-cell drag and a 1-cell nudge scored identically, so 3 stars were close to free on every level.
2. **High — no Undo.** The genre's defining safety net was absent; one mis-drag meant Reset (full restart) or playing on damaged.
3. **Medium — no feedback on a blocked drag:** pushing a block into a wall/other block did nothing, silently — kids read that as "the game is broken."
4. **Medium — the 🏁 exit flag rendered off-screen on phones** (x = board right edge + 22px > 390px viewport).
5. **Medium — no mute; no pause** (shared fix; pause here simply blocks input under the veil — the puzzle has no timer to protect).
6. **Low — solved ball roll-out advanced per frame,** so it ran at double speed on 120Hz screens.
7. **Low — an interrupted touch (pointercancel: call, notification) stranded a half-finished drag;** ember `shadowBlur` per frame (as 40-4).

**Fixes applied (7/7):** moves now count per cell stepped (HUD updates live mid-drag); pars now measure the same unit the solver used (43-1); **Undo** — ↩ button + `U` key, snapshot stack (60 deep), undo itself counts as a move so stars stay honest (43-2); throttled low `sfx.bump()` (200ms) when a drag is blocked, using a new helper built on the existing `tone()` (43-3); flag clamped to `min(x, W−16)` (43-4); pause+mute (43-5); roll-out is dt-based (43-6); `pointercancel` commits the drag properly incl. win check; ember `shadowBlur` removed (43-7).

**Re-verification (both viewports, identical results):** drag blocker down 1 cell → `moves=1`, history 1 → Undo → block restored, `moves=2`, history 0 → drag up 1 → `solved=true`, win overlay visible. Errors: 0/0. FPS: 17 desktop / 39 phone.

**FIXED: 7 / 7 findings. COULD-NOT-FIX: none.**

---

## Game 44 — Cinder's Slide (`game-44-v2.html` → `game-44-cinders-slide.html`)

**Cross-reference:** the classic **15-puzzle** (sliding picture puzzle). Defining style mechanics: (1) tap/drag tiles into the blank on progressively larger grids; (2) the player can always consult the *finished picture* they're rebuilding; (3) move count + timer as the score. **Verdict: upgraded to match** — grid sizes, counting and timer were present; the reference picture and desktop keyboard play were missing and are now in.

**Complaints found (6):**
1. **High — the finished picture was nowhere in the game.** The tile art is a volcano + Fire Baby scene, but a player who hadn't memorised it from the scrambled board had no reference to rebuild toward — the genre's most basic aid, absent. (The title screen shows no board at all.)
2. **High — no keyboard controls.** Desktop players had mouse-only play in a genre where arrow-key sliding is standard (39/40/41/42 all accept keys).
3. **Medium — no pause, no mute** (shared fix; pause here also freezes the timer — start-time is shifted on resume and the HUD timer display freezes while paused, so pausing can't be gamed and doesn't inflate times).
4. **Low — ember `shadowBlur`** per frame (as 40-4).
5. **Low — a tile slide is tap-only in code** (pointerdown): fine on touch (the press *is* the slide, so a swipe across a tile also fires it), worth stating rather than changing.
6. **Low — timer ran during any pause of play** — subsumed by 44-3's timer freeze.

**Fixes applied (6/6):** **👀 Hold-to-Peek button** — holding it renders the board in its solved arrangement (zero per-frame cost when not held; input locked while peeking), labelled on the title screen (44-1); keyboard play — the tap logic was refactored into `trySlide(r,c)` shared by pointer and arrows (arrows move the gap; the adjacent tile slides in), documented on the title screen (44-2); pause with timer freeze + mute (44-3); ember `shadowBlur` removed (44-4); items 44-5 (verified behaviour, no change needed) and 44-6 (fixed by 44-3) closed.

**Re-verification:** ArrowLeft slid a tile (empty 1,1 → 1,0, moves 0→1) on both viewports; peek read `true` while held, `false` on release; paused timer pill identical after 1.1s (`⏱️ 3s` → `⏱️ 3s`); board surgically set one move from solved → ArrowRight → SOLVED overlay → BIGGER PUZZLE → 4×4 game running. Errors: 0/0 both viewports. FPS: 36 desktop / 30 phone (heaviest canvas painter of the batch — every tile re-draws the full scene clipped; still healthy on the phone viewport).

**FIXED: 6 / 6 findings. COULD-NOT-FIX: none.**

---

## Batch totals

| Game | Reference | Findings | Fixed | Could-not-fix |
|------|-----------|----------|-------|---------------|
| 39 Caldera Bounce | Breakout / Arkanoid | 6 | 6 | — |
| 40 Sizzle's Spark Run | Subway Surfers | 7 | 6 | Slide/duck — no duckable obstacle exists; input would be dead (new content, not a repair) |
| 41 Blaze's Inferno Roll | Labyrinth | 8 | 7 | DeviceOrientation tilt — iOS permission flow unverifiable here; drag+keys are the verified equivalent. **Corner-clipping: FIXED** (diagonal sampling, traversal re-verified) |
| 42 Ruko's Speed Trap | Cyclone (arcade) | 5 | 5 | — |
| 43 Boulder's Blockade | Rush Hour | 7 | 7 | — |
| 44 Cinder's Slide | 15-puzzle | 6 | 6 | — |
| **Total** | | **39** | **37** | **2, both with hard reasons above** |

**Global note (not counted per game):** none of the six games has a music track — SFX only, now all mutable. Composing/licensing original loops is a content project, not an audit repair, so no loop was bolted on; the mute complaint (no way to silence the games) is fully fixed for everything the games actually play.

**Brand/safety check:** no art, characters, names, or level layouts were copied from any reference — all cross-reference upgrades are functional mechanics only, expressed in the games' existing Fire Babys style. No Fire Baby is depicted harmed by any change (41's lava change makes the *hazard detection* honest; the ball remains a fireball, and the death flow is unchanged from the overhaul). No new assets, no heavy per-frame effects — the one rendering change *removes* a per-frame cost (`shadowBlur`) in five games.

**Deploy state:** all six `.deploy/fire-world/games/` files are byte-identical to their edited canonical sources (verified with `cmp` after the final edit). Nothing uploaded to GitHub. No other games or shared site files touched.
