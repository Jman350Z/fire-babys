# Bug Log — Fire Babys Overhaul (2026-10-12 baseline sweep, harness runs=1, local mirror of .deploy)

## Baseline findings (before any fixes)
- **game-02-blaze-runner** — PAGE ERROR (High): `Failed to execute 'createRadialGradient' on 'CanvasRenderingContext2D': 6 arguments required, but only 5 present` — thrown during gameplay.
- **game-32-cinders-glide** — PAGE ERROR (High): `Cannot read properties of undefined (reading 'length')` — thrown during gameplay.
- **SPLASH (play.html)** — PAGE ERRORS (High, investigate carefully): `drawBabyEyes is not defined`, `UNIT_DEFS is not defined`, `tryPlace is not defined` (Patch-016 pattern: called but never defined in deployed build); plus CSP inline-script violation notice. Root cause TBD via build sources — do NOT hand-edit .deploy/play.html.
- **3d.html** — 2 console errors are environmental artifacts of local testing (Cloudflare beacon CSP, SSL to localhost) — NOT game bugs.
- All other 55 entries: loaded, 0 console errors, 0 page errors, canvas visible.
- Note: harness plays ~10s with random inputs; "game over not seen" is normal for survival games and is not counted as a bug.

## 3D game (fixed 2026-10-12, batch 3D)
- **High — `FB_WEAPONS` declared twice:** Vault/Armory damage-multiplier system (6 weapons) and Store system (12 shop weapons) shared the name; Store array overwrote Vault's at runtime. Vault lookups always missed, `__fbWeaponMult()` always returned 1 (advertised 2.5x starter damage never applied), no Vault weapon unlockable, panels iterated wrong schema. FIX: renamed Store array to `FB_STORE_WEAPONS` (definition, `weaponById()`, `fbStoreItems`). Verified in Node with the game's own code; no other duplicated top-level vars. Pre-deploy check PASSED pre/post. Detail: batches/3d-report.md

## Batch 4 (games 22–27) — 17 found, 16 fixed, 1 cosmetic noted
- **22 Magma Block Breaker (2/2):** combo decayed every frame (combo collapsed to x1 instantly); ice blocks never removed (repeated taps farmed −30 penalty).
- **23 Crater Catcher (2/2):** same combo-decay bug; falling items drifted off-screen sideways uncatchable — now bounce at edges.
- **24 Ash Storm Survivor (4 found/3 fixed + 1 cosmetic noted):** shot-killed enemies could still damage player for a frame; tank HP bar used current HP instead of spawn maxHp; drag-steering speed tied to pointer-event rate — now update()-driven.
- **25 Lava Line Draw (3/3):** High — `G.rollT` stuck-timer never reset in initLevel (20s accumulated across levels/retries, failing later levels early); canvas GO button overlapped DOM Clear button (taps swallowed); win particles never updated (update() early return).
- **26 Pyra Paddle Battle (5/5):** Critical — paddle collision conditions mutually exclusive on viewports >~1100px (paddle NEVER collided on desktop); fixed with proper x-overlap + anti-tunneling. Also difficulty default/UI mismatch, serve-pause particle freeze, frame-rate-dependent spin decay, dead var.
- **27 Ember Bounce 2D (1/1):** High — uncapped fall speed tunneled through platforms; capped 1500px/s + swept foot test.
- Detail: batches/batch-4-report.md

## Batch 9 (game-02, 52–55) — 9 found, 9 fixed
- **02 Blaze Runner (3/3):** High — `createRadialGradient(x,y-r*0.3,x,y,r*1.6)` missing inner radius → fixed `createRadialGradient(x,y-r*0.3,r*0.2,x,y,r*1.6)`. High (hidden behind the first throw) — all 4 eye/pupil `ctx.arc()` calls in fireBaby() had 3 of 5 required args; fixed. Low — gameOver() re-entry guard.
- **52 Lava Rush Arcade (1/1):** Low — unguarded `G._sy` in pointerup; guard added.
- **53 Flame Drop Physics (1/1):** Low — ramp-collision normal divided by d with no d=0 guard → NaN soft-lock; safe fallback normal.
- **54 Blaze's Zenith (2/2):** Medium — peakDone() re-entered every frame ~500ms (+150 pts/frame, stacked overlays) → G.won guard. Medium — hop() worked mid-air = infinite flight → grounded-only hopping.
- **55 Ruko's Final Dash (2/2):** Low — defeated boss kept attacking during victory delay (bossdown now short-circuits); boss HP bar negative-width clamp. Weapon added: Ember Combo Charm.
- Detail: batches/batch-9-report.md

