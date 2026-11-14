# Game 7 — Ruko's Turbo Drift — REDO notes

## 1. What was wrong with the old game (audit)

- **It wasn't a drift game at all.** Despite the title "Ruko's Turbo Drift," the shipped game was a **4-lane rhythm/tap music game**: notes fell down DFJK lanes to generated beatmaps of 3 songs ("Ember Groove," "Lava Rush," "Inferno Drop"), judged Perfect/Great/Miss. Title, meta description ("Drop the beat! Tap notes in rhythm…"), overlay copy ("Sizzle & Lord Inferno drop the beat!"), and even the fire-safety lesson ("never dance near a hot stove") were all music-game content wearing a racing game's name.
- **The hero never appears.** Ruko — whose game this supposedly is — is never drawn anywhere in the render loop. Gameplay is abstract glowing note orbs on lanes; there is no kart, no track, no Ruko.
- **No progression structure.** Three songs picked from a menu, ~45–55 s each, then a rank screen. No stages, no escalation, no reason the "Turbo Drift" name promises speed.
- **Dead weight for the theme:** a per-beat backing-pulse audio loop (a music system) in what should be a racer.

Kept from the old file (shell contracts): identical `<title>`, auth-gate.js + rating.js includes, parental math gate markup + `showMathGate()`/`checkMath()` logic, HUD pill trio, premium dark theme + fbvis-cycle1 chrome pass, pause/mute/restart control block (`fbPause`/`fbResume`, pauseOv buttons, P/Esc toggle), back-to-Fire-World button, pooled particles, pre-baked glow-sprite technique (no per-frame shadowBlur), `tone()` audio helper and mute contract.

## 2. The new game

**Vertical-scrolling drift racer.** Ruko — drawn in his approved code-art look (round flame-teardrop Fire Baby, black skull headband with white skull emblem, big grin) — rides a lava-rock drift kart (basalt body, lava-crack trim, glowing ember wheels) down a winding volcanic track. The track center is a sine curve locked to world distance, so curves scroll correctly; lava-glow track edges, scrolling center dashes, drifting ambient embers.

- **Steering:** Arrow keys / A,D on desktop; touch-drag on the canvas steers toward the finger.
- **DRIFT (the core mechanic):** hold **Space** (or hold the on-screen 💨 DRIFT button) while steering. The kart gets slippier and faster sideways, kicks up smoke, and charges a boost meter (on-screen bar shows DRIFT %; a screech SFX loops while drifting). **Release** to slingshot: boost time = charge % × 1.8 s at 1.7× scroll speed. Style scoring: points = drift seconds × 50 + charge, with tier bonuses — ≥60% charge "🔥 GREAT DRIFT" (+100), ≥90% "👑 DRIFT KING" (+200). Best drift charge is tracked for the victory screen.
- **Checkpoint gates:** glowing green flag gates span the track. Crossing inside the gate span: +100 pts and **+7 s** on the clock (cap 32 s). Missing a gate: −2 s. Clearing all gates clears the stage (+10 pts per second left).
- **Hazards:** lava pools (glowing orange) and rock piles sit on the track. A hit is a **playful spin-out only** — kart spins, cartoon dizzy stars orbit Ruko's head, he keeps grinning: −2 s, brief invulnerability blink, never injury/damage, per brand rules. No beaks/wings/feathers anywhere.
- **Timer:** starts at 20 s per stage; gates feed it. Timer empty → "TIME UP" screen with retry-stage button (plus a drift tip).
- **Stages (10):** speed 352→640 px/s, track half-width 144→90 px (tighter), curve amplitude 70→182 px and frequency up (windier, quicker curves), gates 6→15, hazard density grows from stage 4 and again at stage 6+. Stage-intro screen before each stage with its gate count and a rotating fire-safety lesson; 3-2-1-GO countdown on canvas; stage-clear screen with gate/spin/time-bonus breakdown; clearing stage 10 gives the 🏆 TURBO DRIFT CHAMPION screen with final score, best drift, and spin-out count.
- **Controls contract kept:** pause (button or P/Esc) works from countdown + play and resumes to the right state; pause-overlay RESTART restarts the current stage; mute toggles 🔊/🔇 and silences all SFX. Restart also works from game-over (retry), stage-clear (next), and victory (play again resets score).
- **Sound:** synthesized Web Audio SFX only (drift screech noise, boost sweep, gate chime, missed-gate buzz, spin-out wah, wall scrape, countdown beeps, clear/win jingles) via the existing `tone()` helper + a small added `noise()` helper. No music system. All SFX respect the existing mute flag. HUD DOM writes are change-cached (no per-frame DOM thrash); particles are pooled; DPR capped at 2; layout targets 390×844 phones and desktop.

## 3. Checks + results

- **JS syntax:** extracted the inline `<script>` and ran `node --check` → **OK**.
- **Undefined-call audit (Patch-016 rule):** collected all function definitions + all `sfx.*` methods and diffed against every call site (comments/strings stripped). Remaining raw-regex hits were only the `sfx` object-literal method definitions themselves and the `new` keyword → **zero genuinely undefined calls**. Also verified every `getElementById` id used in JS exists in the HTML, and the inline `onclick="checkMath()"` handler resolves to a defined global function.
- **Shell audit:** `<title>` byte-identical to the old file; auth-gate.js, rating.js, math gate (`#mathgate/#mq/#ma/checkMath`), pause overlay + all four control buttons, HUD pills, fbvis-cycle1 style block all present. No rhythm-game leftovers in JS (songs/beatmaps/lanes/hitLane all gone; only the unused `.songBtn` rule remains inside the kept shell stylesheet).
- **Runtime smoke test (Node, stubbed DOM/canvas, 390×844):** booted, title idle → PLAY → math gate (wrong answers rejected, correct answer unlocked) → stage intro → START → countdown ran with pause/resume mid-countdown → gameplay: held Space + steered to charge drift, released for boost, steered both ways for ~10 s of play (gates/hazards/timer exercised) → pause-overlay RESTART restarted the stage → mute toggled → **no runtime errors**.
- Old file untouched: everything was written to the build folder; nothing under `.deploy/` was edited.

## 4. Final file size

**32,534 bytes** (~31.8 KB) — under the 80 KB cap. (Old file: 21,721 bytes.)
