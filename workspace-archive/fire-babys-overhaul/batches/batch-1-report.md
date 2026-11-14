# Batch 1 Report — Games 04–09 (Fire Babys overhaul, 2026-10-12)

Backups: `~/workspace/fire-babys-overhaul/backups/game-NN-v2.html.orig` for all six, taken before editing.
Method per game: full read, script extraction + `node --check`, call-site vs definition grep, manual logic trace. All edited scripts pass `node --check` again post-edit. Harness: `test-games-local.py --runs 1` (proxy vars stripped) against localhost deploy copies.

Shared graphics upgrade (all six games): a "living ember" backdrop layer — 24 cheap rising ember particles (`embers`/`drawEmbers`/`updateEmbers`), drawn with additive `lighter` compositing + orange shadow-glow immediately after the existing background gradient fill (all six already used gradient canvas backgrounds, so no flat-fill replacement was needed), updated in the main loop. Plus per-game hero/projectile glow listed below. Art rules respected: spherical flame/plushie designs untouched, no beaks/wings/feathers, no Fire Baby depicted harmed.

---

## Game 04 — Cinder's Ice Rink Chaos (`game-04-v2.html` → `game-04-cinders-ice-rink-chaos.html`)

**Bugs found (4 fixed, 1 noted):**
- Medium — Parental gate bypass: level-select buttons called `selLevel()` which started the game immediately, skipping the math gate entirely.
- Medium — Missing `pointercancel` handler: a cancelled pointer (e.g. OS gesture interruption) left `G.dragBlock` held forever and that ice block unusable for the rest of the level.
- Low — Division by zero in target collision: if a block's centre exactly coincided with a crystal's centre, `d===0` made the bounce normal `NaN`, giving the block `NaN` velocity (block effectively vanishes). Guarded.
- Low — (noted, dead code) `sfx.slideSfx()` is defined but never called. Left in place (harmless).

**Bugs fixed (how):**
- `selLevel(n)` now stores `pendingLevel` and opens the math gate; `startGame()` starts at `pendingLevel||1` and clears it.
- `pointerup` handler converted to named `releaseDrag()` and also registered for `pointercancel`.
- Bounce normal now `d>0 ? (b.x-t.x)/d : 1` (and `0` for y).

**Graphics upgrade:** Ember backdrop (shared). Ice blocks now always carry a hero glow — `shadowBlur 13` ice-blue (`#7fd4ff`), 22 while held; the new bomb block glows orange.

**Weapon added:** **Ember Bomb Block** — the last ice block placed in every level is a bomb block (pulsing orange core drawn on it). When it smashes a crystal at speed, every other crystal within 100px also shatters for +50 each (flat bonus, weaker per-target than a direct 100+combo smash, so it stays within balance). Uses existing `sfx.shatter()`. Mentioned in the overlay help text.

**Final harness result:** loaded=true, console_error_count=0, page_error_count=0 — **PASS**. Staged: **yes**.

---

## Game 05 — Lord Inferno's Ballista Siege (`game-05-v2.html` → `game-05-lord-infernos-ballista-siege.html`)

**Bugs found (3 fixed):**
- **Critical — Boss-wave soft-lock (level can never be completed).** In the wave spawner, the branch order was: `if (wave>=3 && (!boss || boss.dead) && wave===3) { /* only completes if boss already dead */ } else if (wave<3) {...} else if (wave===3 && !boss) spawnBoss();` — on wave 3 with the kill target met and no boss yet, the first branch was always taken, so `spawnBoss()` (in the later `else if`) was unreachable and `levelComplete()` could never fire. The player was left on an empty field forever: no spawns (kill target met), no win, no boss.
- High — Cumulative score wiped between levels: `reset(level)` set `G.score=0`, and the "NEXT LEVEL" callback calls `reset(G.level+1)`, so the score (and the final "Final Score") only ever reflected the last level played.
- Medium — Missing `pointercancel` handler: a cancelled drag left `dragging=true` stuck on.

**Bugs fixed (how):**
- Spawner reordered: `if (wave===3 && !boss) spawnBoss(); else if (boss && boss.dead) levelComplete(); else if (wave<3) advance wave;`
- `reset()` no longer zeroes score; the callers that should start fresh (`startGame`, `selLevel`, PLAY AGAIN, TRY AGAIN) now set `G.score=0; updateScoreUI()` explicitly, so score carries across levels.
- Added `pointercancel` → `dragging=false`. Also routed level buttons through the math gate via the same `pendingLevel` pattern as game 04 (they had the same gate-bypass as 04).