## Batch 3 (games 16–21) — 18 found, 18 fixed
- **16 Inferno Drop (3/3):** duplicate `time` key in G literal (0s countdown + overloaded anim clock); combo collapsed instantly per-frame; hole radius `Math.min(gw,gw)`. Weapon: Golden Mallet.
- **17 Flame Sprint 2D (5/5):** Critical — camera sign inverted (tower went off-screen past ~12 blocks, verified by simulation); camera counted falling debris; missed blocks vanished instead of falling; camera-blind culling bounds; dead code.
- **18 Blaze's Thermal Run (2/2):** win double-counted during overlay delay (no state lock); game-over never stopped play/dragging.
- **19 Ruko's Lava Leap (3/3):** ceiling-drop unshift flipped hex-row parity (bubble hanging off-board); no lose-check after normal stick; falling bubbles animated in render with hard-coded 60fps step. Weapon: Ember Bomb.
- **20 Boulder's Fortress (2/2):** BRAND-RULE VIOLATION — hero drawn with a wing (forbidden); replaced with flickering flame tuft. Frame-rate-dependent death-flash decay moved to dt.
- **21 Sizzle's Target Pop (3/3):** Critical — piece targets re-shuffled after creation, jigsaw could NEVER assemble its picture; completion didn't freeze timer; per-frame timer DOM writes.
- Detail: batches/batch-3-report.md

## Batch 2 (games 10–15) — 17 found, 17 fixed
- **10 Caldera Climb (4/4):** High — line-blast specials could almost never trigger (findMatches excludes specials); High — color-bomb left input live over null cells (crash race); Medium — score floaters in window coords vs board-coords render (invisible on desktop); Medium — score wiped every level. Weapon: 🌟 Ember Nova.
- **11 Magma Trench Dodge (2/2):** High — pointerup jump-cut `vy *= -0.4` sign flip slammed player down on tap release; Low — quick tap-release lost jump cut.
- **12 Volcanic Pinball (4/4):** Critical — flippers could NEVER activate (layout() returned throwaway objects; setFlip state discarded; also killed bumper flash); Medium — slingshots re-scored every frame, no cooldown; Low — dead flipperTip() removed. Weapon: 🌟 Nova Bumper + 🛡️ Ember Shield.
- **13 Pyra Prime Defense (2/2):** Medium — Slow-Mo instantly cancelled by ball min-speed clamp (now 8s timer lowering clamp); Medium — Sticky leaked a setTimeout across levels (now ticked timer). Weapon: 💥 Nova Burst.
- **14 Sparky Speedway (2/2):** Medium — previous run's golden crystal + particles leaked into new run (reset() never cleared); Low — food/golden could stack on one cell.
- **15 Cinder's Melt Down (3/3):** Medium — score wiped every level; Low — final screen hard-coded 3 stars; Low — flip animation frame-rate dependent (now dt-scaled).
- Detail: batches/batch-2-report.md

