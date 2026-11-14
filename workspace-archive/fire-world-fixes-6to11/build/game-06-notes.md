# Game 6 — Blaze's Magma Bounce — rebuild notes (2026-10-14)

Output: `game-06-blazes-magma-bounce.html` (this build folder). Shell preserved from the
live file: same `<title>`, filename, parental math gate (markup + `checkMath`/`showMathGate`),
auth-gate.js + rating.js includes, HUD pills, back button, pause overlay
(⏸ / RESUME / RESTART), mute toggle, premium dark theme + fbvis chrome pass,
and Blaze's approved code-art look (round flame body + flame tuft, radial-gradient).

## 1) What was wrong with the old game (audit)

- **It wasn't the game on the label.** "Blaze's Magma Bounce" contained zero bouncing:
  it was a sumo ring-bumper — drag-and-fling Blaze to knock rock golems out of a
  stone ring into surrounding lava. Name, description ("Sumo showdown!"), and
  gameplay all disagreed with each other.
- **One mechanic, repeated.** 10 rounds of the identical fling-bump loop; only foe
  count/size/speed changed. No progression of ideas, no collectibles beyond a
  single power-up orb, no reason to replay.
- **Brand problem:** the lose state was Blaze getting knocked into lava — the hero
  "splashed" out of existence, which sits badly with "Fire Babys are precious,
  never shown harmed."
- Bots had to be made artificially "HARD" (orb-contesting, target-leading dashes,
  post-25s escalation timer) to make rounds end at all — a sign the core loop
  couldn't resolve itself.

## 2) The new game

**Blaze's Magma Bounce — a vertical climber.** Blaze auto-bounces on magma bubbles
rising from a lava lake at the bottom of the volcano. The player only steers:
◀ ▶ arrow keys / A,D / touch-drag anywhere / on-screen ◀ ▶ buttons.

- **Bounce:** landing on a bubble pops it and launches Blaze (~8.8 m per bounce).
  Golden-ringed **mega bubbles** (~12%) launch much higher (+50 pts).
- **Ember stars:** collect for +100 pts and +3 s energy.
- **Energy clock:** each level gives a fixed energy budget; it drains in real
  time and is shown as a canvas bar + seconds readout. Run out and Blaze is
  "out of steam" — bubbles stop bouncing him and he sinks.
- **Rising lava pressure:** the lava surface climbs the whole level (faster each
  level), so stalling or falling too far ends the run.
- **Lose = playful dunk, never harm:** Blaze sinks into the magma with a splash,
  then pops back up at the surface soaked, dripping, eyes squeezed shut in a big
  grin. Retry restores the level-start score (no score farming, same contract
  as the old shell).
- **Win per level:** reach the goal height (dashed line + waving GOAL flag,
  altitude ticks every 20 m) → clear screen with 1–3 stars based on energy left,
  goal bonus + remaining-energy bonus, NEXT LEVEL. Level 12 → champion screen.

**Level structure (12 levels):**

| Lvl | Goal | Energy | Bubbles | Bubble size | Lava rise | Wind gusts |
|-----|------|--------|---------|-------------|-----------|------------|
| 1   | 60 m | 45 s   | 7       | 26–40 px    | 6 px/s    | — |
| 2   | 80 m | 50 s   | 7       | 25–38 px    | 8 px/s    | — |
| 3   | 100 m| 55 s   | 6       | 24–37 px    | 11 px/s   | — |
| 4   | 120 m| 60 s   | 6       | 24–36 px    | 14 px/s   | — |
| 5   | 145 m| 65 s   | 6       | 23–35 px    | 17 px/s   | — |
| 6   | 170 m| 70 s   | 5       | 22–34 px    | 20 px/s   | — |
| 7   | 200 m| 75 s   | 5       | 22–33 px    | 23 px/s   | 130 |
| 8   | 230 m| 80 s   | 5       | 21–32 px    | 26 px/s   | 160 |
| 9   | 265 m| 85 s   | 5       | 21–31 px    | 28 px/s   | 190 |
| 10  | 300 m| 90 s   | 4       | 20–30 px    | 30 px/s   | 220 |
| 11  | 340 m| 95 s   | 4       | 20–29 px    | 32 px/s   | 245 |
| 12  | 380 m| 100 s  | 4       | 20–28 px    | 35 px/s   | 270 |

**Sound:** small synthesized SFX only, via the shell's existing `tone()`/`noise()`
helpers — bubble pop, mega-bounce sweep, star chime, dunk splash, low-energy cue,
win arpeggio, UI click. Existing mute toggle respected. No music system (per spec).

**Tech:** single self-contained HTML file, canvas + rAF, pooled particles/floaters
(carried over from the shell), pre-baked ember glow sprite (no per-frame
shadowBlur), HUD DOM writes only when the displayed meter actually changes.
Camera-follow world with parallax volcano silhouettes. Plays at 390×844 and desktop.

## 3) Checks + results

- **Syntax:** inline JS extracted → `node --check` → **OK**.
- **Undefined-call audit:** every called function grep-verified against a
  definition (the Patch-016 rule). Two authoring bugs were caught and fixed
  during the build: a duplicated pause/mute block (duplicate `const _pz` —
  would have been a fatal SyntaxError) and a double pause-toggle from two
  keydown listeners.
- **Headless flow test (Node vm, stubbed DOM/canvas): 19/19 PASS** — math gate
  opens play; arrow-key steering moves Blaze; auto-bounce climbs; goal height
  triggers clear + overlay; NEXT LEVEL advances; lava contact → dunk → soaked
  game-over; retry restores level-start score; pause/resume; restart-from-pause
  restarts the level; energy-out kills bounce and ends in an "energy" dunk;
  level-12 clear shows the champion screen; PLAY AGAIN resets to level 1 /
  score 0; wind level (9) runs 300 frames clean.
- **Soak test:** a simple steering bot (chase the nearest bubble below) cleared
  Level 1 in ~6.3 s of play — the intro level is forgiving by design; the ramp
  (fewer/smaller bubbles, faster lava, wind, 380 m / 100 s finale) carries the
  difficulty. No soft-locks, no exceptions over thousands of frames.
- Shell contracts re-verified in the output file: title unchanged, both script
  includes present once each, all control IDs present (pauseBtn, muteBtn,
  resumeBtn, prestartBtn, mathgate/mq/ma, overlay set), plus new steerL/steerR.

## 4) Final file size

**31,196 bytes (~30.5 KB)** — well under the 80 KB cap (and smaller than the
~32 KB sumo build it replaces).
