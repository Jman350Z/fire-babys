# Batch 7 Report — Games 40–45 (2026-10-12)

Method per game: backup to `backups/game-NN-v2.html.orig` → full read → `node --check` on the extracted `<script>` block (all passed pre- and post-edit) → call-site vs definition grep (no undefined-function calls in any of the six; the Patch-016 pattern is absent here) → deeper logic/data verification (BFS reachability solver for game 41 mazes, BFS Rush-Hour solver for game 43 levels, shuffle analysis for game 44) → surgical fixes → graphics upgrade → weapon where the design has combat → stage to `.deploy` → harness re-test (`test-games-local.py`, proxy vars stripped, runs=1). PASS = loaded=true, console_error_count=0, page_error_count=0.

Graphics upgrade applied to **all six** (in-style, additive): a living ember background — 24 deterministic, cheap canvas particles rising behind gameplay with additive (`lighter`) glow via a shared `drawEmbers()` helper driven by `G.time` (no extra state, runs on title screens too) — plus a hero/projectile glow (`ctx.shadowBlur` halo in the hero colour when drawing the player/projectile), and a richer gradient backdrop where the game previously used a flat fill (games 41, 43, 44). Art rules respected: spherical flame bodies, bold/plushie look, no beaks/wings/feathers, no Fire Baby depicted harmed.

---

## Game 40 — Sizzle's Spark Run (`game-40-v2.html` → `game-40-sizzles-spark-run.html`)

### Bugs found
1. **Critical — obstacles killed the player instantly on spawn, from anywhere on screen.** The obstacle collision test used a fixed ground-line top (`oy = H*0.75 - hitH`) and never looked at the obstacle's own falling `it.y`. Grounded, the vertical-overlap test is always true, so any rock/firewall spawning in the player's lane ended the run immediately, no matter how far away it was.
2. **Critical (companion) — obstacles were drawn at the ground line, not at their falling position.** The rock and firewall renderers anchored to `gy` (the ground) and ignored `it.y`, so obstacles teleported to the bottom the moment they spawned instead of travelling down the track like the sparks do.
3. **Low — `moveLane()` had no game-state guard.** Arrow keys / swipes on the title or game-over overlay silently changed the lane variable (harmless but sloppy; `doJump()` already guarded).

### Bugs fixed
- Collision top is now derived from the obstacle itself: `oy = it.y + 28 - hitH` — a hit now requires the obstacle to actually reach the player (and a low firewall can be jumped, as the spark-arc rows intend).
- Rock and firewall are now rendered anchored to `baseY = it.y + 28`, travelling down the track in sync with the collision box.
- `moveLane()` now returns early unless `state==='play'` and not dead.

### Graphics upgrade
Ember background (`drawEmbers()` after the backdrop gradient) + orange `shadowBlur` halo (18) on the player flame body.

### Weapon
None — **no weapons — non-combat design** (pure 3-lane runner/dodger/collector; no attack/target/break/defence mechanic).

### Final harness result
loaded=true, console_error_count=0, page_error_count=0 — **PASS**. Post-edit `node --check`: OK. **Staged: yes** (deploy copy byte-identical to source).

---

## Game 41 — Blaze's Inferno Roll (`game-41-v2.html` → `game-41-blazes-inferno-roll.html`)

### Bugs found
1. **High — Mazes 4, 5 and 6 were unbeatable.** A BFS reachability check (walls and lava treated as impassable — lava kills on centre contact) proved the goal, and at least one required star, sit in a region sealed off from the start in mazes 4, 5 and 6. Since the goal only triggers when *all* stars are collected, these three mazes could never be cleared. Maze 4: the bottom corridor (row 7) is split by a single wall at col 8. Maze 5: a single wall at row 7, col 6 seals the route. Maze 6: two chokepoint walls (row 3 col 10, row 5 col 6) seal the goal/star region.
2. **Medium — wall-bump SFX spam.** Pressing/tilting into a wall re-triggered `sfx.bump()` (a fresh oscillator) every physics frame for as long as the ball was held against the wall.
3. **Low (noted, not changed) — corner clipping.** Collision samples only the ball's cardinal extremes, so the ball can visually overlap a wall corner diagonally. Cosmetic at this ball size; left alone rather than risking physics feel.

### Bugs fixed
- Maze 4: opened row 7, col 8 (`"10000000100001"` → `"10000000000001"`).
- Maze 5: opened row 7, col 6 (`"101030100000301"` → `"101030000000301"`).
- Maze 6: opened row 3, col 10 and row 5, col 6 (`"1000100000100001"` → `"1000100000000001"`, `"1030001010201001"` → `"1030000010201001"`).
- Re-ran the BFS solver against the edited file: **all 6 mazes now have goal + every star reachable**.
- Bump sound now only plays when the impact speed is meaningful (`|v| > 70` before the bounce is applied), on both axes.

