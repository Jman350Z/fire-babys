# Batch 9 Report — Games 52–55 + Game 02 (Blaze Runner)

Date: 2026-10-12 · Worker batch 9 · Backups in `~/workspace/fire-babys-overhaul/backups/` (`game-52-v2.html.orig`, `game-53-v2.html.orig`, `game-54-v2.html.orig`, `game-55-v2.html.orig`, `game-02-blaze-runner.html.orig` — all taken BEFORE editing).

Method per game: full read → script extraction + `node --check` (all passed, before and after edits) → call-site vs definition audit (no undefined-function calls found in any of the five; the only "possibly undefined" hits were false positives from comments/parameters) → paren-aware argument-count audit of every `arc` / `ellipse` / `createRadialGradient` / `createLinearGradient` / `roundRect` call → surgical fixes → graphics upgrade → stage source over deploy copy → harness re-run (`test-games-local.py --runs 1`, proxy vars stripped). PASS = loaded=true, console_error_count=0, page_error_count=0.

---

## Game 02 — Blaze Runner
Source: `~/workspace/fire-babys-fireworld/games/game-02-blaze-runner.html` → deploy: `~/workspace/.deploy/fire-world/game-02-blaze-runner.html`

### Bugs found
1. **HIGH (the known bug)** — `fireBaby()` called `createRadialGradient` with only 5 of the required 6 arguments (missing inner radius `r0`). Threw on every frame the character was drawn:
   - Buggy line (line 54 in the original):
     ```js
     const g=ctx.createRadialGradient(x,y-r*0.3,x,y,r*1.6);
     ```
     Parsed args: `x` (x0), `y-r*0.3` (y0), `x` (x1), `y` (y1), `r*1.6` (r1) — no `r0`.
   - Fix:
     ```js
     const g=ctx.createRadialGradient(x,y-r*0.3,r*0.2,x,y,r*1.6);
     ```
