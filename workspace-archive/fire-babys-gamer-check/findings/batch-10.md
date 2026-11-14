# Batch 10 — Gamer Check (games 51–55 + 4 Godot exports)

Date: 2026-10-12. Fresh gamer-lens + genre-benchmark pass, post-overhaul.
Method: full source read of all 5 HTML games, Playwright play-tests (desktop 1280×800 + phone 390×844, math gate solved, title→gameplay→game-over→restart paths), targeted physics proofs via in-page state sampling. Served from the local deploy mirror (`python3 -m http.server 8930 --directory ~/workspace/.deploy`).
FPS/load figures are headless-Chromium (SwiftShader software rendering) numbers — useful as *relative* before/after comparisons on identical hardware, not as real-device figures. Loads: all HTML games 0.7–3.4s to `load` event headless (14–21KB files; real-world load is dominated by connection, not the file).
Environment note: two harness "browser crash" incidents during this batch were traced to memory exhaustion from leaked headless-Chromium processes left by earlier timed-out test runs (42 stray processes, 183MB free RAM) — **not** game defects. Cleaned up; all final results below were gathered after cleanup.
Backups of all pre-edit originals: `~/workspace/fire-babys-gamer-check/backups/batch-10/`. BUG-LOG.md checked first: batch-8/9 had already fixed 51 (combo HUD), 52 (pointerup guard), 53 (d=0 normal guard), 54 (peak re-entry, mid-air hop), 55 (bossdown attacks, HP-bar clamp) — all still intact; everything below is *new* to this pass.

