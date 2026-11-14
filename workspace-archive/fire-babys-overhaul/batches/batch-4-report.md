# Batch 4 Report — Games 22–27 (2026-10-12)

Method per game: backup to `~/workspace/fire-babys-overhaul/backups/game-NN-v2.html.orig` → full code read → `node --check` on the extracted `<script>` block (all passed pre- and post-edit) → call-site vs definition grep (no undefined bare-function calls in any of the six; all sfx/helper methods referenced exist) → surgical fixes → graphics upgrade → weapon/power-up where the design has a combat/target mechanic → staged source over deploy copy (md5-verified identical) → harness re-test at `http://localhost:8901/fire-world/games/<deploy>.html`, runs=1, proxy vars stripped.

All six final harness results: **loaded=true, console_error_count=0, page_error_count=0 — PASS.**

Shared graphics upgrade (all six): animated living background of ~24 rising ember particles (additive `lighter` composite, orange/gold glow, cheap deterministic canvas arcs) layered behind gameplay, plus `ctx.shadowBlur` halo glow in the hero color on the player character / projectiles / key objects as noted per game. No redesign, no beaks/wings/feathers, no Fire Baby depicted harmed.

---

## Game 22 — Magma Block Breaker (`game-22-v2.html` → `game-22-magma-block-breaker.html`)

**Bugs found (2)**
1. **Medium — Combo decay collapsed instantly.** `G.comboT-=dt; if(G.comboT<=0) G.combo=Math.max(1,G.combo-1);` ran every frame with `comboT` never reset, so once the 2.5s timer expired the combo fell from x10 to x1 in ~0.15s instead of expiring as a single event.
2. **Medium — Ice blocks farmed the penalty.** Tapping an ice block applied −30 and reset the combo but never removed the block, so repeated/accidental taps on the same ice block kept penalising the player.

**Bugs fixed (2)**
1. Combo timer now expires the combo once (`combo=1; comboT=0`).
2. Ice block is spliced out of `G.blocks` on tap — penalty applies exactly once.

**Graphics upgrade:** Rising ember background layer; `shadowBlur` glow halo on golden blocks (gold) and Ember Nova blocks (orange).

**Weapon added — 💥 Ember Nova block.** New block type (~6% of spawns, magma/ice/big rates rebalanced to ~62/17/10% + 15% golden). Tapping it detonates a 150px-radius blast destroying all non-ice blocks in range for their **base** points only (no combo multiplier — balanced, single-use). SFX via existing `noise()` + `tone()` helpers (new `sfx.nova()`). Mentioned in the title overlay help text; drawn as a glowing orange/purple block with 💥.

**Final harness result:** loaded=true, console 0, page 0 — PASS. **Staged: yes.**

---

## Game 23 — Crater Catcher (`game-23-v2.html` → `game-23-crater-catcher.html`)

**Bugs found (2)**
1. **Medium — Combo decay collapsed instantly.** Same every-frame decay bug as game 22 (`comboT` never reset).
2. **Medium — Falling items drifted off-screen.** Items spawn with sideways `vx` that was never bounced or clamped, so stars/golden stars could slide completely off the side of the screen and become uncatchable while still falling.

**Bugs fixed (2)**
1. Combo timer now expires the combo once (`combo=1; comboT=0`).
2. Items now bounce off the left/right edges (clamped to 18px margins, `vx` reflected) so everything falling stays catchable.

**Graphics upgrade:** Rising ember background layer behind the starfield; `shadowBlur` orange glow halo on the Fire Baby peeking over the basket (player character).

**Weapon:** none — **no weapons — non-combat design** (pure catch/dodge game; no attack, target, break, or defense-shot mechanic).

**Final harness result:** loaded=true, console 0, page 0 — PASS. **Staged: yes.**

---

## Game 24 — Ash Storm Survivor (`game-24-v2.html` → `game-24-ash-storm-survivor.html`)