### Graphics upgrade
Flat `#140d08` backdrop replaced with a warm vertical gradient; ember background; orange `shadowBlur` halo (18) on the rolling fireball.

### Weapon
None — **no weapons — non-combat design** (tilt maze roller; no attack mechanic).

### Final harness result
loaded=true, console_error_count=0, page_error_count=0 — **PASS**. Post-edit `node --check`: OK. **Staged: yes**.

---

## Game 42 — Ruko's Speed Trap (`game-42-v2.html` → `game-42-rukos-speed-trap.html`)

### Bugs found
1. **Medium — no keyboard input.** The game was tap/pointer-only despite desktop play being a primary case; there was no way to trigger a tap from the keyboard.
2. **Low — dead code: `sfx.tick()` was defined but never called** anywhere (the needle swept in silence).

### Bugs fixed
- Extracted the pointer-tap scoring logic verbatim into `doTap()`; the pointer handler now delegates to it, and a new keydown handler triggers it on **Space / Enter** (with `preventDefault`). Help text updated to say "TAP (or press SPACE)".
- Wired `sfx.tick()`: the needle now ticks as it crosses each 1/8-turn step while sweeping (suppressed while a result is showing).

### Graphics upgrade
Ember background over the existing radial backdrop; warm `shadowBlur` halo (16) on the needle tip.

### Weapon
None — **no weapons — non-combat design** (reaction-timing game; no attack mechanic).

### Final harness result
loaded=true, console_error_count=0, page_error_count=0 — **PASS**. Post-edit `node --check`: OK. **Staged: yes**.

---

## Game 43 — Boulder's Blockade (`game-43-v2.html` → `game-43-boulders-blockade.html`)

### Bugs found
Verified with a BFS Rush-Hour solver run against the level data:
1. **High — Levels 1 and 3 start already solved.** In both, nothing blocks row 2 to the right of the fireball block, so the "puzzle" is complete before the first move (the win only registers after an unrelated move is made).
2. **High — Level 7 has a block hanging off the board.** `{r:5,c:0,len:3,h:0}` is a vertical length-3 block starting on the last row — it occupies rows 5, 6 and 7 of a 6-row board, renders partly outside the board, and can never move legally from its start cell.
3. **High — Level 8 has a block hanging off the board.** `{r:4,c:5,len:2,h:1}` is a horizontal length-2 block starting on the last column — it occupies cols 5 and 6 of a 6-column board.
4. **Medium — drag leapfrogging.** The drag handler teleported a block straight to its destination cell and only collision-checked the destination, so a fast drag could jump a block *over* an intervening blocker into a free cell beyond it.
5. **Low — game state mutated inside `render()`.** The solved-state ball roll-out advanced `G.ballX` during drawing (frame-rate-dependent, and render should not own state).

### Bugs fixed
- Level 1: the col-3 vertical blocker drops one row into the fireball's path (`{r:0,c:3,…}` → `{r:1,c:3,…}`).
- Level 3: the col-4 vertical blocker drops one row into the path (`{r:0,c:4,…}` → `{r:1,c:4,…}`).
- Level 7: off-board block replaced with an in-bounds vertical length-2 block at `{r:3,c:0,len:2,h:0}`.
- Level 8: off-board block replaced with an in-bounds horizontal length-2 block at `{r:4,c:3,len:2,h:1}`.
- Solver re-run on the edited file: **all 8 levels are in-bounds, non-overlapping, NOT pre-solved, and solvable** (minimum 1-cell-move solutions: 1, 4, 1, 9, 3, 2, 1, 12 — the reworked level 8 is now the most substantial, fitting its finale slot).
- Drag handler rewritten to step one cell at a time toward the drag target, bounds- and collision-checking *every* cell passed; leapfrogging is impossible.
- `G.ballX` roll-out advance moved from `render()` into `loop()`.

### Graphics upgrade
Flat `#0d0a14` backdrop replaced with a violet vertical gradient; ember background; orange `shadowBlur` halo (16) on the fireball block.

### Weapon
None — **no weapons — non-combat design** (sliding-block puzzle; no attack mechanic).

### Final harness result
loaded=true, console_error_count=0, page_error_count=0 — **PASS**. Post-edit `node --check`: OK. **Staged: yes**.

---

