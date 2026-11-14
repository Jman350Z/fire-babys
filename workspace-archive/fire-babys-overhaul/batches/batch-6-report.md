# Batch 6 Report — Games 34–39 (Fire Babys Overhaul, 2026-10-12)

All six games: backups saved to `~/workspace/fire-babys-overhaul/backups/game-NN-v2.html.orig` before editing; every `<script>` block passes `node --check` before and after edits; call-site vs definition sweep found no undefined functions in any game; edited sources copied over deploy copies (verified byte-identical); harness re-run on local URLs — **all PASS** (loaded=true, console_error_count=0, page_error_count=0, no gameplay issues).

Shared graphics upgrade applied to all six: a living background of ~24 rising ember/spark particles behind gameplay (additive `lighter` glow, positions derived from `G.time` so they cost no per-frame state), richer gradient backdrop where the game used a flat fill, and `ctx.shadowBlur` glow halos on the hero/player/projectiles in each game's own colors. Art rules respected: spherical flame bodies, bold look unchanged, no beaks/wings/feathers, no Fire Baby ever depicted harmed.

---

## Game 34 — Spark Jump Arcade (`game-34-v2.html` → `game-34-spark-jump-arcade.html`)

**Bugs found (1 fixed, 1 noted):**
- **Medium — stuck charge on pointer-cancel:** `pointerdown` set `G.charging=true`, but there was no `pointercancel` handler. A cancelled/interrupted touch left charging stuck at max and a stale jump fired on the next `pointerup`.
- **Low (noted, not changed) — framerate-coupled floaters:** score floaters advance by a fixed `0.016` inside `render()` instead of real `dt`. Cosmetic only.

**Bugs fixed:** Added a `pointercancel` handler that clears `G.charging` and `G.charge`.

**Graphics upgrade:** 24 rising ember motes behind the platforms (additive glow); orange `shadowBlur` halo on the Fire Baby player sprite. (Background already had a score-reactive gradient — kept.)

**Weapon:** None — *no weapons — non-combat design* (pure timing platform jumper; no attack/target/break/defense mechanic).

**Final harness result:** loaded=true, console errors 0, page errors 0 — **PASS**
**Staged:** Yes

---

## Game 35 — Lava Moat Defense (`game-35-v2.html` → `game-35-lava-moat-defense.html`)

**Bugs found (3, all fixed):**
- **Medium — restart leaked the spawn queue:** `reset()` cleared towers/enemies/shots but never `G.spawnQ` (or `G.shake`), so enemies still queued from the previous run spawned into the fresh game after a restart.
- **Medium — every nearby tower got kill credit:** on a kill, the code looped over *all* towers within 170px of the dead enemy and incremented `t.kills` on each, levelling up towers that never fired (tower damage scales with kills, so this inflated the whole defense).
- **Low — NaN position poison:** enemy march divided by distance-to-center with no zero guard; an enemy landing exactly on the center would get `NaN` coordinates and become an invisible, unkillable ghost.

**Bugs fixed:** `reset()` now clears `spawnQ`, `shake`, and the new Nova meter. Shots now record their source tower (`src`) and only the shooter gains a kill. Enemy movement is skipped when distance ≤ 0.01.

**Graphics upgrade:** Flat `#0d0a08` background replaced with a 3-stop warm gradient; 24 rising embers behind the arena; `shadowBlur` glow on tower flame heads and on all tower shots (projectiles).

**Weapon added — 🔆 Ember Nova Blast:** Every 12 tower kills charges the Nova (counter shown at the bottom of the screen; "NOVA READY" banner when full). Tap the castle or press **Space / N** to detonate: **45 damage to every enemy within 230px of the castle**, with boom SFX via the existing `noise()`-based `sfx.boom()` plus a `tone()` riser, screen shake, and burst particles. Balanced: a base tower shot is 11 dmg and the Nova is kill-gated (12 kills per charge) and area-limited, so it's a finisher, not an always-on upgrade. Documented in the start overlay help text.

**Final harness result:** loaded=true, console errors 0, page errors 0 — **PASS**
**Staged:** Yes

---

## Game 36 — Magma Drop Physics (`game-36-v2.html` → `game-36-magma-drop-physics.html`)

**Bugs found (1 fixed, 1 noted):**
- **Medium — particles and score popups froze with no ball in flight:** particle/floater updates sat at the *end* of `update()`, after the `if(!ball) return;` early exit — so the burst and "+points" text from a scored ball froze mid-air until the next ball was dropped.
- **Low (noted) — dead level-select markup:** the overlay contains an empty `#lvlSel` element that no code ever populates. Harmless; left in place.

**Bugs fixed:** Particle and floater ticks moved to the top of `update()` so they always advance; the duplicated trailing update block was removed (no double-speed particles).

**Graphics upgrade:** 24 rising embers behind the peg board (additive glow); orange `shadowBlur` halo on the magma ball. (Background already a gradient — enriched by the ember layer.)

**Weapon:** None — *no weapons — non-combat design* (pachinko physics/chance puzzle; dropping a ball into multiplier slots is not an attack mechanic).

**Final harness result:** loaded=true, console errors 0, page errors 0 — **PASS**
**Staged:** Yes

---

## Game 37 — Volcanic Stack Smash (`game-37-v2.html` → `game-37-volcanic-stack-smash.html`)

