# Batch 5 Report — Games 28–33 (Fire Babys Overhaul, 2026-10-12)

Method per game: backup to `backups/game-NN-v2.html.orig` → full source read → `node --check` on the script block (all 6 passed pre- and post-edit) → call-site vs definition grep (no undefined-function calls in any of the 6 — all bare-call hits were comments/strings) → surgical fixes → graphics upgrade → weapon where the design has combat → stage to `.deploy` → harness re-test (`test-games-local.py --runs 1`, proxy vars stripped). PASS = loaded=true, console_error_count=0, page_error_count=0.

Shared graphics upgrade (all 6 games): 24 additive rising ember particles (`globalCompositeOperation='lighter'`, orange glow, twinkle) drawn behind gameplay every frame, plus `ctx.shadowBlur` halo glow in the hero's flame color on the player character (and on projectiles/targets/towers where applicable). No character redesign; no beaks/wings/feathers added; no Fire Baby depicted harmed.

---

## Game 28 — Thermal Tug-of-War (`game-28-v2.html` → `game-28-thermal-tug-of-war.html`)

**Bugs found (2)**
1. **Low — Default difficulty mismatch.** The Easy button renders pre-selected (`class="dbtn sel" data-d="0"`), but `G.diff` initialised to `1` (Medium), so a player who just pressed PLAY got Medium AI while the UI said Easy.
2. **Low — Dead code (noted, left in place):** `sfx.round()` is defined but never called.

**Bugs fixed (1 + weapon/graphic work)**
- `G.diff` initial value `1` → `0`, matching the pre-selected Easy button.

**Graphics upgrade:** living ember background behind the rope arena (the game already had a 3-stop gradient backdrop, kept); `shadowBlur` flame halo on all six puller Fire Baby heads in `drawTeam()`; new on-canvas Ember Anchor charge meter.

**Weapon added — ⚓ Ember Anchor (Anchor Slam).** Every tap charges a 20-tap meter; at full charge, SPACE fires a one-shot +0.16 rope pull (a single tap is +0.028, so the slam is worth ~5.7 taps after 20 taps of charging — a modest, balanced burst, not a win button). SFX via a new `sfx.anchor()` built on the existing `tone()` helper (low triangle drop + rising sine), gold particle burst at the flag, win check preserved. Meter + "PRESS SPACE" prompt drawn during play/countdown; explained in the overlay help text.

**Final harness:** loaded=true, console=0, page=0 — **PASS**. Staged: yes (deploy copy byte-identical to source).

## Game 29 — Blaze's Jump Quest (`game-29-v2.html` → `game-29-blazes-jump-quest.html`)

**Bugs found (2)**
1. **High — Soft-lock after level select.** `showLevels()` sets `obtn.style.display='none'` to hide the PLAY button on the level-picker, and `showOverlay()` never restored it. Every later overlay (OUCH / YOU FELL / LEVEL CLEAR / QUEST COMPLETE) therefore appeared with **no button at all** — the player could never retry or advance. Guaranteed dead end on the first death or level clear after using the picker.
2. **Medium — Score farming on retry.** `initLevel()` preserves `G.score`, but death/fall retries rebuild the level's coins/enemies from scratch, so dying on purpose let a player re-collect the same coins and re-stomp the same enemies for unlimited score.

**Bugs fixed (2)**
1. `showOverlay()` now restores `obtn.style.display=''` before wiring its button — every end-of-level/death overlay is actionable again.
2. `initLevel()` snapshots `G.startScore = G.score`; both retry callbacks (enemy hit, fell in pit) now restore `G.score = G.startScore` before re-initialising, so a retry replays the level at its starting score. Advancing to the next level still carries the score forward (snapshot is taken after the clear bonus is added).

**Graphics upgrade:** living ember background (screen-space, behind the parallax hills); player flame body upgraded with an 18px `shadowBlur` halo in addition to its existing radial glow.

