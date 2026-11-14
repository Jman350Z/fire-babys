# Batch 2 Report — Games 10–15 (Fire Babys overhaul, 2026-10-12)

Method per game: backup → full read → script extraction + `node --check` → call-site vs
definition grep (no undefined functions found in any of the six; all `getElementById` targets
exist) → surgical fixes → graphics upgrade → weapon/power-up where the design has a combat/
target mechanic → stage to deploy copy → harness re-test
(`test-games-local.py --runs 1`, proxy vars stripped). All edited script blocks pass
`node --check` after edits. Backups: `~/workspace/fire-babys-overhaul/backups/game-NN-v2.html.orig`.

Shared graphics upgrade (all six games): a `drawEmbers()` helper — 24 cheap canvas particles
with additive (`lighter`) glow, positions derived from game time (no per-particle state),
drawn behind gameplay — plus `ctx.shadowBlur` halo glow in the hero's color on the player
character / ball / paddle / snake head / special gems / flipped cards as noted per game.
Art rules respected: spherical flame bodies with bold outlines, no beaks/wings/feathers,
no Fire Baby depicted harmed, no redesign of any game's look.

---

## Game 10 — Caldera Climb (match-3) — `game-10-v2.html` → `game-10-caldera-climb.html`

### Bugs found
1. **High — Line-blast specials could almost never trigger.** `findMatches()` excludes
   special gems, so swapping a line special into a match produced "no match" and the gem
   swapped back; activation only ran if the *other* gem coincidentally matched elsewhere.
2. **High — Color-bomb race / crash risk.** `trySwap` called `activateBomb()` without setting
   `G.animating`. During the bomb's 300 ms clear window the board contains `null` cells but
   input stayed live; a fast second tap could reach gem code with a null cell (also no null
   guard in `trySwap`).
3. **Medium — Score floaters positioned in window coordinates, rendered in board
   coordinates.** `spawnText(W/2, H*0.2 …)` (and two `H*0.3` calls) — the canvas is only
   `CELL*N` px, so on desktop the +points/combo/blast text rendered off-board (invisible).
4. **Medium — Score wiped every level.** `initLevel()` reset `G.score=0`, so the level-clear
   bonus was thrown away on NEXT LEVEL and the final "Final Score" showed only level 5's
   score (contrast game 13, where score is cumulative across levels by design).

### Bugs fixed
- `trySwap`: null guard; line specials now trigger on any swap (moves decremented,
  `animating` locked, `activateSpecial` called); bomb path sets `G.animating=true` first.
- All three `spawnText` call sites now use board coordinates (`CELL*N/2`, `CELL*N*0.2/0.3`).
- Score is cumulative: `initLevel` records `G.startScore` instead of zeroing the score;
  `pickLevel` and the final PLAY AGAIN start a fresh run at 0; game-over TRY AGAIN restores
  the level-start score so retries can't inflate the total.