**Shared defect found in all 5 HTML games:** no pause, no mute, no in-play restart anywhere (restart existed only on the game-over overlay). Fixed in all 5 with one consistent control set: ⏸ pause (button + `P`/`Esc`, with a PAUSED banner; verified state actually freezes/resumes), 🔊/🔇 mute (button + `M`, gates the games' existing `tone()` helper), ↻ restart (button; restarts the current run/level). Buttons are 46×46px, fixed top-right column, and sit under overlays (z-15 vs overlay z-20) so end-of-run flow is unchanged.

---

## 51 — Volcanic Target (`game-51-v2.html` → `game-51-volcanic-target.html`)

**Cross-reference:** Whac-A-Mole / aim-trainer target-popping (the genre Aim Lab and Whac-A-Mole define). Defining style mechanics: (1) timed pop-up targets with a visible lifetime, (2) combo economy that rewards streaks and resets on mistakes, (3) decoy discrimination under time pressure. **Verdict:** the game already had all three (life rings, combo multiplier, decoys, Magma Bomb from batch 8); it fell short on *feedback and smoothness*, not structure — misses were silent and the timer bar juddered. Upgraded to genre standard below; no expression copied (all mechanics are functional patterns, art/text remain Fire Babys original).

**Complaints found (6):**
1. [Med] No pause / mute / restart (shared defect).
2. [Med] A miss (tap on empty space) silently reset the combo to ×1 — the core punishment of the genre was invisible, reads as "combo randomly disappears."
3. [Low] Time bar updated on a random ~10% of frames (`Math.random()<0.1` throttle) → visibly juddery countdown.
4. [High — perf] Render recreated a full-screen radial gradient every frame and ran `shadowBlur` on 24 ambient embers + every target: headless FPS measured **1.0 (desktop) / 3.7 (phone)** before the fix.
5. [Low] Small targets were 48px diameter — borderline phone tap target.
6. [Low] Target spawn band `H-320` inverts on short viewports (landscape phones), spawning targets over the HUD.

**Fixes applied (6/6):** shared pause/mute/restart; miss now plays a soft `sfx.miss()` and floats a grey "MISS" at the tap point; time bar width written deterministically every frame; background gradient cached per viewport size and ember `shadowBlur` removed → **FPS 23 (desktop) / 30 (phone)** after, same harness; small target radius 24→27px (54px target); spawn band clamped with `Math.max(60, H-320)`. Bonus feel: `cursor:crosshair` on desktop.

**Re-verification:** both viewports — clicked a live non-decoy target via its real coordinates: score 0→30 (15 base × combo 2) both viewports; pause button → `G.state==='pause'`; 0 page errors, 0 console errors.

**FIXED: 6 / 6 findings. COULD-NOT-FIX: none.**

---

## 52 — Lava Rush Arcade (`game-52-v2.html` → `game-52-lava-rush-arcade.html`)

**Cross-reference:** endless runner — Subway Surfers / Temple Run / Chrome Dino. Defining style mechanics: (1) auto-run with instant-response jump/slide dual verbs, (2) speed + spawn-rate ramp against distance, (3) forgiving input (buffering / air control) so deaths feel like the player's fault. **Verdict:** structure was right; *input feel* was below genre standard — jump fired on finger release, a mid-air swipe-down was ignored, and a press just before landing was dropped. Upgraded to standard below.

**Complaints found (8):**
1. [Med] No pause / mute / restart (shared defect).
2. [High — controls] Jump was dispatched on `pointerup` — every tap carried release-lag (~100–200ms) in a game about reaction time.
3. [Med] No jump buffering: pressing jump a frame before landing did nothing.
4. [Med] Swipe-down mid-air was ignored (`doSlide` required grounded): the genre-standard slam-down-into-slide didn't exist, so a lowbar seen while airborne was an unavoidable death.
5. [Med — fairness] Pre-eruption geyser vents killed from 30px above the vent, but the visible vent is ~16px tall — invisible kill zone.
6. [Low] Distance HUD updated via `Math.random()<0.06` throttle → juddery.
7. [Low] Death burst particles froze during the 700ms death delay (update loop stops when dead).
8. [Low — cosmetic] Rock obstacles floated 25px above the ground line (triangle bottom at GY−25).

**Fixes applied (8/8):** shared pause/mute/restart; jump fires on `pointerdown`; 0.13s jump buffer consumed on landing; swipe-down mid-air now slams (vy→1500) and slides on landing; geyser vent kill height 30→14px (matches the visual); deterministic 0.1s HUD cadence; particles/floaters keep animating while dead; rock spawn centre raised so its base rests on the ground. Keyboard (Space/↑ jump, ↓ slide) unchanged and re-verified; ArrowDown now `preventDefault`s.

**Re-verification:** both viewports — 110ms after `pointerdown`, `G.jumping===true` with vy −500/−640 (was: nothing until release); pause→`'pause'`, resume→`'play'`; distance advancing; FPS phone 22→42 headless (desktop noisy across runs, 7→8–19, SwiftShader variance); 0 errors.

**FIXED: 8 / 8 findings. COULD-NOT-FIX: none.**

---

## 53 — Flame Drop Physics (`game-53-v2.html` → `game-53-flame-drop-physics.html`)

**Cross-reference:** plan-then-drop physics puzzler — Peggle-style guided drop crossed with draw-a-ramp puzzlers (Where's My Water? planning structure). Defining style mechanics: (1) plan with limited tools, then release and watch physics resolve, (2) one obvious RELEASE action, (3) fast, cheap retry. **Verdict:** the release action was a hidden double-tap while the instructions literally said "TAP DROP," and a failed plan could soft-lock the game forever — both below genre standard. Upgraded below.

**Complaints found (6):**
1. [Med] No pause / mute / restart-retry (shared defect) — especially costly here: a wasted plan meant reloading the page.
2. [High — clarity] No DROP control existed: dropping required double-tapping the flame (only hinted by small in-canvas text), while the overlay instructions said "**TAP DROP** to release." First-minute quit risk.
3. [Critical] **Soft-lock:** a flame that came to rest on a flat static wall or a flat user ramp never reached any terminal state — not goal, not water, not off-screen. Reproduced in play: flame resting at fy=346 on the Level-1 wall indefinitely. No timeout, no retry.
4. [High] **Wall-top tunnelling** (found while verifying #3): the top-face landing test (`G.fy<wy`) could be crossed entirely in one physics step at high fall speed, so the flame was side-ejected off the wall instead of landing on it — reproduced (fx teleported 640→911 past the wall edge).
5. [Med — feel] Sound spam: `sfx.draw()` fired on *every* `pointermove` while drawing a ramp, and on *every frame* of ramp contact — dozens of overlapping tones.
6. [Low] Wall side-hit push-out was a flat 4px/frame — frame-rate dependent behaviour.

**Fixes applied (6/6):** shared pause/mute/restart (restart = retry current level, toolbar restored); big green ⬇️ DROP button added to the toolbar and single-tap on the flame now drops (in-canvas hint updated to "TAP FLAME / OR ⬇️ DROP"); position-anchor stuck detection — if the dropped flame stays within 8px of an anchor point for 1.6s it resolves to a "🔥 FLAME STUCK!" overlay with TRY AGAIN (anchor method chosen after a speed-based timer proved unreliable against resting micro-bounce); tunnel-proof wall landing using the pre-step centre (`prevFy<=wy+2`); draw SFX throttled to every 26px of pointer travel and ramp-contact SFX only on impacts >140px/s (wall impact threshold 40→160); side-hit push-out is now positional (to the wall face), not per-frame.

**Re-verification:** desktop trace after fixes — flame falls, lands on the Level-1 wall top (fy=346 = wall top − radius), anchor timer accumulates 0.43→1.62s, **"🔥 FLAME STUCK!" overlay fires**; DROP button present and functional on both viewports; restart button returns to a fresh un-dropped level (`dropped:false, done:false`); earlier goal-path play (phone, baseline) still solves Level 1 via a drawn ramp; 0 errors.

**FIXED: 6 / 6 findings. COULD-NOT-FIX: none.**
(Checked and deliberately left: score formula 200 − 20/tool is the genre-standard efficiency bonus, not a defect; water hitbox uses the same `r*W` formula as its rendering, so hitbox and visual always agree.)

---

## 54 — Blaze's Zenith (`game-54-v2.html` → `game-54-blazes-zenith.html`)

**Cross-reference:** vertical climber — Doodle Jump / Icy Tower. Defining style mechanics: (1) a jump that *comfortably* clears the platform spacing, with platforms always within reach, (2) airborne steering (the genre's core skill), (3) camera that chases upward + crumbling/moving platform variety. **Verdict:** this game did **not** deliver its genre — measured play showed height permanently stuck at 0m. It was the least playable game in the batch. Four separate defects stacked to cause that; all fixed below.

**Complaints found (9):**
1. [Critical] **Impossible hops:** hop velocity −640 with gravity 1700 gives a 120px apex, but platform gaps are 134–182px. Most platforms were physically unreachable; automated play on both viewports never gained a single metre.
2. [High] **No mid-air steering:** one fixed-impulse diagonal hop per tap. Traced in play: a hop overshot a 108px platform by ~90px with no way to correct.
3. [High] **Platform sideways step scaled with screen width** (±0.25·W per step = ±320px on desktop) while hop physics are absolute pixels — on wide screens platforms routinely sat beyond maximum hop range (~210px). Phone was less affected, which is why this survived earlier phone-shaped testing.
4. [Med-High] **Landing tunnelling:** landing used a 22px position window; at low frame rates or high fall speeds a step could jump clean over the window (traced: py 502→558 across a band ending at 553, no landing).
5. [Med — balance] Crumble platforms gave 0.35s before vanishing — too harsh for the kid audience (genre standard ≈0.6s+).
6. [Med] No pause / mute / restart (shared defect).
7. [Low] Stars placed on *moving* platforms didn't move with them — collectibles hung in mid-air where the platform used to be.
8. [Low — feel] Landing had no feedback (no dust, no impact cue).
9. [Cosmetic] Dead code: a no-op flag-check line and an unused `flagScreenY` variable.

**Fixes applied (9/9):** hop velocity −640→−815 (measured apex 181–182px vs new max gap 166px after capping the gap randomiser at ×1.05); **hold-to-steer** — holding a screen side (or ◀ ▶ key) steers mid-air (accel 1300, clamp ±350), dragging across the midline re-aims, releasing bleeds velocity via the existing damping; base hop impulse softened 330→260 so steering does the work; instructions updated ("HOLD a side to steer mid-air!"); sideways platform step capped at ±290px (inside one steered hop's ~350px range on every screen size); **swept landing** test (previous-frame position vs platform top — cannot tunnel at any frame rate); crumble time 0.35→0.65s (fade alpha rescaled to match); stars now ride their moving platforms (stored offset); landing dust burst on falls >260px/s; dead code removed; shared pause/mute/restart.

**Re-verification:** hop apex measured in-page at 181px (desktop) / 182px (phone) > 166px max gap; single-hop flight trace: held steering pins vx at the clamp, player travels 640→370px and **lands on the target platform** (grounded, py = platform top − 6); multi-hop bot play (crude 90ms-latency bang-bang steering): 2 guided hops survived on desktop, 4 on phone before dying — versus *zero* hops and instant death on every pre-fix run. Residual bot deaths are bot-quality (full-clamp flip-flopping at 90ms latency), not reachability: every individual mechanic the bot used is proven above. 0 page errors throughout.

**FIXED: 9 / 9 findings. COULD-NOT-FIX: none.**

---

## 55 — Ruko's Final Dash (`game-55-v2.html` → `game-55-rukos-final-dash.html`)

**Cross-reference:** timing boss battler — Punch-Out!! (dodge telegraphed attacks, counter only during the vulnerability window). Defining style mechanics: (1) clear boss telegraphs, (2) a signalled "open" window for counters, (3) fair punishment — one mistake costs one unit of health, never everything. **Verdict:** telegraphs and the open-window (green ⚡ ring, "ATTACK NOW!") were already genre-correct; fairness rule (3) was violated by stacked explosions, and a mistimed dash explained nothing. Upgraded below.

**Complaints found (3):**
1. [High — fairness] **No invincibility frames:** later bosses launch up to 3 fireballs aimed at the player's position with identical flight times; simultaneous explosions each called `hurt()` — a full 3-heart life could be deleted in a single tick by one boss volley.
2. [Med] No pause / mute / restart (shared defect).
3. [Med — clarity] Dashing while the boss wasn't open (or from too far away) produced a silent empty dash — no indication of *why* no damage happened, in a game whose entire lesson is timing.

**Fixes applied (3/3):** 1s of invincibility frames after any hit (`G.invT`, decremented in update, reset in `reset()`), with the player flickering while invincible so the protection is visible; shared pause/mute/restart; whiff feedback — a dashed miss now floats "WAIT FOR ⚡ RING!" (boss closed) or "TOO FAR!" (open but out of range) over the player with the existing dodge sound.

**Re-verification:** both viewports, in-page proof: `hurt()` ×3 in one tick → lives 3→2→**2** (stacked calls blocked, `invT=1`); boss HP bar still drains under dash attacks (baseline: to 25%/62.5% during blind play); pause → `'pause'`; 0 errors.

**FIXED: 3 / 3 findings. COULD-NOT-FIX: none.**

---

## Godot exports (TEST-ONLY — no changes made or possible)

Hard reason for test-only status: these are compiled Godot web exports; there is no editable source for them in this workspace, so no finding below can be fixed from here regardless of severity. All four were loaded on desktop 1280×800 and phone 390×844, left to boot ~9s, and poked with clicks, taps, Space and arrow keys.

| Export | Load (desk/phone) | Canvas | Page/console errors | Headless FPS (desk/phone) |
|---|---|---|---|---|
| rukos-panic-dash | 1764 / 1609 ms | 1, visible, full-size | none | 5.5 / 19.5 |
| slingshot-cascade | 1654 / 1433 ms | 1, visible, full-size | none | 9.5 / 31.5 |
| trinitys-holy-lightning-rescue | 1354 / 1021 ms | 1, visible, full-size | none | 10.5 / 47 |
| tristans-dark-knight-rescue | 1098 / 1213 ms | 1, visible, full-size | none | 14 / 38.5 |

FPS caveat for all four: these are SwiftShader software-render numbers and invert reality (the *larger* desktop canvas renders slower in software); they say nothing reliable about real-device performance and are recorded only so a future hardware run can be compared like-for-like.

**rukos-panic-dash** — *Cross-reference:* endless runner (Subway Surfers style: auto-run, dodge, distance survival). Boot/input verdict: engine boots clean, canvas live, inputs accepted with zero errors on both viewports. Gamer complaints: none reproducible headless. **Findings: 1 observation (boots clean), 0 defects. FIXED: n/a — COULD-NOT-FIX: any change would require the Godot project source; compiled export only (hard reason, applies to all four exports).**

**slingshot-cascade** — *Cross-reference:* slingshot physics puzzler (Angry Birds-style *functional pattern* — pull, launch, topple towers; its art, characters and assets here are Fire Babys originals: Blaze, crystal towers, volcano backdrop). Boot/input verdict: clean on both viewports; this one ships a readable JS wrapper (`main.js`, Matter.js) around the canvas but the deliverable in scope is still the compiled export — not edited. Gamer complaints: none reproducible headless. **Findings: 1 observation, 0 defects. FIXED: n/a — COULD-NOT-FIX: compiled export, no source (hard reason).**

**trinitys-holy-lightning-rescue** — *Cross-reference:* rescue action-puzzler (guide/aim a rescuer to trapped characters against hazards — the "rescue mission" structure). Boot/input verdict: clean on both viewports, zero errors. Gamer complaints: none reproducible headless. **Findings: 1 observation, 0 defects. FIXED: n/a — COULD-NOT-FIX: compiled export, no source (hard reason).**

**tristans-dark-knight-rescue** — *Cross-reference:* rescue action-puzzler (same rescue-mission structure as Trinity's, knight-rescue framing). Boot/input verdict: clean on both viewports, zero errors. Gamer complaints: none reproducible headless. **Findings: 1 observation, 0 defects. FIXED: n/a — COULD-NOT-FIX: compiled export, no source (hard reason).**

Scoped honestly: headless poking verifies boot, rendering surface, error-freedom and that inputs don't crash the exports. It cannot verify win/lose reachability or level balance inside a compiled Godot build; no such claim is made.

---

## FIXED vs COULD-NOT-FIX — batch totals

| Game/export | Findings | Fixed | Could-not-fix |
|---|---|---|---|
| 51 Volcanic Target | 6 | 6 | — |
| 52 Lava Rush Arcade | 8 | 8 | — |
| 53 Flame Drop Physics | 6 | 6 | — |
| 54 Blaze's Zenith | 9 | 9 | — |
| 55 Ruko's Final Dash | 3 | 3 | — |
| **HTML subtotal** | **32** | **32** | **0** |
| rukos-panic-dash (Godot) | 1 observation, 0 defects | n/a | Any change: compiled export, no source in workspace (hard reason) |
| slingshot-cascade (Godot) | 1 observation, 0 defects | n/a | Same hard reason |
| trinitys-holy-lightning-rescue (Godot) | 1 observation, 0 defects | n/a | Same hard reason |
| tristans-dark-knight-rescue (Godot) | 1 observation, 0 defects | n/a | Same hard reason |

Every fix above was re-played after application (both viewports where relevant); a fix that was not re-verified is not counted. All 5 source/deploy pairs are byte-identical (`cmp` verified after the final edit). No other games, `play.html`, `3d.html`, or shared site files were touched. Nothing was uploaded to GitHub.
