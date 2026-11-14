# Batch 3 Report — Games 16–21 (Fire Babys Overhaul, 2026-10-12)

Method for every game: backup to `~/workspace/fire-babys-overhaul/backups/game-NN-v2.html.orig` before editing; full code read; each `<script>` block extracted and passed `node --check` (pre- and post-edit); call sites grepped against definitions (no undefined-function calls found in any of the six — the remaining grep hits were false positives from strings/comments); bugs fixed surgically in the source; edited source copied over the deploy copy (verified byte-identical with `cmp`); harness re-run on the local URL with proxy vars stripped. PASS = loaded=true AND console_error_count=0 AND page_error_count=0.

---

## Game 16 — Inferno Drop (`game-16-v2.html` → `game-16-inferno-drop.html`) — whack-a-mole

### Bugs found
1. **Medium — Duplicate `time` key in the `G` object literal** (`time:60` then `time:0`): the countdown actually initialised to 0, and the same field was overloaded as the render-animation clock for the lava pulse (`Math.sin(G.time*5…)`), while the game loop contained a dead `G.time += dt*0` no-op. Only `reset()` setting `time=60` masked it in play.
2. **Medium — Combo collapsed instantly**: in `update()`, once `comboT` hit 0 the combo decremented *every frame* (clamped at 1) instead of stepping down gradually, so a built-up combo vanished in a few frames.
3. **Low — Hole radius used the wrong dimension**: `Math.min(gw,gw)` (same value twice) instead of `Math.min(gw,gh)`, so hole size ignored the grid height on non-square layouts.

### Bugs fixed
- Removed the duplicate key; added a dedicated `anim` clock incremented in the loop and used for the lava pulse; the countdown field is now only the countdown.
- Combo now steps down one level per 0.8 s after the combo timer expires.
- Hole radius now uses `Math.min(gw,gh)`.

### Graphics upgrade
- Living background: 24 additive-glow rising ember particles behind the lava holes.
- Glow: `shadowBlur` halo on moles — orange for the fire baby, gold for golden/mallet moles.

### Weapon added — **Golden Mallet**
- A special 🔨 mole (~6% of spawns, only while inactive). Tapping it grants 5 s of **+25% bonk points and a larger hit radius (×1.15 → ×1.40)** — capped at the +25% balance limit. SFX via the existing `tone()`/`noise()` helpers (new `sfx.mallet()`). Mentioned in the title-overlay help text; the combo pill shows 🔨 while active.

### Final harness result
loaded=true, console_error_count=0, page_error_count=0, errors=[] — **PASS**. Staged: **yes**.

---

## Game 17 — Flame Sprint 2D (`game-17-v2.html` → `game-17-flame-sprint-2d.html`) — tower stacker

### Bugs found
1. **Critical — Camera sign inverted**: render used `ctx.translate(0,-G.camY)` while block Y *decreases* as the tower grows, so once the tower passed ~12 blocks the sliding block and tower top were pushed off the top of the screen — the game became unplayable blind. The block-culling bounds were written for the same wrong sign. (Verified by simulation: after the fix the sliding block sits at a constant on-screen Y ≈ 408 at every height.)
2. **High — Camera target counted falling debris**: the camera target was derived from `G.blocks.length`, which includes trimmed falling pieces pushed into the same array, so every trim scrolled the camera an extra block.
3. **Medium — Total-miss block vanished**: on a complete miss the dropped block was flagged `falling` but never added to any rendered array, so it disappeared instantly instead of falling.
4. **Low — Falling-piece removal used screen height against world coordinates** (`b.y > H+60`), wrong once the camera has scrolled.
5. **Low — Dead code**: an unused `targetY` camera variable in `drop()`; the drop-guide line also terminated at screen `H` instead of the camera-adjusted bottom.

### Bugs fixed
- Camera translate sign corrected to `+G.camY`; culling bounds rewritten for the corrected transform; drop guide now ends at `H-G.camY`.
- Camera target now derives from `G.height` (real stacked height), not array length.
- Missed blocks are pushed into `G.blocks` as falling pieces *after* `spawnBlock()` has read the true previous block, so they visibly fall without corrupting the next spawn.
- Falling-piece removal threshold is camera-aware (`H-G.camY+60`); dead `targetY` removed.