**Graphics upgrade:** Ember backdrop (shared). Bullets drawn with gold glow (`shadowBlur 12`); Ruko/ballista hero drawn with orange glow (`shadowBlur 16`).

**Weapon added:** **Ember Nova** power-up (new drop type `nova`, ✦ icon, orange) — 10 seconds of 4-way bolts at 0.20s interval = 20 bolts/s vs the previous best, Spread Shot's 3 bolts / 0.18s ≈ 16.7 bolts/s → +20% DPS, inside the ~25% cap. SFX: existing tone helper sweep on pickup + normal shoot SFX. Drops from the normal 18% enemy pickup roll alongside hp/rapid/spread/shield. Mentioned in overlay help text.

**Final harness result:** loaded=true, console_error_count=0, page_error_count=0 — **PASS**. Staged: **yes**.

---

## Game 06 — Blaze's Magma Bounce (`game-06-v2.html` → `game-06-blazes-magma-bounce.html`)

**Bugs found (3 fixed):**
- Low — `spawnText()` ignored its 5th argument: `POW!`/`BUMP!` calls pass a font size (18), but the function had no size parameter and floaters always rendered at 20px.
- Low — Missing `pointercancel` handler: a cancelled drag left Blaze `held` (and `held` fighters are skipped in the physics loop, freezing the player).
- Low — Dead code: unused `const hp` in `makeFighter()` (removed).

**Bugs fixed (how):**
- `spawnText(x,y,txt,color,size=20)` now stores `f.size`; floater rendering uses `f.size||20`.
- `pointerup` converted to named `releaseFling()` also registered for `pointercancel`.
- Removed the unused variable.

**Graphics upgrade:** Ember backdrop (shared). Blaze (player fighter) drawn with orange hero glow (`shadowBlur 18`); the new Surge orb and surge aura also glow.