## Batch 6 (games 34–39) — 14 found, 11 fixed, 3 Low noted
- **34 Spark Jump Arcade (2/1):** Medium — no pointercancel handler left jump charge stuck at max with stale jump. 1 Low noted.
- **35 Lava Moat Defense (3/3):** Medium — reset() never cleared spawnQ (queued enemies leaked into restarts); Medium — every tower within 170px of a kill got kill credit/levels instead of only the shooter; Low — NaN position poison at distance 0. Weapon: 🔆 Ember Nova Blast.
- **36 Magma Drop Physics (2/1):** Medium — particles/score popups froze mid-air when no ball in flight (early return in update()). 1 Low dead-markup noted.
- **37 Volcanic Stack Smash (2/1):** Medium — camera "smoothing" `camY += (target - camY)` was an instant snap; now true 0.25 lerp. 1 Low noted.
- **38 Fire Baby Rally (3/3):** Medium — grass slowdown Math.max(80,…) made stopped off-track car creep on its own; Medium — gas stuck on when finger slid off canvas; Low — title screen showed bare grass, no track.
- **39 Caldera Bounce (2/2):** Critical — showLevels() hid overlay button with display='none' and nothing restored it: NEXT LEVEL and TRY AGAIN stayed invisible forever, soft-locking the game after Level 1. Low — keyboard steered/launched on title & game-over screens. Weapon: 💥 Blast Ball.
- Detail: batches/batch-6-report.md

## Batch 8 (games 46–51) — 13 found, 13 fixed
- **46 Magma Jump 2D (6/6):** root cause — update() added camY where renderer subtracts it. High — stars uncollectable once camera moved (wrong collision frame); High — lava killed from wrong position / visible patches harmless. Medium — rows spawned near start instead of ahead; star/lava arrays never culled. Low — burst particles wrong Y.
- **47 Pyra Prime Dash (1/1):** Low, latent — unguarded Math.min(...[]) = Infinity in gate refill.
- **48 Ash Heap Hero (3/3):** Medium — drag zoom scaled before translate (items rendered at 1.25x position, away from finger). Low — duplicate `time` key; fall-speed ramp ran backwards (used countdown timer).
- **49 Thermal Track (1/1):** Medium — levelComplete() never set state; tracing during 500ms overlay delay re-triggered it, farming score.
- **50 Ember Bounce Master (1/1):** Low — Level 1 layout row 9 chars in a 10-col grid. Weapon: 🔥 Ember Splitter.
- **51 Volcanic Target (1/1):** Low — combo HUD pill went stale on combo expiry. Weapon: 💣 Magma Bomb.
- Detail: batches/batch-8-report.md

## Batch 1 (games 04–09) — 21 found, 21 fixed (incl. 1 guard), 2 cosmetic dead-sfx noted
- **04 Cinder's Ice Rink Chaos (4/4):** parental-gate bypass via level buttons; missing pointercancel left a block held forever; d=0 NaN-velocity guard. +1 dead sfx noted. Weapon: Ember Bomb Block.
- **05 Lord Inferno's Ballista Siege (3/3):** Critical — boss-wave soft-lock (branch order made spawnBoss() unreachable on wave 3; level could never be completed). High — cumulative score wiped between levels by reset(). Weapon: Ember Nova.
- **06 Blaze's Magma Bounce (3/3):** spawnText ignored its size arg; missing pointercancel froze Blaze; dead var. Weapon: Magma Surge.
- **07 Ruko's Turbo Drift (3/3):** held-key auto-repeat phantom hits (Medium); empty-beatmap soft-lock guard; 1 dead sfx noted. Non-combat (rhythm).
- **08 Sizzle's Spark Jump (5/5):** High — crumble platforms never removed (always-true filter + never-set touched flag); platform tunneling at high fall speeds (swept collision now); empty-array Math.min(...)=Infinity loop hazard. Non-combat (jumper).
- **09 Ember Cascade (3/3):** High — cannon splash created zombie enemies (splash never ran death check; shared killCheck() now covers direct/splash/chain). Weapon: Storm tower. (Worker transparency note: its own first edit pass introduced a defect in game 09, caught on diff review, repaired and re-verified before staging — see report.)
- Detail: batches/batch-1-report.md