### Graphics upgrade
- Living background: 24 additive-glow rising ember particles over the night-sky backdrop.
- Glow: gold `shadowBlur` halo on the sliding (hero) block.

### Weapon
**No weapons — non-combat design.** Pure timing/placement stacker; there is no attack, target, break, or defense mechanic to attach a weapon to.

### Final harness result
loaded=true, console_error_count=0, page_error_count=0, errors=[] — **PASS**. Staged: **yes**.

---

## Game 18 — Blaze's Thermal Run (`game-18-v2.html` → `game-18-blazes-thermal-run.html`) — lava maze

### Bugs found
1. **High — Win could be double-counted**: reaching the EXIT did not change `G.state`, so during the 500 ms before the overlay appeared the player could leave and re-enter the exit cell, re-triggering the win, re-adding the score bonus, and stacking overlays.
2. **Medium — Game-over didn't stop play**: when lives hit 0, `hitWall()` showed the overlay after 500 ms but never set a terminal state or stopped dragging — the player kept moving (and kept losing "lives" below 0) behind the overlay. `hitWall()` also had no state guard at all.
3. **Low (noted, pre-existing design)** — `layout()` reads `G.level` and is wired to `resize` before `G` is initialised in source order; harmless in practice because the listener can't fire mid-script and the first `resize()` call happens after `G` exists. Left as-is.

### Bugs fixed
- `tryMove()` now sets `G.state='clear'` the moment the exit is reached, locking all input (drag + keyboard handlers already gate on `state==='play'`).
- `hitWall()` returns early unless `state==='play'`; on the final life it sets `G.state='over'` and cancels dragging before the overlay delay.

### Graphics upgrade
- Richer backdrop: flat `#0d0a08` fill replaced with a dark vertical gradient, plus 24 additive-glow rising ember particles behind the maze.
- Glow: orange `shadowBlur` halo on the player fire baby (in addition to its existing gold ring).

### Weapon
**No weapons — non-combat design.** Pure drag/keyboard maze navigation; no attack mechanic.

### Final harness result
loaded=true, console_error_count=0, page_error_count=0, errors=[] — **PASS**. Staged: **yes**.

---

## Game 19 — Ruko's Lava Leap (`game-19-v2.html` → `game-19-rukos-lava-leap.html`) — bubble shooter

### Bugs found
1. **High — Ceiling-drop broke the hex grid**: every 6 shots a new row is `unshift`ed, flipping the parity of every existing row, but row lengths were never adjusted. Rows that became "odd" kept 10 bubbles instead of 9, so the last bubble hung a full radius off the right edge of the board and neighbour/cluster geometry no longer matched the visuals.
2. **Medium — No lose check after a normal stick**: `checkLose()` only ran on ceiling-drop, so a bubble snapped across the danger line could sit there indefinitely until the next drop cycle.
3. **Low — Frame-rate-dependent falling bubbles**: dropped bubbles were animated inside `render()` with a hard-coded `0.016` step, so their fall speed varied with refresh rate and they kept animating on the title screen.

### Bugs fixed
- After each ceiling-drop unshift, every row is truncated to its parity length (`COLS` / `COLS-1`), so no bubble can hang off-board.
- `checkLose()` now also runs after a non-cluster stick and after cluster resolution; it is guarded to `state==='play'` so it can't double-fire game-over overlays.
- Falling bubbles now use the real per-frame `dt` (`G.rdt`, set in the loop) instead of the hard-coded step.

### Graphics upgrade
- Living background: 24 additive-glow rising ember particles behind the bubble board.
- Glow: `shadowBlur` halo in the bubble's own colour on the shooter's loaded bubble and on the flying bubble (gold ring + halo when the Ember Bomb is armed/flying).

