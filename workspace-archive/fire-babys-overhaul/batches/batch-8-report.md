# Batch 8 Report — Games 46–51 (Fire Babys overhaul, 2026-10-12)

Method per game: backup to `backups/game-NN-v2.html.orig` → full read → `node --check` on the script block (all passed pre- and post-edit) → call-site vs definition grep (no undefined-function calls found in any of the six; the only unmatched names were callback params / arrow-consts / property accesses) → surgical fixes → graphics upgrade → weapon where the design has a combat/target/break mechanic → stage source over deploy copy → harness re-test (`test-games-local.py`, proxy vars stripped). PASS = loaded=true, console_error_count=0, page_error_count=0.

---

## Game 46 — Magma Jump 2D (`game-46-v2.html` → `game-46-magma-jump-2d.html`)

**Bugs found: 6 (2 High, 2 Medium, 2 Low-frame instances of the same root cause)**

Root cause: the camera offset `G.camY` (always ≤ 0 as you climb) was **added** in the update loop where the renderer **subtracts** it (`screen = world − camY`). Every gameplay check in `update()` was therefore offset from what the player sees by `2×camY`:

- **High — stars uncollectable after climbing:** star collision used `G.py-(s.y+G.camY)` instead of the world-frame distance. Once the camera had moved more than ~36px, the computed distance was permanently too large and stars could never be collected (combo/score system dead).
- **High — lava patches kill from the wrong place:** lava collision used `ly=l.y+G.camY` while lava is drawn at `l.y−camY`. Patches would kill the player while visibly elsewhere, and touching a visible patch did nothing.
- **Medium — new rows spawn at the bottom, not ahead:** the spawn loop called `spawnRow(topY-G.camY)`; `spawnRow` stores world coordinates (as the reset-time calls prove), so fresh stars/lava materialised near the start area instead of above the camera.
- **Medium — arrays never culled (unbounded growth):** star and lava filters both tested `y+G.camY<H+…`, which is almost always true once `camY` is negative, so dead items accumulated forever.
- **Low — star burst particles spawned at the wrong screen Y** (same sign error, `s.y+G.camY` in the particle spawn).

**Bugs fixed:** all six sites corrected to the renderer's frame (`s.y` world-to-world for collision; `y−G.camY` for screen-space culls/particles; `spawnRow(topY)`).

**Graphics upgrade:** 24 additive-glow rising ember particles behind gameplay (`drawEmbers()`, twinkle + drift, respawn at bottom); richer 3-stop background gradient (added warm `#2a1408` mid-stop); hero flame body now drawn with an orange `shadowBlur=18` halo. Plushie spherical look untouched; no beaks/wings/feathers; nothing depicts a Fire Baby harmed (the pre-existing lava "burned" game-over text was left as-is — it is original game copy, not new art).

**Weapon:** none — non-combat design (wall-jump climber/dodger; hazards are avoided, nothing is attacked).

**Final harness result:** loaded=true, console_error_count=0, page_error_count=0, start clicked + math gate solved by harness, canvas visible. **PASS**
**Staged:** yes (deploy copy byte-identical to edited source).

---

## Game 47 — Pyra Prime Dash (`game-47-v2.html` → `game-47-pyra-prime-dash.html`)

**Bugs found: 1 (Low)**

- **Low (latent crash risk) — `Math.min(...[])` = Infinity:** the gate-refill loop computed `Math.min(...G.gatesList.map(...))` unguarded; if the list ever emptied, the next gate would spawn at `y=-Infinity` and the refill logic would break down.

**Bugs fixed:** guarded to fall back to `-340` when the list is empty. (Full read-through otherwise clean: gate pass window ~40px vs max step ~26px/frame — no tunnelling; miss/victory/defeat state handling correct.)

**Graphics upgrade:** 24 additive-glow rising embers behind the gates; richer 3-stop background gradient; hero now has an orange `shadowBlur=20` halo.

**Weapon:** none — non-combat design (steer/dodge runner through gates; no attack mechanic).

**Final harness result:** loaded=true, console_error_count=0, page_error_count=0. **PASS**
**Staged:** yes.

---

## Game 48 — Ash Heap Hero (`game-48-v2.html` → `game-48-ash-heap-hero.html`)

**Bugs found: 3 (1 Medium, 2 Low)**