## Game 44 — Cinder's Slide (`game-44-v2.html` → `game-44-cinders-slide.html`)

### Bugs found
1. **Medium — the Fire Baby in the tile picture was drawn at a fixed size.** `drawTileArt()` drew the baby as a hard-coded 24px-radius circle (26px gradient) regardless of board size, so on larger boards/screens the centrepiece character shrank to a dot while the volcano around it scaled.
2. **Medium — a shuffle could deal an already-solved board.** The board is shuffled by random legal moves, which can (with low probability) wander back to the solved arrangement; the player would then be staring at a completed puzzle with no win registered until they break it and re-solve it.
3. **Low — dead code in `drawTileArt()`:** `const home = tileHome(G._drawV||1)` was computed and never used.

### Bugs fixed
- Baby now scales with the scene (`babyR = S*0.075`; gradient, eye offsets and eye radius all proportional), with an orange glow halo.
- After shuffling, if `checkWin()` is true the board is nudged with further legal moves (guard-capped loop) until it is not solved — a dealt board is never pre-solved.
- Dead `home` line removed.

### Graphics upgrade
Flat `#160d08` backdrop replaced with a warm vertical gradient; ember background; glow on the pictured Fire Baby (above).

### Weapon
None — **no weapons — non-combat design** (15-puzzle; no attack mechanic).

### Final harness result
loaded=true, console_error_count=0, page_error_count=0 — **PASS**. Post-edit `node --check`: OK. **Staged: yes**.

---

## Game 45 — Lord Inferno's Strike (`game-45-v2.html` → `game-45-lord-infernos-strike.html`)

### Bugs found
1. **Low — slain enemies were drawn for one extra frame.** `strike()` marks enemies `dead`, but `render()` drew every entry in `G.enemies` until the next `update()` filtered the array.
2. No other defects found: mana economy (20/strike, 14/s regen), chain-lightning, wave-clear bonus and the dummy-spawn-queue anti-retrigger guard, castle-damage and game-over paths all check out on read-through; `node --check` clean; no undefined calls.

### Bugs fixed
- `render()` now skips `e.dead` enemies (one-line guard).

### Graphics upgrade
Ember background layered into the storm scene (over the sky/rain/clouds, behind the action); golden `shadowBlur` halo (14) on the castle. (Lightning bolts already had a `shadowBlur` glow and keep it.)

### Weapon added — 🔆 **Inferno Nova**
- **Stats:** 55 damage in radius 100 around its target. The base lightning strike deals 45 — the Nova is **+22%, inside the 25% balance cap** — and its larger area is paid for by scarcity (one charge per 6 kills, below).
- **How obtained (normal play):** every 6th kill charges +1 Nova (`G.kills` / `G.nova`, reset per run). Availability is shown in the wave pill (`🌊 Wave N • 🔆 Nova ×1`). Press **SPACE / X** to fire: it auto-targets the most advanced (lowest-on-screen, most dangerous) enemy. No mana cost — the charge is the cost.
- **SFX:** `sfx.nova()` built from the game's existing `noise()` + `tone()` helpers; reuses the existing bolt visual, flash and shake.
- **Documented in-game:** the start overlay help text now explains the Nova, its charge rate, hotkey and damage.

### Final harness result
loaded=true, console_error_count=0, page_error_count=0 — **PASS** (harness sent 21 keys including Space during gameplay; the Nova guard no-ops safely with no charge). Post-edit `node --check`: OK. **Staged: yes**.

---

## Batch summary

| Game | Bugs found | Bugs fixed | Weapon | Harness | Staged |
|------|-----------|------------|--------|---------|--------|
| 40 Sizzle's Spark Run | 3 (1 Critical pair + 1 Low) | 3 | — non-combat runner | PASS | yes |
| 41 Blaze's Inferno Roll | 3 (1 High + 1 Medium + 1 Low noted) | 2 (+1 noted, left by design) | — non-combat maze | PASS | yes |
| 42 Ruko's Speed Trap | 2 | 2 | — non-combat timing | PASS | yes |
| 43 Boulder's Blockade | 5 (3 High + 1 Medium + 1 Low) | 5 | — non-combat puzzle | PASS | yes |
| 44 Cinder's Slide | 3 | 3 | — non-combat puzzle | PASS | yes |
| 45 Lord Inferno's Strike | 1 (Low) | 1 | 🔆 Inferno Nova (55 dmg, +22%) | PASS | yes |

All six deploy copies in `~/workspace/.deploy/fire-world/games/` are byte-identical to their edited canonical sources. No game is blocked; no backup restore was needed.