### Weapon added — **Ember Bomb**
- Charges automatically every 6 shots (HUD pill shows "💣 READY (B)"); press **B** to arm the next shot. On stick, the bomb pops its colour cluster **plus up to 3 neighbouring bubbles of any colour** (hard-capped at +3 bubbles ≈ +180 pts, in line with existing drop bonuses — no more than ~25% stronger than the game's existing best plays). SFX via the existing `tone()` helper. Mentioned in the title-overlay help text, with on-canvas "BOMB READY — PRESS B" prompt and an armed indicator ring on the shooter.

### Final harness result
loaded=true, console_error_count=0, page_error_count=0, errors=[] — **PASS**. Staged: **yes**.

---

## Game 20 — Boulder's Fortress (`game-20-v2.html` → `game-20-boulders-fortress.html`) — flappy/glider

### Bugs found
1. **Medium — Brand-rule violation in the hero art**: the player fire baby was drawn with a flapping **wing** (ellipse). The Fire Babys brand pillars are explicit: zero beaks/wings/feathers, ever.
2. **Low — Frame-rate-dependent death flash**: the white flash decayed by a fixed `0.06` per *render* call, so its duration varied with refresh rate.

### Bugs fixed
- Wing removed and replaced with a small flickering **flame tuft** plume behind the spherical flame body — same flap rhythm, on-brand (no wings/feathers anywhere).
- Flash decay moved into the game loop as a `dt`-based decay (3/s), matching the original 60 fps feel at any refresh rate.

### Graphics upgrade
- Living background: 24 additive-glow rising ember particles over the sky, behind the parallax mountains.
- Glow: orange `shadowBlur` halo on the player (in addition to the existing radial glow).

### Weapon
**No weapons — non-combat design.** Pure flap/dodge runner; no attack mechanic.

### Final harness result
loaded=true, console_error_count=0, page_error_count=0, errors=[] — **PASS**. Staged: **yes**.

---

## Game 21 — Sizzle's Target Pop (`game-21-v2.html` → `game-21-sizzles-target-pop.html`) — jigsaw puzzle

### Bugs found
1. **Critical — The puzzle could never be solved correctly**: `initLevel()` first set each piece's target to its home slot, then **re-assigned every target from a shuffled list**. A piece's picture fragment belongs in its home slot, so with shuffled targets the "completed" board assembled a scrambled picture, and no slot visually matched the piece that belonged there — unsolvable by eye, only by trial-and-error snapping. (The code even carried confused inline comments — "fix: home IS the target" — immediately undone by the shuffle below it.)
2. **Low — Completion didn't freeze play**: `levelComplete()` left `state==='play'`, so the timer kept running during the 700 ms before the overlay.
3. **Low — Timer DOM write every frame**: the HUD timer element was rewritten on every rendered frame instead of once per second.

### Bugs fixed
- Removed the target re-shuffle entirely; each piece's target is its home slot (`tr=hr, tc=hc`). Scatter positions around the edges are unchanged, so the challenge is intact — the picture now assembles correctly.
- `levelComplete()` sets `G.state='clear'` immediately.
- Timer HUD now updates only when the displayed second changes.

### Graphics upgrade
- Richer backdrop: flat `#160d08` fill replaced with a warm vertical gradient, plus 24 additive-glow rising ember particles behind the board. (The dragged piece's existing gold drag-glow was retained.)

### Weapon
**No weapons — non-combat design.** Pure jigsaw puzzle; no attack mechanic.

### Final harness result
loaded=true, console_error_count=0, page_error_count=0, errors=[] — **PASS**. Staged: **yes**.

---

## Batch summary

| Game | Bugs found | Fixed | Weapon | Harness |
|---|---|---|---|---|
| 16 Inferno Drop | 3 | 3 | Golden Mallet (pickup mole, +25% pts / bigger radius, 5 s) | PASS |
| 17 Flame Sprint 2D | 5 | 5 | — non-combat (stacker) | PASS |
| 18 Blaze's Thermal Run | 2 (+1 noted) | 2 | — non-combat (maze) | PASS |
| 19 Ruko's Lava Leap | 3 | 3 | Ember Bomb (every 6 shots, B to arm, +≤3 bubbles) | PASS |
| 20 Boulder's Fortress | 2 | 2 | — non-combat (flappy dodger) | PASS |
| 21 Sizzle's Target Pop | 3 | 3 | — non-combat (jigsaw) | PASS |

All six deploy copies in `~/workspace/.deploy/fire-world/games/` are byte-identical to their edited sources. No game was blocked; no backup restore was needed. Every game's script blocks pass `node --check` after edits.