**Bugs found (4)**
1. **Medium — Dead enemies could still hurt the player.** Enemies killed by shots were only filtered out *after* the enemy movement/contact loop, so a just-killed enemy moved (and could deal contact damage) for one more frame.
2. **Medium — Tank HP bar used the wrong maximum.** Render computed the bar against `60+G.time*2` (current time) instead of the tank's spawn-time HP, so the bar shrank on its own as time passed and never matched actual HP.
3. **Medium — Drag steering speed depended on pointer-event rate.** `pointermove` moved the player a fixed step per event, so high-Hz mice/touch panels moved the Fire Baby far faster than low-rate devices (and keyboard speed).
4. **Low — Dead code / stale dash quirk noted:** dasher dash reuses `sfx.shoot()` (cosmetic only, left as-is).

**Bugs fixed (3)**
1. `G.enemies` is now filtered for `dead` immediately after shot/Nova resolution, before the movement/contact loop.
2. Tanks store `maxHp` at spawn; the HP bar divides by `e.maxHp`.
3. Pointer steering now stores a `pointerTarget`; `update()` moves the player toward it at `moveSpeed*dt` (frame-rate and event-rate independent, clamped like keyboard movement).

**Graphics upgrade:** Rising ember background layer (in addition to the existing ash drift); `shadowBlur` glow on the player Fire Baby (orange) and on auto-fire projectiles (gold); Ember Nova charging ring rendered around the player when the weapon is unlocked.

**Weapon added — 💥 Ember Nova (AoE blast).** New level-up upgrade option in the existing upgrade pool. Every 4s it blasts all enemies within 120px for `12 + 3×lvl` damage (lvl 1 = 15 dmg = 125% of the base shot damage 12 — within the +25% balance cap), with kills awarding normal score/XP gems. Stackable via repeat level-up picks. SFX via existing `tone()`/`noise()` (`sfx.nova()`). Mentioned in the title overlay help text.

**Final harness result:** loaded=true, console 0, page 0 — PASS. **Staged: yes.**

---

## Game 25 — Lava Line Draw (`game-25-v2.html` → `game-25-lava-line-draw.html`)

**Bugs found (3)**
1. **High — Stuck-timer never reset.** `G.rollT` (the 20-second "stuck" fail timer) was never reset in `initLevel()`, so roll time accumulated across levels and retries — after 20 cumulative seconds of rolling, every later level/attempt failed almost immediately.
2. **Medium — GO button overlapped the Clear button.** The canvas-drawn ▶ GO button sat at bottom-right (`H-70`), directly under the DOM 🗑️ Clear button, which swallowed taps meant for GO in the overlap region.
3. **Low — Win-celebration particles froze.** Particle updates lived after `update()`'s early return for "not rolling", and `levelComplete()` sets state to `clear`, so the victory burst particles never animated or faded.

**Bugs fixed (3)**
1. `G.rollT=0` in `initLevel()`.
2. GO button moved up to `H-118`, clear of the Clear button.
3. Particle tick moved to the top of `update()`, before the rolling check, so bursts animate in every state.

**Graphics upgrade:** Rising ember background layer (drawn once a level is loaded); `shadowBlur` orange glow halo on the rolling Fire Baby ball (player character).

**Weapon:** none — **no weapons — non-combat design** (physics drawing puzzle; no attack/target/break mechanic).

**Final harness result:** loaded=true, console 0, page 0 — PASS. **Staged: yes.**

---

## Game 26 — Pyra Paddle Battle (`game-26-v2.html` → `game-26-pyra-paddle-battle.html`)