2. **HIGH (masked by bug 1 — found on harness round 1 after the gradient fix)** — all four eye/pupil arcs in `fireBaby()` were called with only 3 of the required 5 arguments, throwing `Failed to execute 'arc' on 'CanvasRenderingContext2D': 5 arguments required, but only 3 present`:
   - Buggy: `ctx.arc(x-r*0.32,y+r*0.1,r*0.2)` / `ctx.arc(x+r*0.32,y+r*0.1,r*0.2)` / `ctx.arc(x-r*0.32,y+r*0.12,r*0.1)` / `ctx.arc(x+r*0.32,y+r*0.12,r*0.1)`
   - Fix: appended `,0,7` (start/end angles, matching the game's existing arc style) to all four calls. This error never appeared in the baseline sweep because the gradient throw aborted `fireBaby()` before the eye code ran.
3. **LOW** — `gameOver()` had no re-entry guard; multiple gaps in the same frame could re-trigger it. Fix: `if(!run)return;` as its first statement.

### Graphics upgrade
- Living background: 24 rising ember particles (additive `'lighter'` glow, sinusoidal drift, driven by an always-incrementing tick so they animate on title/game-over screens too) over a new richer vertical sky gradient (`#3a1c07 → #241005 → #1a0d05`) replacing the flat clear.
- Glow: `ctx.shadowColor='#ff9a2a'`, `shadowBlur=18` halo on Blaze's flame body (reset to 0 immediately after the body fill). Spherical flame body, bold outline, toyetic look preserved; no beaks/wings/feathers; Blaze is never depicted harmed (the lava-gap fall still ends on the safety overlay, unchanged).

### Weapons
- None — **non-combat design**: pure runner/jumper (jump lava gaps, no attack/target/break/defense mechanic).

### Final harness result
- Round 1 (after gradient fix): loaded=true, console=0, **page=1** (the masked arc bug above).
- Round 2 (after arc fix): **loaded=true, console_error_count=0, page_error_count=0, errors=[] — PASS.**
- Staged: **yes** (source and deploy byte-identical).

---

## Game 52 — Lava Rush Arcade
Source: `game-52-v2.html` → deploy: `games/game-52-lava-rush-arcade.html`

### Bugs found
- No crash bugs (baseline confirmed: 0 errors; `node --check` OK; all gradients correct at 6/4 args).
- **LOW** — `pointerup` handler used `G._sy` without checking it was set; a pointer-up with no preceding canvas pointer-down computed `dy` from `undefined` (NaN) and fell through to `doJump()`. Fix: `if(G._sy===undefined)return;` guard. (Jump itself was state-guarded, so impact was negligible, but the handler is now correct.)

### Fixes
- The pointer-up guard above. No other code changes needed.

### Graphics upgrade
- Living background: 24 rising ember particles with additive glow and pulsing alpha over the existing volcano/lava gradient backdrop, drawn behind gameplay.
- Glow: orange `shadowBlur=22` halo on the player flame body (reset after fill). Spherical body/bold look preserved.

### Weapons
- None — **non-combat design**: endless runner/dodger (jump/slide, star pickups; no attack mechanic).

### Final harness result
- **loaded=true, console_error_count=0, page_error_count=0, errors=[] — PASS.** Staged: **yes**.

---

## Game 53 — Flame Drop Physics
Source: `game-53-v2.html` → deploy: `games/game-53-flame-drop-physics.html`

### Bugs found
- **LOW (robustness / soft-lock)** — in the user-ramp collision, the bounce normal was computed as `const nx=(G.fx-cx)/d, ny=(G.fy-cy)/d;` with no guard for `d === 0` (flame centre landing exactly on the ramp line). That produced NaN velocity/position, after which the flame could neither reach the goal nor fall off-screen — a silent soft-lock.
- No other bugs: `node --check` OK, all called functions defined, gradient correct.

### Fixes
- Safe normal: `const nx=d>0.001?(G.fx-cx)/d:0, ny=d>0.001?(G.fy-cy)/d:-1;` (falls back to a straight-up normal).

### Graphics upgrade
- Richer backdrop: flat `#0d0a14` fill replaced with a vertical gradient (`#1b1030 → #120a20 → #0d0a14`) plus 24 rising additive-glow ember particles.
- Glow: `shadowColor='#ff8a3a'`, `shadowBlur=20` halo on the falling flame (reset after fill).

### Weapons
- None — **non-combat design**: physics puzzle (draw ramps / place fans / erase tools are building tools, not weapons; no attack mechanic).

### Final harness result
- **loaded=true, console_error_count=0, page_error_count=0, errors=[] — PASS.** Staged: **yes**.

---

## Game 54 — Blaze's Zenith
Source: `game-54-v2.html` → deploy: `games/game-54-blazes-zenith.html`

### Bugs found
1. **MEDIUM** — `peakDone()` had no re-entry guard. Reaching the flag left `state='play'`, so every frame for the ~500 ms until the overlay appeared re-ran `peakDone()`: +150 score per frame (~+4,500 phantom points), repeated fanfare SFX, and dozens of stacked `setTimeout` overlays.
2. **MEDIUM (gameplay exploit)** — `hop()` could be triggered mid-air with no grounded check, giving infinite flight: a player could simply tap repeatedly and float straight to the peak flag, defeating the game.

### Fixes
- Added `G.won` flag: set/reset in `genPeak()`, `peakDone()` now starts with `if(G.won)return;G.won=true;`.
- Grounded-only hopping: added `G.grounded` — set `true` on platform landing, cleared on hop launch, while rising (`vy<-10`), and at the start of each falling landing check (so a crumbled-away platform correctly un-grounds the player). `hop()` returns early unless `G.grounded`.

### Graphics upgrade
- Living background: 24 rising additive-glow ember particles over the existing altitude-reactive sky gradient.
- Glow: orange `shadowBlur=20` halo on the player flame body (reset after fill).

### Weapons
- None — **non-combat design**: platform climber (hop between platforms, collect stars; no attack mechanic).

### Final harness result
- **loaded=true, console_error_count=0, page_error_count=0, errors=[] — PASS.** Staged: **yes**.
- Note: the harness's random-input play still progresses normally with grounded-only hopping (landing → hop cycles work as designed).

---

## Game 55 — Ruko's Final Dash
Source: `game-55-v2.html` → deploy: `games/game-55-rukos-final-dash.html`

### Bugs found
1. **LOW** — after `bossDown()` set `state='bossdown'`, `update()` kept running the full boss cycle during the 800 ms victory delay (and behind the victory overlay path): the defeated boss kept swaying, cycling its open/attack timer, launching new fireballs, and those fireballs could still `hurt()` the player and race the victory overlay with a game-over overlay.
2. **LOW** — a 2-damage overkill (see weapon below) could drive `bossHp` negative and set the boss health bar to a negative width. Fix: `Math.max(0, …)` clamp in `updBoss()`.

### Fixes
- `update()` now short-circuits in `bossdown` state: it only animates particles/floaters and returns — no boss attacks, no fireball updates, no player damage until the next boss starts.
- Boss-bar width clamped at 0.

### Graphics upgrade
- Living background: 24 rising additive-glow ember particles over the existing arena gradient.
- Glow: orange `shadowBlur=22` halo on Ruko (player) and `shadowBlur=14` orange glow on boss fireball projectiles (both reset after fill). Boss arena glow and hit-flash unchanged.

### Weapon added — **Ember Combo Charm** 🔥
- This game HAS an attack mechanic (tap/space dash-attack vs. 3 bosses), so one new weapon/power-up was added.
- Mechanic: a combo counter (`G.combo`, reset on new game) counts landed dash-hits; **every 4th hit deals DOUBLE damage (2 HP instead of 1) and double score** — average power is exactly +25% over the existing best (the standard 1-damage hit), so it stays within the balance cap. Obtainable in normal play: always active, no pickup or unlock needed.
- SFX: new `sfx.burst()` built on the game's existing `tone()` helper (rising sawtooth sweep + high sine sparkle), plus a bigger gold particle burst and a "💥 EMBER BURST +pts" floater; normal hits keep the original `sfx.hit()`.
- Help text: overlay now includes "🔥 **NEW — Ember Combo Charm:** every 4th hit deals DOUBLE damage!".

### Final harness result
- **loaded=true, console_error_count=0, page_error_count=0, errors=[] — PASS.** Staged: **yes**.

---

## Batch summary
| Game | Bugs (severity) | Weapon | Harness | Staged |
|---|---|---|---|---|
| 02 Blaze Runner | 2 High (gradient 5-arg; 4 eye arcs 3-arg, masked by #1) + 1 Low | none — non-combat runner | PASS (round 2) | yes |
| 52 Lava Rush Arcade | 1 Low | none — non-combat runner/dodger | PASS | yes |
| 53 Flame Drop Physics | 1 Low (NaN soft-lock) | none — non-combat puzzle | PASS | yes |
| 54 Blaze's Zenith | 2 Medium (peakDone re-entry; infinite-flight hop) | none — non-combat climber | PASS | yes |
| 55 Ruko's Final Dash | 2 Low (boss attacks after death; negative HP bar) | **Ember Combo Charm** (every 4th hit ×2 dmg, +25% avg) | PASS | yes |

All five edited files' script blocks pass `node --check`. All deploy copies are byte-identical to their edited sources. No game was left broken; no backups needed restoring.
