# Game 09 — Ember Cascade — Rebuild Notes

Output: `~/workspace/fire-world-fixes-6to11/build/game-09-ember-cascade.html`
Source (untouched): `~/workspace/.deploy/fire-world/games/game-09-ember-cascade.html`

## 1. What was wrong with the old game (audit)

- **Wrong game wearing the name.** "Ember Cascade" shipped as a 3-lane tower defense: the file's own meta description literally says "Defend the keep! Place fire baby defenders in this tower defense battler." Nothing cascaded. The title promised a falling-ember puzzle and delivered a lane battler.
- **It collided with the rest of the world.** Fire World already has lane/battler games; a tower defense here was a duplicate, not a collection entry.
- **Fiddly on a phone.** Success depended on currency management, tower picking in a bottom bar, tapping small glowing tiles on a wide field, mid-wave upgrades, and an early-wave button — five systems competing for attention on a 390px screen.
- **Passive drift.** Fire currency accrued on a timer (dt*4) plus wave bonuses, so optimal play included waiting around — the opposite of a snappy puzzle loop.
- **Complexity bloat.** 4 tower types × upgrades × slow/splash/chain effects × 3 enemy types across 13 waves, with targeting special cases — a lot of machinery for a game a kid should grasp in ten seconds.

## 2. The new game

**Ember Cascade is now an actual ember cascade.** A grid of glowing ember orbs (flame-teardrop bodies, original code-drawn canvas art) in five colors — orange, gold, red, teal-cool, violet. Tap/click any connected group of **2+ same-color orbs** to pop it. Orbs above fall, columns slide together, and groups formed *by the fall* pop on their own as **chain cascades** — chain pops score with a multiplier (×2, ×3, ×4, ×5 cap) and big pop bursts. Reach the level target before the move counter runs out.

- **Scoring:** base pop = 10/orb + quadratic bonus for groups of 3+ (5×(n−2)²). Chain pops (groups of 3+ formed by a fall) multiply the base by the chain step, capped at ×5. Face-row clears and obsidian cracks are free bonuses (not scored) so treats never break the score economy.
- **Fire Baby face orbs:** ~4.5% of orbs carry a happy code-drawn Fire Baby face; popping a group containing one clears that orb's whole row — a joyful treat, nobody harmed.
- **Obsidian blockers** (levels 7–12): dark blocks that can't be tapped or popped directly; a pop (or face-row clear) directly adjacent cracks them away.
- **Hint:** after each turn, a surviving group pulses gently so young players always see a possible move.
- **Shell kept:** same `<title>`, same filename/URL, parental math gate (markup + logic identical), auth-gate.js / rating.js includes, pause/mute/restart with the same behavior contracts, premium dark theme + fbvis chrome, pooled particles/floaters, synthesized Web Audio SFX via the file's existing `tone()`/`noise()` helpers (no music system). Tower-defense UI (tower bar, wave button) removed with the gameplay.
- **Controls:** tap/click only. Canvas-rendered grid (no DOM thrash), sized for 390×844 and desktop.

### Level structure (12 levels)

| Lv | Grid | Colors | Moves | Target | Obsidian |
|----|------|--------|-------|--------|----------|
| 1 | 6×7 | 4 | 18 | 700 | 0 |
| 2 | 6×7 | 4 | 18 | 850 | 0 |
| 3 | 7×7 | 4 | 19 | 1050 | 0 |
| 4 | 7×8 | 4 | 20 | 1250 | 0 |
| 5 | 7×8 | 5 | 20 | 1400 | 0 |
| 6 | 8×8 | 5 | 21 | 1650 | 0 |
| 7 | 8×9 | 5 | 21 | 1900 | 3 |
| 8 | 8×9 | 5 | 22 | 2150 | 4 |
| 9 | 9×9 | 5 | 22 | 2450 | 5 |
| 10 | 9×10 | 5 | 23 | 2750 | 6 |
| 11 | 9×10 | 5 | 23 | 3100 | 7 |
| 12 | 10×10 | 5 | 24 | 3500 | 8 |

Stars per level: 1★ clear, 2★ at 1.25× target, 3★ at 1.6× target. Level-clear / fail / campaign-win overlays with retry; restart works from every state.

## 3. Checks + results

- **Syntax:** inline JS extracted and `node --check` → **OK**.
- **Patch-016 audit:** 48 functions defined; every called function resolves (including all `sfx.*` methods and `checkMath`, which the gate's inline `onclick` needs as a global); every `getElementById` target exists in the markup → **no undefined calls**.
- **No leftovers:** grep for the old game's identifiers (waveBtn, towerbar, TOWERS, LANES_Y, spawnEnemy, startWave) → **none**.
- **Unit checks** (Node harness driving the real game code with DOM stubs):
  - `popScore` table 9/9 (incl. chain ×3 of a 4-group = 180, 2-orb chain pop = 0).
  - Gravity packs segments correctly above/below an obsidian block (orbs never cross it); empty columns slide left.
  - `groupAt` flood-fill correct; tapping obsidian returns null (hint, no move spent).
- **Beatability simulation** (greedy player driving the real state machine — real `tapOrb`/`resolveStep`, 6 random boards per level): **all 12 levels won 6/6.** Final score/target ratios ranged 1.01–4.00 (median ≈ 1.4), so targets are reachable with margin for a decent player while single near-miss trials (1.01–1.05) keep tension. Chain depth peaked at ×13 in rare cascades; typical turns chain 0–1 times.
- **Design bug found & fixed during verification:** the first build checked for chain groups *after* refilling, which made chains effectively perpetual (sim max chain ×6,046, scores ~2,000× target). Rebuilt so chains form **only from the fall/slide** and the board refills once when the cascade ends — exactly the specified mechanic — and capped the chain multiplier at ×5. Re-simulated clean (above).
- **Move economy reasoning:** with refill, every move pops ≥2 orbs (base ≥20 pts) and a typical greedy move (group 4–6 + occasional chain/face) yields ≈90–150 pts; targets/move ≈ 39 (L1) rising to ≈146 (L12), matched against bigger boards, more colors in play from L5, and larger natural groups on 9–10-wide grids — confirmed by the simulation ratios rather than assumed.

## 4. Final file size

**32,392 bytes** (~32 KB) — well under the 80 KB cap.