**Bugs found (5)**
1. **Critical — Player paddle could never collide on wide screens.** The collision test required `G.bx>W*0.05` while also requiring `G.bx-BR<30+PW` (i.e. bx < ~55px); on any viewport wider than ~1100px those conditions are mutually exclusive, so the ball passed through the player's paddle every time on desktop. The narrow x-window also let the fastest balls tunnel past the paddle face.
2. **Medium — Difficulty UI/game mismatch.** The HTML marks "😊 Easy" as the selected difficulty button, but `G.diff` defaulted to `1` (Medium), so the game silently played Medium.
3. **Medium — Score-burst particles froze during serve.** `update()` returned early while `serveT>0`, before the particle loop, so scoring bursts hung frozen for the 0.8s serve pause.
4. **Low — Frame-rate-dependent spin decay.** `G.spin*=0.99` ran per frame, so curve decay differed at 30/60/120Hz.
5. **Low — Dead code.** An unused `target` variable whose expression was multiplied by 0.

**Bugs fixed (5)**
1. Collision test replaced with a proper x-overlap test (`bx-BR<30+PW && bx+BR>30`) — works at any width and catches fast balls.
2. `G.diff` default changed to `0` (Easy) to match the selected button.
3. Particle tick moved before the serve-pause early return.
4. Spin decay is now `Math.pow(0.99, dt*60)` (frame-rate independent).
5. Dead `target` variable removed.

**Graphics upgrade:** Flat background replaced with a richer vertical gradient (deep purple → ember brown) plus the rising ember background layer; `shadowBlur` glow on the player paddle (ice blue) and on the ball (gold).

**Weapon added — 🔥 Flame Surge.** Every 4th player paddle hit is a Surge shot: ball speed ×1.25 (cap raised from the normal 950 to 1188 for that shot only — exactly the +25% balance limit), with a sawtooth `tone()` surge SFX and a double orange/gold burst. "NEXT HIT: FLAME SURGE!" indicator appears when charged. Obtained automatically in normal play; mentioned in the title overlay help text.

**Final harness result:** loaded=true, console 0, page 0 — PASS. **Staged: yes.**

---

## Game 27 — Ember Bounce 2D (`game-27-v2.html` → `game-27-ember-bounce-2d.html`)

**Bugs found (1)**
1. **High — Platform tunneling on fast falls.** Fall speed was uncapped (gravity accumulated `vy` without limit), and the platform test used a ~30px window (`py+16 < p.y+PH2+14`); at the capped 1/30s timestep a fast fall moves 50px+, so the Fire Baby could pass completely through a platform in one frame and fall to its death unfairly.

**Bugs fixed (1)**
1. Fall speed capped at 1500px/s **and** the collision test is now swept: it checks the foot position from the previous frame (`prevFeet < p.y+PH2`) against the new position, so any platform crossed during the frame registers a bounce.

**Graphics upgrade:** Rising ember background layer behind the platforms; `shadowBlur` orange glow halo on the bouncing Fire Baby (player character), preserving the existing height-shifting sky gradient.

**Weapon:** none — **no weapons — non-combat design** (vertical jumper/dodger; no attack/target/break mechanic).

**Final harness result:** loaded=true, console 0, page 0 — PASS. **Staged: yes.**

---

## Summary

| Game | Bugs found | Bugs fixed | Weapon / note | Harness | Staged |
|------|-----------|------------|---------------|---------|--------|
| 22 Magma Block Breaker | 2 | 2 | 💥 Ember Nova block | PASS (0/0) | yes |
| 23 Crater Catcher | 2 | 2 | no weapons — non-combat design | PASS (0/0) | yes |
| 24 Ash Storm Survivor | 4 | 3 (+1 cosmetic noted) | 💥 Ember Nova AoE upgrade | PASS (0/0) | yes |
| 25 Lava Line Draw | 3 | 3 | no weapons — non-combat design | PASS (0/0) | yes |
| 26 Pyra Paddle Battle | 5 | 5 | 🔥 Flame Surge shot | PASS (0/0) | yes |
| 27 Ember Bounce 2D | 1 | 1 | no weapons — non-combat design | PASS (0/0) | yes |

Backups for all six originals are in `~/workspace/fire-babys-overhaul/backups/`. No game is BLOCKED. Deploy copies in `~/workspace/.deploy/fire-world/games/` are md5-identical to the edited canonical sources (GitHub upload / live verification is the coordinator's step, per the overhaul status doc).