**Bugs found (1 fixed, 1 noted):**
- **Medium — camera "smoothing" was an instant snap:** `G.camY += (targetY - G.camY)` is algebraically just `G.camY = targetY`, so the view teleported on every landed block instead of panning.
- **Low (noted, not changed) — debris freezes on death:** the main loop stops calling `update()` once `G.dead` is set, so the toppled block's debris hangs frozen for the ~700ms before the game-over overlay. Cosmetic only.

**Bugs fixed:** Camera now lerps with a 0.25 factor per frame for a smooth pan (all block/spawn math is in world coordinates, so gameplay is unaffected).

**Graphics upgrade:** 24 rising embers behind the tower in screen space (additive glow); hue-matched `shadowBlur` glow on the active swinging block so the piece you're about to drop reads as "live." (Background already a gradient.)

**Weapon:** None — *no weapons — non-combat design* (timing/stacking puzzle; the "smash" is trimming overhang, not combat).

**Final harness result:** loaded=true, console errors 0, page errors 0 — **PASS**
**Staged:** Yes

---

## Game 38 — Fire Baby Rally (`game-38-v2.html` → `game-38-fire-baby-rally.html`)

**Bugs found (3, all fixed):**
- **Medium — a stopped car off-track could never stop:** the grass slowdown was `G.v = Math.max(80, G.v - 300*dt)` — the `Math.max(80, …)` floor *forced* any slower car back up to speed 80, so the car crept forward on its own whenever it was off the track, even with no gas input.
- **Medium — gas stuck on:** gas is set by canvas `pointerdown` and cleared on `pointerup`/`pointercancel`, but sliding a finger off the canvas fires neither on the canvas — the car kept accelerating with no touch held.
- **Low — bare title backdrop:** `TRACK` was empty until the first `reset()`, so the title screen rendered plain grass with no track behind the overlay.

**Bugs fixed:** Grass drag now only applies while speed > 80 (`if(offTrack && v>80) v = max(80, v-300*dt)`). Added canvas `pointerleave` and a window-level `pointerup` that both clear gas. `TRACK` is now built once at load so the title shows the circuit.

**Graphics upgrade:** 24 drifting sparks over the grass (additive glow); `shadowBlur` glow on the car body — orange normally, blue and stronger while a boost pad boost is active. (Grass already a gradient.)

**Weapon:** None — *no weapons — non-combat design* (pure time-trial racer; boost pads are speed, not attacks).

**Final harness result:** loaded=true, console errors 0, page errors 0 — **PASS**
**Staged:** Yes

---

## Game 39 — Caldera Bounce (`game-39-v2.html` → `game-39-caldera-bounce.html`)

**Bugs found (2, both fixed — one critical):**
- **CRITICAL — invisible button soft-lock after the level picker:** `showLevels()` sets `obtn.style.display='none'` and nothing ever restored it. Every later overlay went through `showOverlay()`, which set the button's text but not its display — so the **NEXT LEVEL button after clearing Level 1, and the TRY AGAIN button on game over, were permanently invisible**, soft-locking the game with no way to continue or restart.
- **Low — keyboard input ignored game state:** Arrow keys steered the paddle and Space "launched" the ball even on the title and game-over screens (the launch flag then carried odd state into the next run).

**Bugs fixed:** `showOverlay()` now always restores `obtn.style.display=''`. The keydown handler returns immediately unless `G.state==='play'`. (Also hardened: `resetBall()` clears stale falling pickups, and `initLevel()` resets the Blast timer/counter.)

**Graphics upgrade:** 24 rising embers behind the brick field (additive glow); `shadowBlur` halo on the ball — amber normally, larger and hot-red while Blast Ball is active; glowing pickup orbs. (Background already a gradient.)

**Weapon added — 💥 Blast Ball:** Every **6th brick fully broken** drops a glowing 💥 pickup that drifts down; catch it with the paddle (also +25 pts) for **6 seconds of Blast Ball: the ball deals 2 brick damage per hit instead of 1**, one-hitting the tough 2-HP bricks. Power SFX through the existing `tone()` helper (`sfx.power()`). Time-limited and drop-gated, so it speeds up tough-brick sections without raising the ball's base power. On-screen countdown banner while active, and documented in the start overlay help text.

**Final harness result:** loaded=true, console errors 0, page errors 0 — **PASS**
**Staged:** Yes

---

## Summary

| Game | Bugs found | Bugs fixed | Weapon | Harness |
|------|-----------|------------|--------|---------|
| 34 Spark Jump Arcade | 2 (1M, 1L noted) | 1 | — non-combat | PASS |
| 35 Lava Moat Defense | 3 (2M, 1L) | 3 | 🔆 Ember Nova Blast | PASS |
| 36 Magma Drop Physics | 2 (1M, 1L noted) | 1 | — non-combat | PASS |
| 37 Volcanic Stack Smash | 2 (1M, 1L noted) | 1 | — non-combat | PASS |
| 38 Fire Baby Rally | 3 (2M, 1L) | 3 | — non-combat | PASS |
| 39 Caldera Bounce | 2 (1 Critical, 1L) | 2 | 💥 Blast Ball | PASS |

No game was blocked; no backups needed restoring. All six edited files are staged in `~/workspace/.deploy/fire-world/games/` and byte-identical to their sources in `~/workspace/fire-babys-fireworld/`.