**Weapon added — 🔥 Ember Blaster (fireball).** Press **F** (or X) to shoot a fireball in the facing direction: 540 px/s, 0.9 s life, 0.35 s cooldown, kills one ash enemy for the same 100 pts as a stomp (exactly as strong as the game's existing best attack — no stronger), with burst particles and a new `sfx.shoot()` through the existing `tone()` helper. Mentioned in the overlay help text.

**Final harness:** loaded=true, console=0, page=0 — **PASS**. Staged: yes.

## Game 30 — Ruko's Dash Blitz (`game-30-v2.html` → `game-30-rukos-dash-blitz.html`)

**Bugs found (2)**
1. **Medium — Coin points erased every frame.** `update()` recomputes `G.score = Math.floor(G.dist)` unconditionally, so the `G.score += 10` from a coin pickup survived less than one frame. Coins visibly collected but never actually scored (and best-score was distance-only).
2. **Medium — Touch swipe-down (slide) effectively broken.** `pointerdown` fires `doJump()` immediately; the subsequent downward swipe called `doSlide()`, which refuses to slide while airborne (`G.py >= GY()-2` check) — and by landing time the swipe was long over. Touch players could not slide under barriers at all (keyboard S/↓ worked).

**Bugs fixed (2)**
1. Added a persistent `G.bonus` accumulator: coins add to `bonus`, and score is now `Math.floor(G.dist) + G.bonus` everywhere (update loop, coin pickup, HUD, best-score in `die()`).
2. Swipe intent is now captured: `pointerdown` records the start Y; a >50 px downward `pointermove` slams the player down (`vy` boost) and queues a slide (`G.slideQ`, 0.35 s) that triggers the instant the player is grounded. Tap-to-jump behaviour is unchanged.

**Graphics upgrade:** living ember background behind the parallax hills; 18px flame `shadowBlur` halo on the player body.

**Weapon:** none — **non-combat design** (pure endless runner/dodger: jump/slide/dash-boost only, no attack/target/break mechanic). Graphics only, per batch rules.

**Final harness:** loaded=true, console=0, page=0 — **PASS**. Staged: yes.

## Game 31 — Boulder's Rampart (`game-31-v2.html` → `game-31-boulders-rampart.html`)

**Bugs found (3)**
1. **Medium — Cannon splash kills never credited.** In the shot-hit code, splash damage was applied to nearby enemies (`o.hp -= dmg*0.6`) but the death/gold/score check only ran for the primary target. Splash-killed enemies kept marching with ≤0 HP as unkillable-until-hit-again zombies and paid out nothing.
2. **Low — Fractional gold in the HUD.** Passive income (`G.gold += dt*1.5`) makes gold a float, and `updateHUD()` printed it raw — the pill showed values like `🪙 150.48333333333`.
3. **Low — Wave counter off by one during play.** HUD showed `Math.min(G.wave+1,10)`, so while Wave 1 was actually being fought the pill read "Wave 2/10" (the +1 only made sense in the pre-game `wave=0` state).

**Bugs fixed (3)**
1. New unified `killEnemy(e)` helper (dead/HP guard, gold + score credit, kill SFX, burst, HUD refresh) now runs for the primary target, every splash victim, and burn kills (below).
2. HUD gold now displays `Math.floor(G.gold)`.
3. HUD wave now displays `Math.min(Math.max(G.wave,1),10)` — the wave actually in progress.

**Graphics upgrade:** flat `#0d0a14` background fill replaced with a richer 3-stop gradient (deep violet → original tone → warm ember base) plus the living ember layer; `shadowBlur` glow on every tower head (in its tower color) and on every projectile; burning enemies (new tower, below) get a flickering orange ring so the effect is readable.

**Weapon added — 🔥 Ember Tower (4th tower type).** Cost 125 (between Cannon 100 and late-game income), range 140, damage 38 per shot at 1.5 s rate (direct DPS ≈ 25.3 vs Cannon's ≈ 29.2 direct, before Cannon splash — so not stronger than the existing best), and each hit sets the enemy ablaze: burn ticks of 6 dmg every 0.5 s for 2 s. Selectable from the tower bar (new 🔥 button; the generic `.tbtn` selection handler picks it up), SFX through the existing `tone()`/`noise()` helpers (`sfx.shoot`/`sfx.boom`-family kill path), and described in the overlay help text.

**Final harness:** loaded=true, console=0, page=0 — **PASS**. Staged: yes.

## Game 32 — Cinder's Glide (`game-32-v2.html` → `game-32-cinders-glide.html`) — KNOWN BUG

**Exact buggy line (original file):** in `render()` —
```js
const t=G.terr;
if(t.length>1){
```
**Root cause:** `G.terr` is created only inside `reset()` (`G.terr=[];` in the terrain-init block), and `reset()` runs only when a game starts. The render loop starts immediately on page load (`requestAnimationFrame(loop)`) in the `title` state, so on the very first frame `G.terr` is still `undefined` and `t.length` throws `TypeError: Cannot read properties of undefined (reading 'length')` — before the player ever presses PLAY. (The same uninitialised-array hazard existed latently in `terrainY()` and `extendTerrain()`.)

**Bugs found (3)**
1. **High — the known page error above.**
2. **Medium — Gem bonus erased every frame.** Same pattern as game 30: `update()` recomputes `G.score = Math.floor(G.dist)`, wiping the `+25` gem bonus within a frame. Gems never actually scored.
3. **Low — Stuck "holding" state.** `holding` was cleared only by `pointerup` on the canvas itself; releasing the pointer outside the canvas (or the pointer leaving the window mid-hold) left Cinder rising forever until a crash.

**Bugs fixed (3)**
1. `terr:[]` (and `bonus:0`, below) now initialise in the `G` object literal itself, so `render()` is safe from the first frame; belt-and-braces guards added: `const t = G.terr||[]` in `render()` and in `terrainY()` (which now returns a safe default for an empty array).
2. Persistent `G.bonus` accumulator (same fix shape as game 30): gems add +25 to `bonus`; score = `Math.floor(G.dist) + G.bonus`.
3. Added a window-level `addEventListener('pointerup', …)` that also clears `holding`.

**Proof of fix:** the untouched `.orig` backup was staged under a temporary name and re-run through the harness — it reproduced the baseline exactly: loaded=true, **page_error_count=1**, error text `"Cannot read properties of undefined (reading 'length')"` (report: `reports/game-32-orig-baseline.json`). The fixed build: loaded=true, **console_error_count=0, page_error_count=0, errors=[]** — the error is gone.

**Graphics upgrade:** living ember background behind the cave terrain; 18px flame `shadowBlur` halo on the player; blue glow halo on gems.

**Weapon:** none — **non-combat design** (pure glide/dodge/collect runner: hold-to-rise, thread the gaps, grab gems; no attack/target/break mechanic). Graphics only, per batch rules.

**Final harness:** loaded=true, console=0, page=0 — **PASS**. Staged: yes.

## Game 33 — Inferno Aim (`game-33-v2.html` → `game-33-inferno-aim.html`)

**Bugs found (2)**
1. **Medium — Duplicate `time` key in the `G` object literal.** The literal declared `time:60` (the intended 60-second countdown start) and later `time:0`; the later key silently won, so the state object started with the wrong value and only `reset()`'s assignment masked it. A latent trap: any code reading `G.time` before the first `reset()` (or any future refactor of `reset()`) would see 0, and the duplicated key is exactly the class of silent shadowing this overhaul is hunting.
2. **Low — Dead no-op (noted, left in place):** `else G.time+=0;` in the main loop, and the `streak` counter is maintained but never read.

**Bugs fixed (1)**
1. Removed the shadowing second `time:0` key; the literal now declares `time:60` once, matching `DUR` and `reset()`.

**Graphics upgrade:** living ember background behind the gallery; `shadowBlur` halos on golden targets (gold), normal flame targets (orange), and the new Nova Star (below).

**Weapon added — 💥 Nova Star (rare special target).** A new target type spawning on ~6% of spawns (bomb/golden/bullseye shares kept at ≈14%/10%/10% by re-basing the roll). Worth 20 base points (between a normal 10 and a bullseye 30 — well under the golden 50×combo best), and on a hit it bursts every other non-bomb target on screen for a flat **5 pts each — half a normal target's value**, so the area effect is strictly weaker per-target than shooting them yourself. Bombs are never cleared by it. SFX via a new `sfx.nova()` using the game's existing `noise()` + `tone()` helpers, screen shake, big burst, and a combined `💥 NOVA +N` floater. Star-shaped render with glow; explained in the overlay help text.

**Final harness:** loaded=true, console=0, page=0 — **PASS**. Staged: yes.

---

## Batch summary

| Game | Bugs found | Bugs fixed | Weapon / note | Harness |
|---|---|---|---|---|
| 28 Thermal Tug-of-War | 2 | 1 | ⚓ Ember Anchor (SPACE slam) | PASS 0/0 |
| 29 Blaze's Jump Quest | 2 | 2 | 🔥 Ember Blaster (F fireball) | PASS 0/0 |
| 30 Ruko's Dash Blitz | 2 | 2 | no weapons — non-combat design | PASS 0/0 |
| 31 Boulder's Rampart | 3 | 3 | 🔥 Ember Tower (burn DoT) | PASS 0/0 |
| 32 Cinder's Glide | 3 | 3 | no weapons — non-combat design | PASS 0/0 (known bug proven fixed) |
| 33 Inferno Aim | 2 | 1 | 💥 Nova Star target | PASS 0/0 |

All 6 staged (deploy copies verified byte-identical to edited sources). No game left broken; no backups needed restoring. Two Low dead-code items were documented but intentionally left untouched (game 28 `sfx.round`, game 33 `G.time+=0` no-op / unused `streak`) — zero runtime effect, noted here rather than churned.