**Weapon/power-up added:** **Magma Surge** — a glowing orb spawns inside the ring ~8s into each round (and respawns 10–14s after pickup). Touching it gives Blaze 8 seconds of Surge: collision impulse delivered **to foes** is ×1.25 (exactly the balance cap; Blaze's own knockback is unchanged — verified in both a/b orderings of the collision pair), with an orange aura ring while active. SFX via the existing `tone()` helper (rising sweep). Mentioned in overlay help text.

**Final harness result:** loaded=true, console_error_count=0, page_error_count=0 — **PASS**. Staged: **yes**.

---

## Game 07 — Ruko's Turbo Drift (`game-07-v2.html` → `game-07-rukos-turbo-drift.html`)

Design note: despite the "Turbo Drift" title this is a 4-lane rhythm/tap game (title/content mismatch is pre-existing content, not a code bug — not changed).

**Bugs found (3 fixed/noted):**
- Medium — Held-key auto-repeat phantom hits: `keydown` for D/F/J/K had no `e.repeat` guard, so holding a key re-fired `hitLane()` at OS repeat rate, consuming notes up to 140ms early (as Great instead of Perfect) and generating spurious judgments.
- Low — Theoretical empty-beatmap soft-lock: `songComplete()` keys off the last note; a randomly generated beatmap with 0 notes would never end the song. Practically impossible with current generation odds (~41–90 expected notes), now guarded.
- Low — (noted, dead code) `sfx.beat()` is defined but never called. Left in place (harmless).

**Bugs fixed (how):**
- `if (e.repeat) return;` at the top of the lane `keydown` handler.
- `genBeatmap()` pushes one fallback note if generation produced none.

**Graphics upgrade:** Ember backdrop (shared, fits the concert-stage backdrop). Falling notes now drawn with a lane-coloured glow (`shadowBlur 14`, save/restore wrapped).

**Weapon:** none — **no weapons — non-combat design** (pure rhythm game; no attack/target/defense mechanic).

**Final harness result:** loaded=true, console_error_count=0, page_error_count=0 — **PASS**. Staged: **yes**.

---

## Game 08 — Sizzle's Spark Jump (`game-08-v2.html` → `game-08-sizzles-spark-jump.html`)

**Bugs found (5 fixed):**
- High — Crumble platforms never crumbled away. The removal filter `p.crumble<=0 || p.type!=='crumble' || p.crumble>0` is true for every possible platform (any number is ≤0 or >0), and the follow-up removal loop keyed on `p.touched`, a flag nothing ever set. Result: stepped-on crumble platforms stayed forever (with an out-of-range `globalAlpha` once their timer expired) and could be re-bounced on indefinitely, defeating the mechanic.
- Medium — Platform tunneling: landing detection was a 24px window (`py < bottom < py+24`) tested once per frame; falling speed easily exceeds 24px/frame (dt cap 1/30, falls of 900–1500px/s = 30–50px/frame), so Sizzle could fall straight through platforms.
- Medium — Infinite-loop hazard: `Math.min(...G.platforms.map(...))` on an empty platform array yields `Infinity`, and the respawn `while (topY > G.camY-100)` loop would then never terminate (browser freeze).
- Low — Rocket-trail particles spawned in world Y (`G.py+25`) but particles are rendered in screen coordinates, so the trail appeared displaced by the camera offset.
- Low — Dead code: `const gained = (G.camY - targetCam)` computed after `G.camY` was assigned `targetCam` (always 0, never used). Removed.

**Bugs fixed (how):**
- Bouncing a crumble platform now sets `p.touched=true`; removal is a single clean filter `!(type==='crumble' && touched && crumble<=0)`.
- Swept landing test: `bottom >= py && prevBottom <= py+24` where `prevBottom = bottom - G.vy*dt`.
- Respawn now uses `G.platforms.length ? Math.min(...) : G.camY`.
- Rocket trail spawns at `G.py - G.camY + 25` (screen space).

**Graphics upgrade:** Ember backdrop (shared). Sizzle drawn with orange hero glow (`shadowBlur 18`).

**Weapon:** none — **no weapons — non-combat design** (pure vertical jumper/dodger; its spring/rocket platforms are movement power-ups, not attacks).

**Final harness result:** loaded=true, console_error_count=0, page_error_count=0 — **PASS**. Staged: **yes**.

---

## Game 09 — Ember Cascade (`game-09-v2.html` → `game-09-ember-cascade.html`)

**Bugs found (3 fixed):**
- High — Cannon splash created "zombie" enemies: splash damage (`o.hp -= dmg*0.6`) never ran the death check, so enemies reduced to ≤0 HP by splash kept marching, could still cost a life at the keep, and only died if directly hit again. Score/fire rewards for splash kills were also never paid.
- Medium — Shots could target corpses: the projectile impact search and the enemy movement loop didn't skip `e.dead` enemies, so beams wasted damage on already-dead enemies and a just-killed enemy could still move/leak in the same frame.
- (Process note) My first editing pass for this game itself introduced a defect — a string replacement matched the identical kill-block inside the new helper and mangled it into a self-recursive function referencing undefined variables (syntax-valid, runtime-fatal). Caught on diff review, fully repaired and re-verified (`node --check` + manual read + harness) before staging.

**Bugs fixed (how):**
- Extracted a single `killCheck(e)` helper (marks dead, pays score/fire, SFX + particles). Direct hits, splash victims, and chain victims all go through it now.
- Projectile impact search and enemy movement both skip `e.dead`; `damageEnemy()` early-returns on dead enemies.

**Graphics upgrade:** Ember backdrop (shared). Tower Fire Babies drawn with a glow in their tower colour (`shadowBlur 14`, save/restore wrapped).

**Weapon added:** **Storm tower** (4th tower-bar button, ⚡, 150🔥) — dmg 34, rate 1.2s (≈28.3 single-target DPS, on par with the Cannon's 40/1.4 ≈ 28.6, which also has splash), range 210, and **chain lightning**: each hit also zaps the nearest other invader within 110px for 50% damage. SFX via the existing `tone()` helper (sawtooth zap). Upgradeable through the existing tap-to-upgrade system; mentioned in overlay help text.

**Final harness result:** loaded=true, console_error_count=0, page_error_count=0 — **PASS**. Staged: **yes**.

---

## Summary table

| Game | Bugs found | Bugs fixed | Weapon / note | Harness | Staged |
|---|---|---|---|---|---|
| 04 Ice Rink Chaos | 4 (+1 noted dead code) | 4 | Ember Bomb Block | PASS 0/0 | yes |
| 05 Ballista Siege | 3 (1 Critical, 1 High) | 3 | Ember Nova power-up | PASS 0/0 | yes |
| 06 Magma Bounce | 3 | 3 | Magma Surge power-up | PASS 0/0 | yes |
| 07 Turbo Drift | 3 (1 noted dead code) | 2 + 1 guard | no weapons — non-combat design | PASS 0/0 | yes |
| 08 Spark Jump | 5 (1 High) | 5 | no weapons — non-combat design | PASS 0/0 | yes |
| 09 Ember Cascade | 3 (1 High) | 3 | Storm tower (chain lightning) | PASS 0/0 | yes |