### Graphics upgrade
Living embers behind the board; `shadowBlur` glow on line-blast gems (in the gem's color)
and on the new Nova gem. Existing board gradient/checkerboard kept.

### Weapon added — 🌟 Ember Nova
- **How obtained:** any cascade chain (x2 or higher) during `resolveBoard` forges the match
  cell into a Nova gem — normal play, no hotkey needed. Mentioned in the title overlay help.
- **Effect/stats:** swap it (in place) to blast the 3×3 area around it — max 9 gems × 60 =
  540 pts, comparable to a typical color-bomb clear (≈8–12 gems), i.e. not stronger than the
  game's existing best special. Costs 1 move like other specials.
- **SFX:** existing `sfx.special()` plus the game's `tone()` helper (900→1800 Hz sweep).

### Final harness result
loaded=true, console_error_count=0, page_error_count=0 (`reports/game-10-caldera-climb.json`).
**Staged: yes. PASS.**

---

## Game 11 — Magma Trench Dodge (one-touch runner) — `game-11-v2.html` → `game-11-magma-trench-dodge.html`

### Bugs found
1. **High — Jump-cut sign flip on touch/mouse (the primary input).** The canvas `pointerup`
   handler did `G.vy *= -0.4`, turning upward velocity *positive* — releasing a tap slammed
   Ruko downward instead of shortening the jump. The keyboard `keyup` handler correctly used
   `*= 0.4`, confirming the sign error.
2. **Low — Quick tap-release could lose its jump cut.** `G.holding` was only set a frame
   later inside `tryJump()`, so a release before the next update frame never applied the cut
   and the following frame re-armed `holding` after the pointer was already up.

### Bugs fixed
- `pointerup` now uses `G.vy *= 0.4`, matching the keyboard path.
- `doJump()` sets `G.holding = true` immediately when the input is buffered.

### Graphics upgrade
Living embers over the existing sky/volcano gradient; orange `shadowBlur` halo (18 px) on
the player character. Existing particle system untouched.

### Weapon
**No weapons — non-combat design** (pure runner/dodger: jump/double-jump, dodge geysers and
spikes, collect crystals; no attack/target/break mechanic).

### Final harness result
loaded=true, console_error_count=0, page_error_count=0 (`reports/game-11-magma-trench-dodge.json`).
**Staged: yes. PASS.**

---

## Game 12 — Volcanic Pinball — `game-12-v2.html` → `game-12-volcanic-pinball.html`

### Bugs found
1. **Critical — Flippers could never activate.** `layout()` built brand-new flipper/bumper/
   sling objects on *every* call. `setFlip()` set `active=true` on a throwaway object;
   `update()`/`render()` each called `layout()` again and got fresh flippers with
   `active:false` and reset `ang`. Result: flipper input played a sound but the flippers
   never swung, and flipper hits always used the weak rest power (250, never 1050).
2. **Medium — Slingshots re-triggered every frame.** No cooldown: while the ball was inside
   a slingshot's box it re-scored +50 and re-set velocity each frame (score farming + jitter).
3. **Low — Bumper flash never rendered.** `bp.flash` was set on update's throwaway bumper
   objects; render rebuilt the layout, so the flash state was always gone.
4. **Low — Dead code:** `flipperTip()` was never called and computed nonsense against
   throwaway layout objects. Removed.

### Bugs fixed
- `layout()` now caches its result keyed by table geometry, so flipper `ang`/`active`,
  bumper `flash`, and sling state persist between update and render (rebuilt only on resize).
  This one fix resolves bugs 1 and 3 and enables 2's fix.
- Slingshots got a 0.3 s per-sling cooldown (`s.cool`).

### Graphics upgrade
Flat `#0d0a14` backdrop replaced with a richer vertical gradient (violet → near-black →
ember); living embers behind the table; fireball gets an orange `shadowBlur` halo, plus a
cyan shield ring when the Ember Shield is held (see below). Bumper flash now visibly works
(consequence of the layout fix).

### Weapon/power-up added — 🌟 Nova Bumper → 🛡️ Ember Shield
- **New target:** a 4th, smaller bumper at top-center — the Nova Bumper, 125 pts (exactly
  +25% over the regular 100-pt bumpers, the balance cap).
- **Power-up:** hitting it grants a one-time **Ember Shield**. The next drained ball is
  saved (fresh ball served, no ball lost); shield is then consumed. Shown as a glowing ring
  around the ball; announced with floating text.
- **SFX:** the game's `tone()` helper (900→1500 Hz on grant, 700→1400 Hz on save) alongside
  existing `sfx.bumper()`/`sfx.drain()`. Mentioned in the title overlay help text.

### Final harness result
loaded=true, console_error_count=0, page_error_count=0 (`reports/game-12-volcanic-pinball.json`).
**Staged: yes. PASS.**

---

## Game 13 — Pyra Prime Defense (breakout) — `game-13-v2.html` → `game-13-pyra-prime-defense.html`

### Bugs found
1. **Medium — Slow-Mo power-up did nothing.** `applyPower('slow')` scaled ball velocity ×0.7,
   but `update()`'s speed clamp immediately renormalised every ball to the 380 minimum speed
   on the next frame. The power-up was purely cosmetic.
2. **Medium — Sticky power-up used a stray `setTimeout`.** The 15 s expiry timer could fire
   during a later level (cancelling a fresh sticky early) and was never cleared on level
   rebuild, which resets state via fields, not timers.

### Bugs fixed
- Slow-Mo is now a timer (`G.slowT`, 8 s): while active the clamp minimum drops to 250 and
  the pickup also scales velocity ×0.65, so the slowdown actually persists.
- Sticky is now a timer too (`G.stickyT`, 15 s), ticked in `update()`, reset by
  `buildLevel()` — no `setTimeout`, no cross-level leakage.

### Graphics upgrade
Living embers over the existing background gradient; `shadowBlur` glow on the paddle
(stronger while lasers are armed) and on every fireball.

### Weapon/power-up added — 💥 Nova Burst
- **How obtained:** added to the existing falling power-up drop pool (22% drop chance per
  destroyed brick, now 7 types), caught with the paddle like all other power-ups. Mentioned
  in the title overlay help text.
- **Effect/stats:** instantly destroys the 5 bricks nearest the paddle (damage 2, so tough
  bricks fall too). One-shot and worth at most 5 bricks — well under what the existing
  12-second Laser power-up (the game's best) can destroy in its duration, so it stays inside
  the balance cap.
- **SFX:** existing `sfx.power()` plus the game's `noise()` helper for the blast, with a
  screen shake.

### Final harness result
loaded=true, console_error_count=0, page_error_count=0 (`reports/game-13-pyra-prime-defense.json`).
**Staged: yes. PASS.**

---

## Game 14 — Sparky Speedway (ember snake) — `game-14-v2.html` → `game-14-sparky-speedway.html`

### Bugs found
1. **Medium — Previous run's golden crystal leaked into the new run.** `reset()` never
   cleared `G.golden`, so a leftover golden star stayed on the board after PLAY AGAIN and
   could be eaten immediately in the fresh run (particles/floaters leaked the same way).
2. **Low — Food and golden crystal could spawn on the same cell** (each spawner only avoided
   the snake), visually stacking two pickups.

### Bugs fixed
- `reset()` now clears `G.golden` and deactivates all particles/floaters.
- `placeFood()` also avoids the golden cell; the golden spawner also avoids the food cell.
- Noted, left as-is (harmless): the body-segment interpolation branch in `render()` is dead
  code (`*0` factor) — segments render per grid step while the head interpolates.

### Graphics upgrade
Flat `#0a1410` backdrop replaced with a richer vertical gradient (deep green → near-black →
ember); living embers behind the board; orange `shadowBlur` halo on the snake's Fire Baby head.

### Weapon
**No weapons — non-combat design** (steer, eat crystals to grow, avoid walls/self; no
attack/target/break mechanic).

### Final harness result
loaded=true, console_error_count=0, page_error_count=0 (`reports/game-14-sparky-speedway.json`).
**Staged: yes. PASS.**

---

## Game 15 — Cinder's Melt-Down (memory match) — `game-15-v2.html` → `game-15-cinders-melt-down.html`

### Bugs found
1. **Medium — Score wiped every level.** `initLevel()` reset `G.score=0`, so NEXT LEVEL threw
   away the accumulated score + star bonus; the final "Score" showed only level 3's points
   (contrast game 13's cumulative-by-design scoring).
2. **Low — Final-level overlay always showed 3 stars.** The Memory Master screen hard-coded
   `'★'.repeat(3)` regardless of the stars actually earned from flip count.
3. **Low — Flip/glow animation was frame-rate dependent.** `render()` advanced the flip by a
   fixed 0.12 per rendered frame — twice as fast on a 120 Hz display as on 60 Hz.

### Bugs fixed
- Score is cumulative: `initLevel` no longer zeroes it; `pickLevel` (fresh run) and the
  final PLAY AGAIN reset it explicitly.
- Final overlay now renders the earned stars (`'★'.repeat(stars)` + hollow remainder).
- Loop now computes `G.frameScale` (dt×60, clamped) and the flip step / glow decay in
  `render()` scale by it.

### Graphics upgrade
Flat `#160a1e` backdrop replaced with a richer vertical gradient (violet → near-black →
ember); living embers behind the card grid; face-up cards get a `shadowBlur` glow in their
character color (stronger on matched pairs).

### Weapon
**No weapons — non-combat design** (pure memory/puzzle: flip two cards, find pairs; no
attack/target/break mechanic).

### Final harness result
loaded=true, console_error_count=0, page_error_count=0 (`reports/game-15-cinders-melt-down.json`).
**Staged: yes. PASS.**

---

## Summary table

| Game | Bugs found | Bugs fixed | Weapon / power-up | Harness | Staged |
|---|---|---|---|---|---|
| 10 Caldera Climb | 4 (1 High×2, 2 Med) | 4 | 🌟 Ember Nova (cascade-forged, 3×3 blast) | PASS 0/0 | yes |
| 11 Magma Trench Dodge | 2 (1 High, 1 Low) | 2 | none — non-combat | PASS 0/0 | yes |
| 12 Volcanic Pinball | 4 (1 Critical, 1 Med, 2 Low) | 4 | 🌟 Nova Bumper (125) → 🛡️ Ember Shield (one drain save) | PASS 0/0 | yes |
| 13 Pyra Prime Defense | 2 (2 Med) | 2 | 💥 Nova Burst power-up (5 nearest bricks) | PASS 0/0 | yes |
| 14 Sparky Speedway | 2 (1 Med, 1 Low) | 2 | none — non-combat | PASS 0/0 | yes |
| 15 Cinder's Melt-Down | 3 (1 Med, 2 Low) | 3 | none — non-combat | PASS 0/0 | yes |

No game is BLOCKED; no backup restores were needed. Deploy copies are byte-identical to the
edited sources (verified with `cmp`).
