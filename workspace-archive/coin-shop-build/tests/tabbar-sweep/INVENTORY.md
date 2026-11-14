# Tab-Bar Sweep — HUD Inventory (PREP, read-only)

Built 2026-10-21 for Jeff's HUD law (2026-10-21): **every game's buttons move into ONE slim tab bar at the top like browser tabs — 90–99% of all buttons, on EACH game.** The bar holds only play essentials (score/level/targets/trophy readouts, character tabs where a game has them, the game's action button, ONE pause button) + a slim status strip under it; the play field below is completely clear. **All menu buttons (restart, sound, language, exit-to-hub) appear ONLY inside the pause menu.** Game 1 (Slingshot Cascade) is the template, being built separately — **this inventory does not modify any game file.**

**Scope:** every playable game file in the staged ship tree `~/workspace/coin-shop-build/` itself (the tree holds the game files directly — no deferral to `~/workspace/.deploy/` for games). Catalog numbers are the site's own numbering from `play-all.html` (1–57) plus the two standalone games (`play.html`, `3d.html`) = **59 playable files**. Hub/listing pages (`fire-world.html`, `arcade.html`, `play-all.html`, `index.html`, `characters.html`, etc.) are not games and are out of scope.

## Marking legend

| Mark | Meaning |
|---|---|
| **T** | Moves to the tab bar — play essential (the ONE pause button; character tabs) |
| **A** | The game's action button — tab bar, right end (accent tab) |
| **S** | Status/readout — goes to the slim status strip under the bar |
| **P** | Menu button — moves INTO the pause menu, off the play screen |
| in pause menu ✓ | Already lives in a pause menu today |
| CTRL | Gameplay thumb control (pads, jump/slide/hold/tap, flippers, steering) — does NOT move; thumb-positioned by design |
| TOOL | Gameplay tool (reset puzzle, undo, shuffle, speed, clear…) — stays in the play area |
| FIELD-PANEL | In-field gameplay panel/popup (build menus, upgrade picks, tower panel) — does NOT move |
| START-SCREEN / END-SCREEN | Lives on the start or game-over screen — stays on its screen |
| GATE | Math-gate chrome (UNLOCK / ▶ PLAY / START CHALLENGE / CHECK) — security UI driven by `auth-gate.js`; NEVER part of the sweep |

**Judgment rule used for A vs CTRL:** a button is marked **A** only when it is the game's distinct special/power action (POW, DASH, DRIFT, NOVA, SLAM). Pure thumb mechanics (JUMP, SLIDE, DROP, HOLD, TAP, LAUNCH, GAS, direction pads) are CTRL even when they are the main verb — moving them to the top bar would make the game unplayable one-handed. Two borderline cases are flagged inline (#39 LAUNCH, #55 DASH).

## Shared chrome — what every game already has in common

- **Every one of the 59 files loads exactly ONE shared script: `auth-gate.js`** (relative path in the Fire World games; absolute `https://firebabys.io/auth-gate.js` in `play.html` / `3d.html`). No game loads a shared HUD/nav component — **every game's HUD is hand-rolled inline in its own file** (a `#hud` div or an unclassed flex header row, its own CSS). There is no single edit point for the sweep; the template pattern has to be pasted per file.
- **The math gate is pasted into the markup of 56 of the 59 files** as a static block (UNLOCK `checkMath()` / `obtn` ▶ PLAY / `fbg-start` / `fbg-check`), driven by `auth-gate.js`. Exceptions: `game-02-blaze-runner.html` (#3), `play.html`, `3d.html`, where the gate is injected by the script. Sweep edits must not disturb the gate block, and gate buttons must never be swept into a pause menu.
- **`auth-gate.js` also injects the 🌐 language globe + account badge/sign-out** into every page (visible top-right in Jeff's Game 1 screenshot). That chrome is already global and identical everywhere — it is not per-game sweep work, but the new tab bar must not collide with it (portal: it sits above the game layer).
- **Language inside the pause menu:** only Game 1's in-flight template has a language slot in its pause menu so far (`fbLangSlot`). All other games reach language only via the gate-injected globe — the sweep's pause-menu build should add the language item the way the template does.
- **Readouts** (score/level/etc.) are DOM spans inside the header row in most games, but in some Family-B games parts are **canvas-drawn** (flagged per game, e.g. #9 score, and the "PAUSED" text in all of Family B). Canvas-drawn readouts cannot move into a DOM strip without new DOM elements + sync code.
- All 57 Fire World games render play on **1 canvas**; `play.html` uses 3, `3d.html` uses 2.

## The families (identical HUD patterns)

| Family | Games | Count | HUD pattern | Pause today |
|---|---|---|---|---|
| TEMPLATE | #1 | 1 | Being rebuilt now (tab bar + fbMenuCard pause card) | Real menu (in flight) |
| A — `pauseOv` shell | #3–#8 | 6 | Header: ← back · ⏸ `pauseBtn` · 🔊 `muteBtn`. Level select on start screen in most. | **Real menu**: `#pauseOv` = ▶ RESUME + ↻ RESTART (`prestartBtn`) |
| B — header-icon shell | #2, #9–#14, #21–#44, #56, #57 | 33 | Header row in `#hud`: ← back · ⏸ `pauseBtn` · 🔊 `muteBtn`, most also ↻ `restartBtn`. | **No menu** — freeze + canvas "PAUSED" text / `pausedTxt` |
| B-minimal (subset of B) | #25, #27, #30, #32, #34, #37, #40 | 7 | Same B shell but **no restart control exists anywhere** | No menu |
| C — `btn*` shell | #15–#20, #45–#55 | 17 | Header: ⏸ `btnPause` · ↻ `btnRestart` · 🔊 `btnMute`. Pause button flips to ▶ while paused. | **No menu** — text-only `pauseBanner` / `pausedTxt` / `pauseLbl` |
| One-offs | `play.html`, `3d.html` | 2 | JS-injected / multi-screen chrome (see their sections) | play.html: injected menu ✓ · 3d.html: real menu ✓ |

**Bottom line: only 8 of 59 games have anything like a pause menu today (template #1, family A ×6, and the two one-offs). The other 50 need the pause menu BUILT, not just buttons moved.**

---

## Per-game inventory

Gate buttons (UNLOCK / ▶ PLAY / START CHALLENGE / CHECK — identical in every Fire World game) are listed once per game as `GATE ×4` and not repeated item-by-item.

### #1 — Fire Babys Slingshot Cascade · `fire-world/slingshot-cascade/index.html` · Family TEMPLATE · Effort — (template)
- Buttons: `pauseBtn` '⏸' [T] · `resumeBtn` '▶ Resume' [in pause menu ✓] · `muteBtn` '🔊' [P] · `back` '← Fire World' [P] · `${h.emoji} ${h.name} ${h.sIcon} ${h.sName}` '${h.emoji} ${h.name} ${h.sIcon} ${h.sName}' [T] · `${i}` '${i}' [START-SCREEN] · `POW` 'POW' [A] · GATE ×4
- Readouts [S]: `level`, `score`
- Pause: **Being built right now** by the template agent (snapshot at inventory time): `#fbMenuCard` pause card with Resume, a Sound item, and a Language slot (`fbLangSlot`). Do not touch this file.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ The ONLY game with in-game character tabs (hero chips are JS-template-generated: `heroChip` class, `selHero(k)`). Drag-to-aim slingshot on canvas. File is mid-edit by the template agent — this row is a snapshot.

### #2 — Ruko's Panic Dash · `fire-world/rukos-panic-dash/index.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `restartBtn` '↻' [P] · `dashBtn` '🌪️ DASH' [A] · `${i}` '${i}' [START-SCREEN] · `◀ LEFT` '◀ LEFT' [CTRL] · `▶ RIGHT` '▶ RIGHT' [CTRL] · `JUMP` 'JUMP' [CTRL] · `DOWN` 'DOWN' [CTRL] · GATE ×4
- Readouts [S]: `level`, `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ Folder-index shell like #1. DASH button sits in the header row. Four thumb pads (LEFT/RIGHT/JUMP/DOWN). Level select on start screen.

### #3 — Blaze Runner · `fire-world/game-02-blaze-runner.html` · Family A · Effort S
- Buttons: `startBtn` '▶ PLAY' [START-SCREEN] · `jumpBtn` '⬆' [CTRL] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `back` '← Fire World' [P] · `resumeBtn` '▶ RESUME' [in pause menu ✓] · `prestartBtn` '↻ RESTART' [P] · `againBtn` '↻ RUN AGAIN' [END-SCREEN]
- Readouts [S]: `score`, `startBtn`
- Pause: **Yes — real pause menu.** `#pauseOv` overlay contains ▶ RESUME + ↻ RESTART. Sweep only has to pull 🔊 mute + ← Fire World in from the header.
- Chrome: hand-rolled inline HUD + `auth-gate.js` (gate injected by script). Canvas ×1.
- ⚠️ Smallest game (21K) and the family-A prototype. Filename says `game-02` but it IS catalog #3 (catalog #1/#2 are the two folder games). NO static gate block in markup — the gate is fully injected by auth-gate.js here. `againBtn` (↻ RUN AGAIN) lives on the end screen.

### #4 — Cinder's Ice Rink Chaos · `fire-world/games/game-04-cinders-ice-rink-chaos.html` · Family A · Effort S
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `resumeBtn` '▶ RESUME' [in pause menu ✓] · `prestartBtn` '↻ RESTART' [P] · `${i}` '${i}' [START-SCREEN] · GATE ×4
- Readouts [S]: `level`, `score`
- Pause: **Yes — real pause menu.** `#pauseOv` overlay contains ▶ RESUME + ↻ RESTART. Sweep only has to pull 🔊 mute + ← Fire World in from the header.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #5 — Lord Inferno's Ballista Siege · `fire-world/games/game-05-lord-infernos-ballista-siege.html` · Family A · Effort M
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `resumeBtn` '▶ RESUME' [in pause menu ✓] · `prestartBtn` '↻ RESTART' [P] · `${i}` '${i}' [START-SCREEN] · GATE ×4
- Readouts [S]: `hpbar`, `hpfill`, `level`, `score`, `wave`
- Pause: **Yes — real pause menu.** `#pauseOv` overlay contains ▶ RESUME + ↻ RESTART. Sweep only has to pull 🔊 mute + ← Fire World in from the header.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ Largest family-A file (65K). HP bar (`hpbar`/`hpfill`) + `wave` readout join the strip. Drag-aim ballista.

### #6 — Blaze's Magma Bounce · `fire-world/games/game-06-blazes-magma-bounce.html` · Family A · Effort S
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `steerL` '◀' [CTRL] · `steerR` '▶' [CTRL] · `resumeBtn` '▶ RESUME' [in pause menu ✓] · `prestartBtn` '↻ RESTART' [P] · GATE ×4
- Readouts [S]: `level`, `round`, `score`
- Pause: **Yes — real pause menu.** `#pauseOv` overlay contains ▶ RESUME + ↻ RESTART. Sweep only has to pull 🔊 mute + ← Fire World in from the header.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ On-screen steering buttons `steerL`/`steerR` (CTRL). No level select.

### #7 — Ruko's Turbo Drift · `fire-world/games/game-07-rukos-turbo-drift.html` · Family A · Effort S
- Buttons: `back` '← Fire World' [P] · `driftBtn` '💨 DRIFT' [A] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `resumeBtn` '▶ RESUME' [in pause menu ✓] · `prestartBtn` '↻ RESTART' [P] · `◀ LEFT` '◀ LEFT' [CTRL] · `▶ RIGHT` '▶ RIGHT' [CTRL] · GATE ×4
- Readouts [S]: `score`
- Pause: **Yes — real pause menu.** `#pauseOv` overlay contains ▶ RESUME + ↻ RESTART. Sweep only has to pull 🔊 mute + ← Fire World in from the header.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #8 — Sizzle's Spark Jump · `fire-world/games/game-08-sizzles-spark-jump.html` · Family A · Effort S
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `resumeBtn` '▶ RESUME' [in pause menu ✓] · `prestartBtn` '↻ RESTART' [P] · `◀ LEFT` '◀ LEFT' [CTRL] · `▶ RIGHT` '▶ RIGHT' [CTRL] · `JUMP` 'JUMP' [CTRL] · GATE ×4
- Readouts [S]: `level`, `score`
- Pause: **Yes — real pause menu.** `#pauseOv` overlay contains ▶ RESUME + ↻ RESTART. Sweep only has to pull 🔊 mute + ← Fire World in from the header.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #9 — Ember Cascade · `fire-world/games/game-09-ember-cascade.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `restartBtn` '↻' [P] · GATE ×4
- Readouts [S]: `lives`, `wave` — ⚠️ no DOM `score` id (canvas-drawn score)
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ Score is CANVAS-drawn here (no `score` DOM id) — the strip needs a new DOM readout or this game keeps a canvas score. Lives/wave are DOM chips. Pause draws "PAUSED" on canvas.

### #10 — Caldera Climb · `fire-world/games/game-10-caldera-climb.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `restartBtn` '↻' [P] · `${i}` '${i}' [START-SCREEN] · `◀ LEFT` '◀ LEFT' [CTRL] · `▶ RIGHT` '▶ RIGHT' [CTRL] · GATE ×4
- Readouts [S]: `level`, `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #11 — Magma Trench Dodge · `fire-world/games/game-11-magma-trench-dodge.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `restartBtn` '↻' [P] · `◀ LEFT` '◀ LEFT' [CTRL] · `▶ RIGHT` '▶ RIGHT' [CTRL] · GATE ×4
- Readouts [S]: `hp`, `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #12 — Volcanic Pinball · `fire-world/games/game-12-volcanic-pinball.html` · Family B · Effort L
- Buttons: `back` '← Fire World' [P] · `flipL` '' [CTRL] · `flipR` '' [CTRL] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `restartBtn` '↻' [P] · `FLIP` 'FLIP' [CTRL] · `NUDGE` 'NUDGE' [CTRL] · `FLIP` 'FLIP' [CTRL] · `LAUNCH` 'LAUNCH' [CTRL] · GATE ×4
- Readouts [S]: `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ Pinball: `flipL`/`flipR` are invisible flipper tap-zones and there are duplicate FLIP/NUDGE/LAUNCH text buttons. Flipper controls MUST stay at the bottom corners — do not tab them.

### #13 — Pyra Prime Defense · `fire-world/games/game-13-pyra-prime-defense.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `restartBtn` '↻' [P] · `${i}` '${i}' [START-SCREEN] · `◀ LEFT` '◀ LEFT' [CTRL] · `▶ RIGHT` '▶ RIGHT' [CTRL] · `LAUNCH` 'LAUNCH' [CTRL] · GATE ×4
- Readouts [S]: `level`, `lives`, `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #14 — Sparky Speedway · `fire-world/games/game-14-sparky-speedway.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `▲` '▲' [CTRL] · `◀` '◀' [CTRL] · `▶` '▶' [CTRL] · `▼` '▼' [CTRL] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `restartBtn` '↻' [P] · GATE ×4
- Readouts [S]: `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ D-pad (`dbtn` ▲◀▶▼) snake steering — CTRL, stays.

### #15 — Cinder's Melt-Down · `fire-world/games/game-15-cinders-melt-down.html` · Family C · Effort M
- Buttons: `back` '← Fire World' [P] · `btnPause` '⏸' [T] · `btnRestart` '↻' [P] · `btnMute` '🔊' [P] · `${names[i-1]}` '${names[i-1]}' [START-SCREEN] · GATE ×4
- Readouts [S]: `score`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #16 — Inferno Drop · `fire-world/games/game-16-inferno-drop.html` · Family C · Effort M
- Buttons: `back` '← Fire World' [P] · `btnPause` '⏸' [T] · `btnRestart` '↻' [P] · `btnMute` '🔊' [P] · GATE ×4
- Readouts [S]: `score`, `timerbar`, `timerfill`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #17 — Flame Sprint 2D · `fire-world/games/game-17-flame-sprint-2d.html` · Family C · Effort M
- Buttons: `back` '← Fire World' [P] · `btnPause` '⏸' [T] · `btnRestart` '↻' [P] · `btnMute` '🔊' [P] · `DROP` 'DROP' [CTRL] · GATE ×4
- Readouts [S]: `score`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ DROP is the stack-timing thumb button — CTRL.

### #18 — Blaze's Thermal Run · `fire-world/games/game-18-blazes-thermal-run.html` · Family C · Effort M
- Buttons: `back` '← Fire World' [P] · `btnPause` '⏸' [T] · `btnRestart` '↻' [P] · `btnMute` '🔊' [P] · `${i}` '${i}' [START-SCREEN] · `▲` '▲' [CTRL] · `◀` '◀' [CTRL] · `▶` '▶' [CTRL] · `▼` '▼' [CTRL] · GATE ×4
- Readouts [S]: `level`, `lives`, `score`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #19 — Ruko's Lava Leap · `fire-world/games/game-19-rukos-lava-leap.html` · Family C · Effort M
- Buttons: `back` '← Fire World' [P] · `btnPause` '⏸' [T] · `btnRestart` '↻' [P] · `btnMute` '🔊' [P] · `${i}` '${i}' [START-SCREEN] · `BOMB` 'BOMB' [CTRL] · GATE ×4
- Readouts [S]: `level`, `score`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ BOMB thumb button — CTRL.

### #20 — Boulder's Fortress · `fire-world/games/game-20-boulders-fortress.html` · Family C · Effort M
- Buttons: `back` '← Fire World' [P] · `btnPause` '⏸' [T] · `btnRestart` '↻' [P] · `btnMute` '🔊' [P] · `TAP` 'TAP' [CTRL] · GATE ×4
- Readouts [S]: `bigscore`, `score`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ TAP button + whole-screen tap (flappy) — CTRL.

### #21 — Sizzle's Puzzle Snap · `fire-world/games/game-21-sizzles-target-pop.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `restartBtn` '↻' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `${names[i-1]}` '${names[i-1]}' [START-SCREEN] · GATE ×4
- Readouts [S]: `level`, `score`, `timer`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #22 — Magma Tap Smash · `fire-world/games/game-22-magma-block-breaker.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `restartBtn` '↻' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · GATE ×4
- Readouts [S]: `livesbar`, `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #23 — Crater Catcher · `fire-world/games/game-23-crater-catcher.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `restartBtn` '↻' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `◀ LEFT` '◀ LEFT' [CTRL] · `▶ RIGHT` '▶ RIGHT' [CTRL] · GATE ×4
- Readouts [S]: `livesbar`, `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #24 — Ash Storm Survivor · `fire-world/games/game-24-ash-storm-survivor.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `restartBtn` '↻' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `${p.n}` '${p.n}' [FIELD-PANEL] · `▲` '▲' [CTRL] · `◀` '◀' [CTRL] · `▶` '▶' [CTRL] · `▼` '▼' [CTRL] · GATE ×4
- Readouts [S]: `hpbar`, `hpfill`, `score`, `timer`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ `upg` upgrade-choice buttons appear mid-run (gameplay choice panel) — never move.

### #25 — Lava Line Draw · `fire-world/games/game-25-lava-line-draw.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `clearBtn` '🗑️ Clear' [TOOL] · `ballBtn` '↻ Ball' [TOOL] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `${i}` '${i}' [START-SCREEN] · GATE ×4
- Readouts [S]: `level`, `score`, `stars`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ NO restart control anywhere in this game. Header carries gameplay tools instead (🗑️ Clear / ↻ Ball — drawing tools, TOOL/stay). The new pause menu must ADD a restart.

### #26 — Pyra Paddle Battle · `fire-world/games/game-26-pyra-paddle-battle.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `restartBtn` '↻' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `😊 Easy` '😊 Easy' [START-SCREEN] · `😐 Medium` '😐 Medium' [START-SCREEN] · `😈 Hard` '😈 Hard' [START-SCREEN] · `▼ DOWN` '▼ DOWN' [CTRL] · `▲ UP` '▲ UP' [CTRL] · GATE ×4
- Readouts [S]: `ascore`, `pscore`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ Difficulty select (`dbtn` Easy/Medium/Hard) is on the start screen — stays. ▲ UP / ▼ DOWN paddle pads = CTRL.

### #27 — Ember Bounce 2D · `fire-world/games/game-27-ember-bounce-2d.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `◀ LEFT` '◀ LEFT' [CTRL] · `▶ RIGHT` '▶ RIGHT' [CTRL] · GATE ×4
- Readouts [S]: `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ No restart control anywhere. Tilt/drag play.

### #28 — Thermal Tug-of-War · `fire-world/games/game-28-thermal-tug-of-war.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `anchorBtn` '⚓ SLAM!' [A] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `restartBtn` '↻' [P] · `😊 Easy` '😊 Easy' [START-SCREEN] · `😐 Medium` '😐 Medium' [START-SCREEN] · `😈 Hard` '😈 Hard' [START-SCREEN] · `TAP` 'TAP' [CTRL] · GATE ×4
- Readouts [S]: `round`, `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ Difficulty select on start screen (stays). `anchorBtn` ⚓ SLAM! is the action button (A). TAP = CTRL.

### #29 — Blaze's Jump Quest · `fire-world/games/game-29-blazes-jump-quest.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `jumpBtn` '⤴️' [CTRL] · `shootBtn` '🔥' [CTRL] · `leftBtn` '◀' [CTRL] · `rightBtn` '▶' [CTRL] · `pauseBtn` '⏸' [T] · `restartBtn` '↻' [P] · `muteBtn` '🔊' [P] · `${i}` '${i}' [START-SCREEN] · GATE ×4
- Readouts [S]: `coins`, `level`, `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ Thumb cluster: `leftBtn`/`rightBtn` (`cbtn`) + `jumpBtn` ⤴️ + `shootBtn` 🔥 — all CTRL. `coins` readout joins the strip.

### #30 — Ruko's Dash Blitz · `fire-world/games/game-30-rukos-dash-blitz.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `SLIDE` 'SLIDE' [CTRL] · `JUMP` 'JUMP' [CTRL] · GATE ×4
- Readouts [S]: `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ B-minimal: no restart control anywhere. SLIDE/JUMP thumb buttons = CTRL.

### #31 — Boulder's Rampart · `fire-world/games/game-31-boulders-rampart.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `restartBtn` '↻' [P] · `muteBtn` '🔊' [P] · `speedBtn` '⏩1×' [TOOL] · `🏹 Arrow 50` '🏹 Arrow 50' [FIELD-PANEL] · `💣 Cannon 100` '💣 Cannon 100' [FIELD-PANEL] · `❄️ Frost 75` '❄️ Frost 75' [FIELD-PANEL] · `🔥 Ember 125` '🔥 Ember 125' [FIELD-PANEL] · GATE ×4
- Readouts [S]: `lives`, `wave` — ⚠️ no DOM `score` id (canvas-drawn score)
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ Tower defense: the build panel is four clickable DIVs, not <button>s (🏹 Arrow 50 / 💣 Cannon 100 / ❄️ Frost 75 / 🔥 Ember 125) — a mechanical button sweep will MISS them; they are gameplay economy and must NOT move. `speedBtn` ⏩1× = TOOL.

### #32 — Cinder's Glide · `fire-world/games/game-32-cinders-glide.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `HOLD` 'HOLD' [CTRL] · GATE ×4
- Readouts [S]: `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ B-minimal: no restart control anywhere. HOLD = CTRL.

### #33 — Inferno Aim · `fire-world/games/game-33-inferno-aim.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `muteBtn` '🔊' [P] · `pauseBtn` '⏸️' [T] · `restartBtn` '↻' [P] · GATE ×4
- Readouts [S]: `score`, `timebar`, `timefill`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #34 — Spark Jump Arcade · `fire-world/games/game-34-spark-jump-arcade.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `muteBtn` '🔊' [P] · `pauseBtn` '⏸️' [T] · `HOLD` 'HOLD' [CTRL] · GATE ×4
- Readouts [S]: `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ B-minimal: no restart control anywhere. HOLD (button-masher) = CTRL.

### #35 — Lava Moat Defense · `fire-world/games/game-35-lava-moat-defense.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `tpUp` '⬆️ Upgrade' [FIELD-PANEL] · `tpSell` '💰 Sell' [FIELD-PANEL] · `tpClose` '✖' [FIELD-PANEL] · `muteBtn` '🔊' [P] · `pauseBtn` '⏸️' [T] · `restartBtn` '↻' [P] · `ffBtn` '⏩' [TOOL] · `NOVA` 'NOVA' [A] · GATE ×4
- Readouts [S]: `hp`, `wave` — ⚠️ no DOM `score` id (canvas-drawn score)
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ Tower panel popup `tpUp` ⬆️ Upgrade / `tpSell` 💰 Sell / `tpClose` ✖ (FIELD-PANEL, stays). `ffBtn` ⏩ = TOOL. NOVA = A. HP/wave readouts.

### #36 — Magma Drop Physics · `fire-world/games/game-36-magma-drop-physics.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `muteBtn` '🔊' [P] · `pauseBtn` '⏸️' [T] · `restartBtn` '↻' [P] · GATE ×4
- Readouts [S]: `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #37 — Volcanic Stack Smash · `fire-world/games/game-37-volcanic-stack-smash.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `muteBtn` '🔊' [P] · `pauseBtn` '⏸️' [T] · `DROP` 'DROP' [CTRL] · GATE ×4
- Readouts [S]: `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ B-minimal: no restart control anywhere. DROP = CTRL.

### #38 — Fire Baby Rally · `fire-world/games/game-38-fire-baby-rally.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `muteBtn` '🔊' [P] · `pauseBtn` '⏸️' [T] · `resetBtn` '⟲' [TOOL] · `GAS` 'GAS' [CTRL] · GATE ×4
- Readouts [S]: `time` — ⚠️ no DOM `score` id (canvas-drawn score)
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ `resetBtn` ⟲ is an in-race TOOL (stay), not a menu restart. GAS hold button = CTRL. `time` readout only.

### #39 — Caldera Bounce · `fire-world/games/game-39-caldera-bounce.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `restartBtn` '↻' [P] · `${i}` '${i}' [START-SCREEN] · `◀ LEFT` '◀ LEFT' [CTRL] · `▶ RIGHT` '▶ RIGHT' [CTRL] · `LAUNCH` 'LAUNCH' [CTRL] · GATE ×4
- Readouts [S]: `level`, `lives`, `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ LEFT/RIGHT pads + LAUNCH: LAUNCH here is the breakout ball launch thumb button = CTRL (not the tab-bar action).

### #40 — Sizzle's Spark Run · `fire-world/games/game-40-sizzles-spark-run.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `◀ LEFT` '◀ LEFT' [CTRL] · `▶ RIGHT` '▶ RIGHT' [CTRL] · `DOWN` 'DOWN' [CTRL] · `JUMP` 'JUMP' [CTRL] · GATE ×4
- Readouts [S]: `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ B-minimal: no restart control anywhere. LEFT/RIGHT/DOWN/JUMP pads = CTRL.

### #41 — Blaze's Inferno Roll · `fire-world/games/game-41-blazes-inferno-roll.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `restartBtn` '↻' [P] · `${i}` '${i}' [START-SCREEN] · `▲` '▲' [CTRL] · `◀` '◀' [CTRL] · `▶` '▶' [CTRL] · `▼` '▼' [CTRL] · GATE ×4
- Readouts [S]: `level`, `score`, `stars`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #42 — Ruko's Speed Trap · `fire-world/games/game-42-rukos-speed-trap.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `restartBtn` '↻' [P] · `TAP` 'TAP' [CTRL] · GATE ×4
- Readouts [S]: `round`, `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #43 — Boulder's Blockade · `fire-world/games/game-43-boulders-blockade.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `resetBtn` '↻ Reset' [TOOL] · `undoBtn` '↩ Undo' [TOOL] · `${i}` '${i}' [START-SCREEN] · GATE ×4
- Readouts [S]: `level`, `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ `resetBtn` ↻ Reset + `undoBtn` ↩ Undo are puzzle TOOLS (stay in field) — this game has no menu-restart P item; the pause menu supplies it.

### #44 — Cinder's Slide · `fire-world/games/game-44-cinders-slide.html` · Family B · Effort M
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `restartBtn` '↻' [P] · `shuffleBtn` '🔀 Shuffle' [TOOL] · `peekBtn` '👀 Hold to Peek' [TOOL] · `${n}×${n}` '${n}×${n}' [START-SCREEN] · GATE ×4
- Readouts [S]: `level`, `timer` — ⚠️ no DOM `score` id (canvas-drawn score)
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ `shuffleBtn` 🔀 + `peekBtn` 👀 Hold to Peek are puzzle TOOLS (stay). Timer readout.

### #45 — Lord Inferno's Strike · `fire-world/games/game-45-lord-infernos-strike.html` · Family C · Effort M
- Buttons: `back` '← Fire World' [P] · `novaBtn` '🔆 NOVA!' [A] · `btnPause` '⏸' [T] · `btnMute` '🔊' [P] · `btnRestart` '↻' [P] · GATE ×4
- Readouts [S]: `score`, `wave`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ `novaBtn` 🔆 NOVA! starts `hidden` and unlocks mid-play — it is the action button (A) but appears conditionally.

### #46 — Magma Jump 2D · `fire-world/games/game-46-magma-jump-2d.html` · Family C · Effort M
- Buttons: `back` '← Fire World' [P] · `btnPause` '⏸' [T] · `btnMute` '🔊' [P] · `btnRestart` '↻' [P] · `JUMP` 'JUMP' [CTRL] · GATE ×4
- Readouts [S]: `score`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #47 — Pyra Prime Dash · `fire-world/games/game-47-pyra-prime-dash.html` · Family C · Effort M
- Buttons: `back` '← Fire World' [P] · `btnPause` '⏸' [T] · `btnMute` '🔊' [P] · `btnRestart` '↻' [P] · `◀ LEFT` '◀ LEFT' [CTRL] · `▶ RIGHT` '▶ RIGHT' [CTRL] · GATE ×4
- Readouts [S]: `score`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #48 — Ash Heap Hero · `fire-world/games/game-48-ash-heap-hero.html` · Family C · Effort M
- Buttons: `back` '← Fire World' [P] · `btnPause` '⏸' [T] · `btnMute` '🔊' [P] · `btnRestart` '↻' [P] · GATE ×4
- Readouts [S]: `score`, `timebar`, `timefill`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #49 — Thermal Track · `fire-world/games/game-49-thermal-track.html` · Family C · Effort M
- Buttons: `back` '← Fire World' [P] · `btnPause` '⏸' [T] · `btnMute` '🔊' [P] · `btnRestart` '↻' [P] · `${i}` '${i}' [START-SCREEN] · GATE ×4
- Readouts [S]: `level`, `score`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #50 — Ember Bounce Master · `fire-world/games/game-50-ember-bounce-master.html` · Family C · Effort M
- Buttons: `back` '← Fire World' [P] · `btnPause` '⏸' [T] · `btnMute` '🔊' [P] · `btnRestart` '↻' [P] · `${i}` '${i}' [START-SCREEN] · `◀ LEFT` '◀ LEFT' [CTRL] · `▶ RIGHT` '▶ RIGHT' [CTRL] · `LAUNCH` 'LAUNCH' [CTRL] · GATE ×4
- Readouts [S]: `level`, `lives`, `score`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ LEFT/RIGHT + LAUNCH thumb buttons = CTRL.

### #51 — Volcanic Target · `fire-world/games/game-51-volcanic-target.html` · Family C · Effort M
- Buttons: `back` '← Fire World' [P] · `btnPause` '⏸' [T] · `btnMute` '🔊' [P] · `btnRestart` '↻' [P] · GATE ×4
- Readouts [S]: `score`, `timebar`, `timefill`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #52 — Lava Rush Arcade · `fire-world/games/game-52-lava-rush-arcade.html` · Family C · Effort M
- Buttons: `back` '← Fire World' [P] · `btnPause` '⏸' [T] · `btnMute` '🔊' [P] · `btnRestart` '↻' [P] · `SLIDE` 'SLIDE' [CTRL] · `JUMP` 'JUMP' [CTRL] · GATE ×4
- Readouts [S]: `score`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #53 — Flame Drop Physics · `fire-world/games/game-53-flame-drop-physics.html` · Family C · Effort L
- Buttons: `back` '← Fire World' [P] · `toolRamp` '📐 Ramp' [TOOL] · `toolFan` '💨 Fan' [TOOL] · `toolErase` '🧽 Erase' [TOOL] · `toolDrop` '⬇️ DROP' [TOOL] · `toolWater` '💧 Water' [TOOL] · `toolSmother` '🛎️ Smother' [TOOL] · `btnPause` '⏸' [T] · `btnMute` '🔊' [P] · `btnRestart` '↻' [P] · `${i}` '${i}' [START-SCREEN] · GATE ×4
- Readouts [S]: `level`, `score`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ Full tool PALETTE in the header row: 7 `tool*` buttons (📐 Ramp / 💨 Fan / 🧽 Erase / ⬇️ DROP / 💧 Water / 🛎️ Smother + selected state). Gameplay tools — keep as a field toolbar, do NOT sweep into tabs or pause.

### #54 — Blaze's Zenith · `fire-world/games/game-54-blazes-zenith.html` · Family C · Effort M
- Buttons: `back` '← Fire World' [P] · `btnPause` '⏸' [T] · `btnMute` '🔊' [P] · `btnRestart` '↻' [P] · `${i}` '${i}' [START-SCREEN] · `◀ LEFT` '◀ LEFT' [CTRL] · `▶ RIGHT` '▶ RIGHT' [CTRL] · GATE ×4
- Readouts [S]: `level`, `score`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.

### #55 — Ruko's Final Dash · `fire-world/games/game-55-rukos-final-dash.html` · Family C · Effort M
- Buttons: `back` '← Fire World' [P] · `btnPause` '⏸' [T] · `btnMute` '🔊' [P] · `btnRestart` '↻' [P] · `◀ LEFT` '◀ LEFT' [CTRL] · `▶ RIGHT` '▶ RIGHT' [CTRL] · `DASH` 'DASH' [A] · GATE ×4
- Readouts [S]: `lives`, `score`
- Pause: **No menu.** Pause shows a text-only banner/label (`pauseBanner` / `pausedTxt` / `pauseLbl` = "⏸ PAUSED"); the pause button itself flips to ▶. A pause MENU must be built; header ↻ + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ DASH here is a thumb button in the pad row (marked A per the law, but thumb-positioned — sweep lead to confirm placement). Lives readout.

### #56 — Tristan's Dark Knight Rescue · `fire-world/tristans-dark-knight-rescue/index.html` · Family B · Effort L
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `restartBtn` '↻' [P] · `obtn` '▶ BEGIN QUEST' [CTRL] · `▲` '▲' [CTRL] · `◀` '◀' [CTRL] · `▶` '▶' [CTRL] · `▼` '▼' [CTRL] · `JUMP` 'JUMP' [CTRL] · `ATTACK` 'ATTACK' [CTRL] · `dUp` '▲' [CTRL] · `dLeft` '◀' [CTRL] · `dRight` '▶' [CTRL] · `dDown` '▼' [CTRL] · `btnJump` 'JUMP' [CTRL] · `btnAtk` '⚔️' [CTRL] · GATE ×3
- Readouts [S]: `bosshpbar`, `bosshpfill`, `bosshpwrap`, `hpbar`, `hpfill`, `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ DUAL control sets: a <button> pad row (▲◀▶▼/JUMP/ATTACK) AND a div D-pad set (`dUp`/`dLeft`/`dRight`/`dDown`/`btnJump`/`btnAtk`) — verify which set is live per device before touching either. Boss HP bar (`bosshp*`) joins the strip. ATTACK = A (thumb-positioned — placement is the sweep lead's call).

### #57 — Trinity's Holy Lightning Rescue · `fire-world/trinitys-holy-lightning-rescue/index.html` · Family B · Effort L
- Buttons: `back` '← Fire World' [P] · `pauseBtn` '⏸' [T] · `muteBtn` '🔊' [P] · `restartBtn` '↻' [P] · `obtn` '▶ BEGIN QUEST' [CTRL] · `▲` '▲' [CTRL] · `◀` '◀' [CTRL] · `▶` '▶' [CTRL] · `▼` '▼' [CTRL] · `JUMP` 'JUMP' [CTRL] · `ZAP` 'ZAP' [CTRL] · `SHIELD` 'SHIELD' [CTRL] · `dUp` '▲' [CTRL] · `dLeft` '◀' [CTRL] · `dRight` '▶' [CTRL] · `dDown` '▼' [CTRL] · `btnShield` '🛡️' [CTRL] · `btnJump` 'JUMP' [CTRL] · `btnZap` '⚡' [CTRL] · GATE ×3
- Readouts [S]: `bosshpbar`, `bosshpfill`, `bosshpwrap`, `hpbar`, `hpfill`, `score`
- Pause: **No menu.** Pause freezes play and draws "PAUSED" on the canvas / shows `pausedTxt`; no resume/restart items exist in an overlay. A pause MENU must be built; header ↻ (where present) + 🔊 + ← move into it.
- Chrome: hand-rolled inline HUD + `auth-gate.js` + static gate block. Canvas ×1.
- ⚠️ Same dual-control-set build as #56 (div set adds `btnShield` 🛡️). ZAP = A (thumb-positioned), SHIELD = CTRL. Boss HP bar joins the strip.

---

## One-off: `play.html` — SPLASH 2D Battler (standalone, 570KB)

- **The entire control layer is injected by its inline script** — including its pause overlay (`#fbPauseOv`, appended to `#stage`) with `fbResumeBtn` ▶️ RESUME + `fbRestartBtn` ↻ RESTART STAGE [both already in a pause menu ✓]. A static-markup sweep will find almost nothing; this file's HUD lives in JS.
- **44 buttons are created in JS** (`createElement("button")` ×44) on top of 21 static ones — unit/formation/codex/creator/armory/vault/season panels are all runtime-built.
- Static buttons: `muteBtn` 🔊 [P] · `bigBtn` ⚔ FIGHT [A — in-battle action] · `novaBtn` 🔥 NOVA [A] · creator panel: `crRandom` 🎲 / `crSave` 💾 Save / `crEquip` ⚔️ Equip / `crDel` 🗑 / `crClose` ✕ [panel chrome — stays] · `armoryGo` FORGE / `armoryClose` CLOSE [panel] · `codexClose` ✕ · `dlgSkip` SKIP ▸▸ [dialog] · `fsAcadClose` ✕ · CLAIM · `fbVaultX` / `fbSeasonX` / `fbArmoryX` ✕ [panel closes] · end screen `ctAgain` 🔁 PLAY AGAIN / `ctTitle` TITLE [END-SCREEN].
- Readouts: almost everything (score, HP, waves) is **canvas-drawn across 3 canvases** — the status strip needs new DOM readouts or this game keeps a canvas HUD with only the tab frame adopted.
- Chrome: `auth-gate.js` (absolute URL); no static gate block. **Effort L — sweep LAST among the DOM games; needs its own design pass on the injected `fbCtl` layer.**

## One-off: `3d.html` — 3D Arena (standalone, 1.02MB — the biggest file on the site)

- 50 static + 13 JS-created buttons, but most are **menu-screen chrome, not in-match HUD**: mode hub (mode select `mpmodebtn` CO-OP/2v2/…/15v15, CREATE/JOIN LOBBY, READY, START GAME, LEAVE), store tabs (`stab` 🛡️ ARMOR / ⚔️ WEAPONS / 💃 EMOTES + BUY buttons), Style Studio (`custsave` SAVE LOOK), leaderboard (`tab_top`/`tab_champ`/`fb-lb-close`), vault/season/task/armory panels (each with a CLOSE). Those screens are menus already — they stay.
- In-match chrome: `#pausemenu` overlay already exists with `resumebtn` ▶️ RESUME + `quitbtn` 🚪 QUIT TO LOBBY [in pause menu ✓]; `pausepill` / `windpill` status pills [S]; multiplayer touch row `mpcbtn` — `mpjumpbtn` ⬆️ / `mpblkbtn` 🛡️ / `mpatkbtn` 🔥 [CTRL] + panel openers `mplbbtn` 🏆 / `mptaskbtn` 📋 / `mpvaultbtn` 🗝️ / `mpseasonbtn` 🎫 / `mparmorbtn` ⚔️ [menu openers — candidates to fold behind pause/hub, sweep lead's call]; `fbemotebtn` 📢 [CTRL-ish emote trigger]; coin readout `fbcoincount` [S].
- Chrome: `auth-gate.js` (absolute URL); the arena also carries the 3D Vault/store wiring shared with the hub shop (`fb_inventory` etc.). **Effort L (XL) — do this one LAST, as its own pass; the "game" is really five menu systems plus a match HUD.**

---

## Rollout risks — top 5

1. **CSP hash enforcement (site is A+ as of today).** Every game file's inline scripts/handlers/styles are hash-allowlisted by the enforced CSP. ANY sweep edit that adds or changes inline code/styles in a game file changes its hashes — **the hash map must be regenerated before shipping or the moved buttons silently stop working site-wide.** This gates every file in the sweep, no exceptions.
2. **Canvas-layout coupling in Family B (33 games).** Header height feeds the canvas layout math (and the landscape/portrait fixes from October assume the current chrome). Growing the header into a tab bar + strip shifts the play field in 33 files; score/"PAUSED" are partly canvas-drawn, so DOM strip and canvas can disagree if a file is only half-converted.
3. **The pause menu must be BUILT 50 times.** Families B and C have no menu — pause is a freeze + a text banner. Each build touches that game's pause state machine (button toggles, P/Esc handlers, `blur()` calls, timers that must stay frozen). A pasted menu that doesn't hook the game's own `paused` flag will leak play behind the menu.
4. **The pasted gate block (56 files).** The static math-gate markup sits in the same header region the sweep rewrites. One careless find/replace can break the gate (and with it the 5-problems/24h-unlock flow) across dozens of games at once. Sweep tooling must treat the gate block as read-only.
5. **Invisible and duplicate controls.** JS-created buttons (44 in `play.html`, hero chips in #1, template `lvlBtn`s everywhere), clickable DIVs (game #31's build panel), invisible tap-zones (#12 flippers), and the dual control sets in #56/#57 all evade a markup-only sweep. Each family needs a runtime click-through check (the existing harness pattern) after conversion, not just a visual diff.

## Sequencing (template-first)

1. **#1 Slingshot Cascade** — template (in flight, separate agent).
2. **Family A (#3–#8)** — S/M. Pause menu already exists; only 🔊 + ← move in, readouts become the strip. Proves the template against the nearest shell. (#5 is M — HP/wave readouts.)
3. **Family C (#15–#20, #45–#55)** — M ×16, L ×1 (#53 palette). Uniform `btn*` ids make this the most mechanical family; banner → menu build is identical 17 times.
4. **Family B with restart (#2, #9–#14, #21–#24, #26, #28, #29, #31, #33, #35, #36, #38, #39, #41–#44)** — M. Adds the pause-menu build to the B shell; canvas-readout games (#9) need the DOM-readout decision from risk #2 first.
5. **B-minimal (#25, #27, #30, #32, #34, #37, #40)** — M. Same as step 4 plus adding the missing restart into the new menu.
6. **#56/#57 platformers** — L. Dual control sets + boss bars; convert as a pair.
7. **`play.html`** — L. Injected-UI design pass.
8. **`3d.html`** — L/XL. Own pass, last.

**Totals: 59 games inventoried — 5 S · 47 M · 6 L · 1 template (#1) · (3d.html sits at the XL end of L).**

