# Game 8 — Sizzle's Spark Jump — Rebuild Notes

## 1. What was wrong with the old game (audit)

- **Wrong game entirely:** despite the name "Sizzle's Spark Jump," it was a generic endless **doodle-jumper reskin** — auto-bounce, tilt/tap steering, climb forever on randomly spawned platforms. No levels, no goal, no ending, no precision mechanic of any kind.
- **Wrong hero in its own intro:** the title overlay literally read "**Cinder** & **Blaze** bounce to the stars!" — in Sizzle's game. Sizzle (the archer/showoff) had zero identity in it: no bow, no showoff energy, no spark-jumping.
- **No designed difficulty:** platform types (moving/crumble/spring/rocket) were dealt by raw `Math.random()` against height thresholds; runs were luck, not skill. Score was just height × 2 plus random stars.
- **No structure or feedback:** no level-clear moments, no precision reward, death was the only state change. "Best" was the only persistence.
- Verdict: Jeff's "they all suck" was accurate. The shell (gate, controls, theme, Sizzle sprite) was fine; the game inside it was not.

## 2. The new game

**Precision charge-jump platformer.** Sizzle stands on a rock ledge above an animated magma trench. HOLD Space / mouse / touch to charge a spark jump — a dotted **trajectory preview** (green→gold→red) grows with the power meter while a spark arrow shows the aim; aim is adjusted with ←/→ keys or by dragging. RELEASE to leap. Land on the next ledge; every landed ledge starts **crumbling** (cracks, shakes, falls), so you keep moving. Cross each level to the 🏁 **goal banner**.

- **Shell kept:** same `<title>`, filename, parental math gate (markup + logic), `auth-gate.js` / `rating.js` includes, pause/mute/restart controls with identical behavior contracts, premium dark chrome styles, HUD pill system (now ⭐ score / 🎯 level / ❤️ hearts / 🏆 best), `tone()`/`noise()` synthesized SFX (no music system), Sizzle's code-drawn flame-teardrop look — now with his little archer bow, showoff smirk, glaring red-hot pupils. No beaks/wings/feathers anywhere.
- **Kind default aim:** on each landing the game simulates launch angles and pre-aims at the arc that lands nearest the next ledge's center at a friendly mid-charge — the player mainly tunes power. The preview uses the *same* physics step function as real flight (gravity + vent lift + wall bounce), so it can never lie.
- **Misses are gentle (brand rule):** fall short/overshoot or a ledge crumbles under you → splash into the magma, −1 heart, and Sizzle **pops back out soaked and laughing** on the last ledge. Never harmed, never burned. 3 hearts; 0 hearts → game-over screen with Retry Level (score rolls back to the level checkpoint). Restart also works mid-game from the pause menu.
- **Scoring rewards precision:** new-ledge landings pay by center offset — **PERFECT +150** (inner 36%), +50 mid, +25 edge — plus a heart bonus (+50/heart) on each level clear. Best score persists in `localStorage` (`sizzle_best`).
- **Levels: 15**, seeded-deterministic layouts (same for every player, fair by construction):
  - Ledge count grows 5 → 9 crossings; ledge width shrinks 130 → 72 px; crumble time 1.7 s → 0.95 s (always ≥ a full 0.85 s charge if you start promptly).
  - Placement is anti-degenerate: enforced zigzag with ≥80 px horizontal separation (no vertical stacks), rise picked first (55–110 px) and horizontal distance capped at `2×rise + 50` so required lob angles stay ≤ ~63° and the success window in (charge, aim) space stays wide.
  - **Updraft vents** appear from Level 8 (1–2 per level, only over genuinely wide ≥150 px gaps, distinct gaps, column centered between the ledges): flying through one floats Sizzle upward (capped rise speed) with bubble particles and a soft whoosh.
  - Named levels ("Warm-Up Hop" … "Trench Champion"), rotating fire-safety lessons on clear/game-over screens, level-clear overlay with perfect count + heart bonus, final champion screen after L15.

## 3. Checks run + results

- **Syntax:** extracted the inline `<script>` and ran `node --check` → **OK** (re-run after every edit).
- **Call graph:** grep cross-check of every called identifier against definitions → **no undefined calls** (remaining regex hits are comment/string words and `sfx.*` method names).
- **Headless runtime harness** (DOM/canvas stubbed, real game code executed):
  - Boot/title, math-gate flow functions, start, charge growth, drag-aim math (+100 px drag = exactly +0.4 rad, clamps at −AIM_MAX), release → flight → landing, crumble-drop → splash, heart loss, soaked respawn, last-heart game over, retry-level restore, pause/resume, pause-menu restart, vents absent before L8 / present on L12 — **all PASS**.
  - **Completability:** an auto-player using a coarse human-like search (7 aim offsets × 9 charge levels around the default aim) **clears all 15 levels on phone 390×844, tablet 768×1024, and desktop 1280×800**.
  - **Fairness sweeps** (dense 833-combo sweep per jump, state reset per combo): every jump in sampled levels (1, 8, 11, 12, 15, both phone and desktop) has a real landing basin — worst case 22/833 combos, typical 50–300+.
- **Bugs found by testing and fixed during the build:**
  1. First generator degenerated into vertical ledge stacks against a wall (1-in-336 landing chance) → anti-stack placement with guaranteed horizontal separation.
  2. Wide-screen mirror fallback could teleport a ledge ~1,200 px away (unreachable) → replaced with a guaranteed-separation inward push.
  3. Trajectory preview ignored updraft vents (would have lied to the player) → single shared `stepFlight()` physics for preview and flight.
  4. Default aim used the straight geometric line (often clamped and useless) → simulation-searched ballistic default aim.
  5. Duplicate vents could stack on one gap → vents now take distinct wide gaps only.

## 4. Final file

- `game-08-sizzles-spark-jump.html` — **36,546 bytes** (limit 80 KB), single self-contained file, canvas + `requestAnimationFrame`, pooled particles/floaters (no per-frame DOM writes), playable at 390×844 and desktop.