## SPLASH (play.html) — CRITICAL, fixed via build 2026-10-12
- **Root cause:** kid-safe wording edits (BURN→CAPTURE in block 0, BAD ASS→BLAZE ON patch 012, CATCH→SPLASH patch 025) were hand-applied to the deployed play.html AFTER the last build. Result: 3 of 26 inline script blocks no longer matched their CSP sha256 hashes, so browsers refused to execute them — including the entire core game. SPLASH was completely unplayable (no Game object, no title, no troop buttons); unguarded patches then threw "drawBabyEyes/UNIT_DEFS/tryPlace is not defined" (4 page errors). The three symbols were never missing — they were in the blocked block 0. frame-ancestors notice = cosmetic; auth-gate.js SSL error = pre-existing localhost artifact, untouched.
- **Fix (through the established build only):** exact 10 deployed strings ported back into sources; baseline re-frozen via build.py's documented --allow-baseline-change path; fingerprint updated; rebuilt. Rebuilt file is byte-identical to previously deployed file except the CSP meta line (3 hashes corrected) — zero game-code change. verify-patches.js: ALL RUNTIME CHECKS PASSED. Harness: page_error_count 4→0, game boots (Game.phase='deploy'), tryPlace places units with 0 errors. Deployed play.html sha256 8eb51db4…; plain build.py run reproduces it exactly.
- Detail: batches/splash-report.md

## Batch 7 (games 40–45) — 17 found, 16 fixed, 1 Low noted by design
- **40 Sizzle's Spark Run (3/3):** Critical pair — obstacle collision used fixed ground line, ignored obstacle's falling y (any same-lane spawn = instant death); obstacles drawn at ground instead of travelling down track. Low — moveLane() state guard.
- **41 Blaze's Inferno Roll (3/2):** High — mazes 4, 5, 6 unbeatable (BFS proved goal + required star sealed off); opened 1 wall in maze 4, 1 in maze 5, 2 chokepoints in maze 6; all 6 re-verified reachable. Medium — wall-bump SFX spam (impact-speed threshold). Low corner-clipping noted, left by design.
- **42 Ruko's Speed Trap (2/2):** no keyboard input — tap logic extracted to doTap(), Space/Enter works; dead sfx.tick() wired in.
- **43 Boulder's Blockade (5/5):** High x3 — Levels 1 & 3 started already solved; Level 7 block off-board; Level 8 block off-board; BFS confirms all 8 levels in-bounds, non-overlapping, not pre-solved, solvable. Medium — fast drags leapfrogged blockers (cell-by-cell drag). Low — state mutation moved out of render().
- **44 Cinder's Slide (3/3):** Fire Baby in tile picture fixed 24px at any board size (now scales + glow); shuffle could deal already-solved board (now nudged until unsolved); dead var removed.
- **45 Lord Inferno's Strike (1/1):** Low — slain enemies drawn one extra frame. Weapon: 🔆 Inferno Nova.
- Detail: batches/batch-7-report.md

## Batch 5 (games 28–33) — 14 found, 12 fixed, 2 Low documented
- **28 Thermal Tug-of-War (2/1):** default difficulty mismatch (Easy pre-selected in UI but G.diff=1 Medium). 1 Low dead code documented. Weapon: ⚓ Ember Anchor.
- **29 Blaze's Jump Quest (2/2):** High — soft-lock: showLevels() hid PLAY button (display='none'), showOverlay() never restored it (every death/level-clear overlay after level select had no button). Medium — score farming on retry (level-start snapshot). Weapon: 🔥 Ember Blaster.
- **30 Ruko's Dash Blitz (2/2):** Medium — coin +10 overwritten every frame by score=floor(dist) (persistent G.bonus now); Medium — swipe-down slide eaten by tap-jump (slam-down + queued slide).
- **31 Boulder's Rampart (3/3):** Medium — cannon splash kills never credited, ≤0-HP zombie enemies (unified killEnemy()). Low — fractional gold in HUD; wave counter off by one. Weapon: 🔥 Ember Tower.
- **32 Cinder's Glide (3/3) — KNOWN BUG FIXED WITH PROOF:** render() read `G.terr.length` but G.terr only existed after reset(); render loop runs from page load in title state → throw. Fix: `terr:[]` in G literal + guards. Untouched .orig backup re-run reproduced the baseline error exactly; fixed build: 0/0. Also: gem +25 erased per-frame; stuck `holding` on off-canvas pointer release.
- **33 Inferno Aim (2/1):** Medium — duplicate `time` key in G literal (time:60 shadowed by time:0). 1 Low dead no-op documented. Weapon: 💥 Nova Star.
- Detail: batches/batch-5-report.md
