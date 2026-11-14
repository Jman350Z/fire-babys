# Game 10 — "Caldera Climb" — rebuild notes (2026-10-14)

Jeff's verdict on the old game: "they all suck" — full redo ordered, same pattern as the games 1–5 overhaul: keep the shell, replace the game.
Output: `~/workspace/fire-world-fixes-6to11/build/game-10-caldera-climb.html` (the live `.deploy` file was NOT touched).

## 1. What was wrong with the old game (audit)

- **Title/theme mismatch (fatal):** the file was named and titled "Caldera Climb," but the game inside was a **generic match-3 puzzler** — 8×8 grid of emoji gems, swap/cascade, line blasts and a "color bomb." Nothing climbed, there was no caldera, no volcano. The `meta description` even admitted it: *"Match the embers! Swap blocks to score big in this Fire Babys match-3 puzzler."*
- **Off-brand presentation:** gems were raw emoji (🔥 🟠 ⭐ 💚 💧 💜) pasted on rounded squares — no Fire Babys character art anywhere, despite the intro claiming "Blaze & Boulder need your matching magic!" Neither character ever appeared.
- **Generic loop:** 10 levels that were identical except higher score targets and fewer moves (2000→31000 pts, 30→22 moves). No new mechanics, no escalation a player can feel.
- **Shell was fine** and was kept: title, parental math gate, level select, pause/mute/restart contracts, premium dark theme, auth-gate.js / rating.js includes, `tone()` audio helper with `fb_muted` persistence.

## 2. The new game

A vertical **caldera climber** starring **Blaze** (the hero the old intro named first), finally matching the title.

- Blaze **auto-bounces** on rock ledges inside the volcano; the player only steers — **◀ ▶ arrows / A,D keys, or touch-drag** (drag is position-based with 1.8× sensitivity; the course wraps around the caldera walls).
- **Steam-vent ledges (♨)** launch Blaze ~1.5× higher (+25 pts) with a hiss + whoosh.
- **Falling rocks** telegraph first (pulsing red shadow + ⚠ + warning chirp), then drop. A hit costs a heart and bonks Blaze down to the last safe ledge with playful **dizzy orbiting stars** — per brand rules he is never hurt, burned, or destroyed; lava also only costs a heart and resets him to a safe ledge.
- **Lava rises below** as constant pressure; falling out of view also costs a heart.
- **Wind gusts** from level 4 push Blaze sideways (blue arrows warn on screen).
- Score: +3 per new meter climbed, +2 per ledge bounce, +25 vent, +10 per rock dodged, +100 per heart left at the rim. HUD keeps the original three pills: ⭐ score · 🎯 altitude/goal · LV n/10; hearts render on canvas under the HUD.
- **10 levels**, each an altitude goal to the **rim flag ledge**: 150m → 1600m. Ledges narrow 118px → 60px, vertical gaps widen (86–130px → 104–178px), rock interval tightens (5.0s → 2.1s), lava speed rises (7 → 28 px/s). Level-clear screens with heart bonus, final "🏆 VOLCANO CONQUERED!" screen, game-over + retry, and **restart works mid-game and from end screens** (same `startScore` contract as the old file).
- Sound: only synthesized Web Audio SFX via the file's existing `tone()` helper (plus a small `noise()` for vent steam/impact) — bounce, vent, rock warning, hit, heart, dodge, win fanfare, click. Existing mute button + `fb_muted` localStorage respected. **No music system**, per instructions.
- All art is original code-drawn canvas: Blaze as a round flame-teardrop with the approved Fire Babys face (angry-V brows, glaring red-pupil eyes, smirk) — **no beaks, wings, or feathers**; rock ledges with ember edges, glowing wall cracks, animated lava, ember particles carried over from the old file.
- Shell kept byte-similar where practical: same `<title>`, same filename, same head/CSS (both style blocks), same body markup (HUD pills, back button, sysbtns, overlay, math gate markup + `checkMath()` logic, level-select flow PLAY → math gate → pick level), same pause/mute/restart handlers.

## 3. Checks run + results

- **Syntax:** inline JS extracted and `node --check` → **OK** (twice: before and after fixes).
- **Called-vs-defined audit:** scripted cross-check of every bare function call and every `sfx.*` call against definitions. It caught one real bug pre-ship: `gameOver()` called `sfx.bad()` but `bad` was missing from the sfx table (would have thrown and blocked the game-over screen) — **fixed** by adding `sfx.bad()`. Remaining "undefined" hits were all false positives (words inside comments/strings, `cb` callback parameter, globals).
- **Runtime smoke test (headless Node harness, stubbed DOM/canvas):** `pickLevel(1)` → state `play`; 30 simulated seconds of physics — hero bounces, camera/lava/rocks/ledges all live, no exceptions. `levelComplete()` → `clear`; forced last-heart loss → `over`; restart resets hearts to 3; level 10 simulated 10s clean. **PASSED.** (Unsteered hero stalls at low altitude by design — steering is the game; lava still eventually applies pressure.)
- **Drag fix during review:** initial pointermove formula used raw pointer coordinates as the hero target and had a leftover no-op helper — replaced with hero-start + delta×1.8 before shipping.
- **No DOM thrash:** HUD text updates only when the displayed string changes; everything else renders on canvas via a single rAF loop.

## 4. Final file size

**29,838 bytes** (≈29.8 KB) — under the 80 KB cap. Old file was 29,550 bytes, so the full gameplay swap cost ~0.3 KB.