- **Medium — dragged item rendered away from the finger:** the drag zoom did `ctx.scale(1.25,1.25)` *before* `ctx.translate(it.x, it.y+bob)`, so the item was drawn at 1.25× its actual coordinates — grabbing an item made it jump away from the pointer, worse the further from the origin.
- **Low — duplicate `time` key in the `G` literal** (`time:90` silently overwritten by `time:0` later in the same object). Harmless at runtime because `reset()` sets `G.time=DUR`, but a trap for future edits.
- **Low — difficulty ramp ran backwards:** falling speed was `90+rand*60+G.time*0.5` with `G.time` counting *down* from 90, so items fell slower the longer you played (the spawn interval ramps correctly via elapsed time; the fall speed didn't).

**Bugs fixed:** translate-then-scale for the drag zoom (zoom now centred on the item); duplicate key removed; fall speed now uses elapsed time `(DUR-G.time)*0.5`, ramping up over the round.

**Graphics upgrade:** 24 additive-glow rising embers (smouldering ash-heap feel, kept subtle under the cool blue theme); background gradient gained a mid-stop; falling items gained a soft blue halo (`shadowBlur` 9, 20 while dragged) on top of the existing drag glow.

**Weapon:** none — non-combat design (drag-and-sort puzzle; no attack mechanic).

**Final harness result:** loaded=true, console_error_count=0, page_error_count=0. **PASS**
**Staged:** yes.

---

## Game 49 — Thermal Track (`game-49-v2.html` → `game-49-thermal-track.html`)

**Bugs found: 1 (Medium)**

- **Medium — level completion could fire repeatedly and farm score:** `levelComplete()` never changed `G.state` (unlike `gameOver()`, which sets `'over'` immediately). During the 500ms delay before the overlay appears the game was still in `'play'`, so continued tracing past 98.5% re-entered `levelComplete()`, adding the level points again each time and stacking overlays.

**Bugs fixed:** `levelComplete()` now sets `G.state='clear'` on entry; the existing pointer handlers already ignore input unless state is `'play'`, and the overlay callbacks restore `'play'` for the next track.

**Graphics upgrade:** flat `#0d0a14` background replaced with a rich 3-stop gradient; 24 additive-glow rising embers behind the track; green glow halo on the traced-progress stroke and on the START marker.

**Weapon:** none — non-combat design (precision tracing puzzle; no attack mechanic).

**Final harness result:** loaded=true, console_error_count=0, page_error_count=0. **PASS**
**Staged:** yes.

---

## Game 50 — Ember Bounce Master (`game-50-v2.html` → `game-50-ember-bounce-master.html`)

**Bugs found: 1 (Low)**

- **Low — malformed level layout:** Level 1 row 4 (`".##ss##.."`) is 9 characters in a 10-column grid; the missing cell read as `undefined` (treated as empty, so no crash, but the row was asymmetric and the data wrong).

**Bugs fixed:** row padded to `".##ss##..."` (10 cols, symmetric). Physics audit otherwise clean: ball speed cap and paddle/brick collision windows exceed the max per-frame step, so no tunnelling; win/lose state transitions are guarded.

**Graphics upgrade:** 24 additive-glow rising embers; background gradient gained a mid-stop; paddle now has an orange glow halo; the ball's existing glow is upgraded to gold while the new weapon is active.

**Weapon added — 🔥 Ember Splitter:**
- **What:** broken bricks have a 16% chance to drop a glowing Splitter Core that falls toward the paddle. Catch it and the ember ball **pierces straight through bricks for 5 seconds** (no bounce off bricks; still 1 damage per brick, still bounces off walls and paddle), with a gold halo and an on-screen "🔥 EMBER SPLITTER Ns" countdown.
- **Balance:** same per-brick damage as a normal hit — the power is positioning/tempo only, time-boxed to 5s, and the ball can still be lost underneath. Drop rate and duration keep it in line with the game's existing best feature (50-pt star bricks).
- **SFX:** new `sfx.power()` built on the existing `tone()` helper (rising triangle + sine sweep); pickup also fires the existing burst particles and a floater label.
- **Discoverability:** described in the start overlay help text; cores reset per level with the rest of the state.

**Final harness result:** loaded=true, console_error_count=0, page_error_count=0. **PASS**
**Staged:** yes.

---

## Game 51 — Volcanic Target (`game-51-v2.html` → `game-51-volcanic-target.html`)

**Bugs found: 1 (Low)**

- **Low — combo HUD went stale:** when the combo timer expired (or a target expired and reset the combo), `G.combo` was reset but `updateHUD()` was only re-run on hits or a random 10%-per-frame cadence, so the 🔥 pill could show a combo the player no longer had for a noticeable stretch.

**Bugs fixed:** both combo-reset sites now call `updateHUD()` immediately.

**Graphics upgrade:** 24 additive-glow rising embers; real targets now glow — gold targets get a gold `shadowBlur=20` halo, normal/small targets an orange `shadowBlur=12` halo (decoys deliberately stay dull grey so they remain readable as traps).

**Weapon added — 💣 Magma Bomb:**
- **What:** a new rare target type (5% of spawns, drawn as a glowing dark bomb orb). Tapping it detonates: **every other non-decoy target on screen is cleared for its base points** (gold 100 / small 30 / normal 15) with burst particles, screen shake, and a "MAGMA BOMB! +N" floater. Decoys are *not* cleared and give no penalty; other bombs don't chain.
- **Balance:** points are base value only — **no combo multiplier** — so a bomb is worth less than combo-chaining the same targets by hand; it's a rescue/clear tool, not a score multiplier.
- **SFX:** new `sfx.boom()` on the existing `tone()` helper (low sawtooth + square drop).
- **Discoverability:** described in the start overlay help text.

**Final harness result:** loaded=true, console_error_count=0, page_error_count=0. **PASS**
**Staged:** yes.

---

## Batch summary

| Game | Bugs found | Bugs fixed | Weapon | Harness |
|---|---|---|---|---|
| 46 Magma Jump 2D | 6 | 6 | — non-combat (climber/dodger) | PASS |
| 47 Pyra Prime Dash | 1 | 1 | — non-combat (runner/dodger) | PASS |
| 48 Ash Heap Hero | 3 | 3 | — non-combat (sorting puzzle) | PASS |
| 49 Thermal Track | 1 | 1 | — non-combat (tracing puzzle) | PASS |
| 50 Ember Bounce Master | 1 | 1 | 🔥 Ember Splitter (5s piercing ember, paddle-caught Splitter Core drops) | PASS |
| 51 Volcanic Target | 1 | 1 | 💣 Magma Bomb (rare target, clears screen for base points) | PASS |

All six edited sources pass `node --check`; all six deploy copies are byte-identical to their edited sources; no game was left broken or restored from backup. Backups for all six are in `~/workspace/fire-babys-overhaul/backups/`.
