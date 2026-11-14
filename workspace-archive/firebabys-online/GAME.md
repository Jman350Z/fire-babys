# Fire Babys Rebellion — Mission 1 "Operation First Ember"

Built 2026-10-29 into the finished firebabys.online site tree (`site/rebellion.html`,
mount point `#game-root`, per the DESIGN.md contract). Single-player only.
Online Co-Op remains an honest Phase 2 roadmap item — no fake lobby, no fake
anything. Nothing was deployed, pushed, or DNS-touched; firebabys.io untouched.

## Files

| File | Size | What |
| --- | --- | --- |
| `site/assets/rebellion-game.js` | 65,449 B | The whole engine: map, stealth AI, rendering, audio synth, UI wiring. Vanilla JS, zero dependencies. |
| `site/assets/rebellion.css` | 13,082 B | Page styles + the full game-shell styling (HUD bar, overlays, touch controls). |
| `site/rebellion.html` | 21,930 B | Placeholder card replaced by the game shell; copy updated (Mission 1 live, Co-Op still Phase 2); loads `assets/rebellion-game.js` with `defer`. |

## The mission (objectives in order)

1. **Gear Up** — hero starts as a round elemental ball at the infiltration
   point; stepping on the glowing pad runs the transformation sequence (ball
   morphs into the sleek humanoid of living fire/water — Transformation Law).
2. **Rescue** — free 3 captured Water Babys from cages across the outpost
   (hold-to-pick-lock; each freed hero hops, waves, and slips away).
3. **Sabotage** — plant the ember charge on the Slime Pump (unlocked only
   after all 3 rescues); a 20-second escape timer starts. If it expires the
   charge *fizzles* and can be re-planted — no cheap game-over.
4. **Extraction** — reach the north-east gate in time → Mission Complete
   screen: clear time, times spotted, rescued 3/3, and a rank in words —
   **Silent Flame** (never spotted) / Ember Shadow (1–2) / Spark Runner (3–5)
   / Loud & Proud (6+). Best result (fewest spots, then fastest) persists in
   `localStorage` (`fbr-best`); mute preference in `fbr-muted`.

## Systems

- **Map** — one connected Caldera outpost, 36×26 tiles (1440×1040 px), three
  zones (west / mid / east) joined by door gaps; camera follows with lerp and
  clamps; static layer pre-rendered to an offscreen canvas for speed; DPR-aware
  canvas (capped at 2×), 60 fps rAF loop with dt clamp.
- **Patrols** — 6 Boneheads on waypoint loops with **real line-of-sight vision
  cones** (raycast against walls/crates, drawn occluded). Three states:
  calm → suspicious ("?", stops and stares ~1s to fill) → ALERT ("!", chases).
  Detection fills faster up close; crouching, steam cover, and distance all
  slow it. Standing **still** in steam/shadow tiles makes you invisible;
  moving through them only slows detection.
- **Getting caught** — an alert patrol that touches you costs one of 3 ember
  shields and knocks you back to your zone entrance; shields empty → restart
  at the furthest zone checkpoint with shields restored (rescues and progress
  kept). Global **alarm meter** rises while an alert patrol can see you and
  decays when unseen.
- **Sneak tools** — crouch (Shift / CRCH); steam vents; silent **bonk** from
  behind (patrol naps 20 s with floating "Zzz" — goofy, non-violent);
  **ember-burst smother** for Slimers (short range, 6 s recharge, shown as a
  meter under the hero) — smothered, never sprayed, per canon.
- **Slimers** — 4, wandering near home points, laying slippery trails
  (11 s fade) that slow the hero to 55% on contact; smothered Slimers leave
  an ash pile.
- **HUD law** — one slim tab bar (objective, alarm meter, rescued count,
  escape timer chip, ember shields, pause button) + a slim status strip.
  Restart, sound toggle, controls help, and quit live **only** in the pause
  menu (Esc / pause button).
- **Codec comms** — typed-text briefing cards with elemental-orb portraits
  (Lord Inferno + Aqua): mission start (2 cards), after the 2nd rescue, and
  when the charge is planted. They pause the game and are skippable
  (tap / E / Space / ACT).
- **Audio** — WebAudio synth only, generated in code, starts on first user
  gesture: UI blip, suspicion blip, alert sting, bonk thud, rescue chime,
  gear-up shimmer, smother burst, plant beeps, escape countdown beeps,
  caught sting, win jingle. No audio files.
- **Controls** — keyboard (WASD/arrows, Shift crouch, E hold-interact,
  F bonk/smother/dart, Esc pause) and touch (virtual joystick bottom-left,
  ACT / BNK / CRCH buttons bottom-right, shown only on touch devices).
  Mobile-first portrait; the canvas scales to the frame at any size.

## Hero table (roles in words — tuning numbers are internal only, never displayed)

| Hero | Element | Role | Field trait |
| --- | --- | --- | --- |
| Blaze | Fire | Strike Leader | Balanced kit |
| Ruko | Fire | Shadow Scout | Moves faster |
| Boulder | Fire | Rampart | Bonk works from any side; a touch slower |
| Sizzle | Fire | Sky Marksman | Sleep-dart (3, ranged bonk) |
| Cinder | Fire | Saboteur | Crouches faster |
| Lord Inferno | Fire | Supreme Commander | Wider awareness tint on enemy cones |
| Aqua | Water | Strike Leader | Balanced kit |
| Splash | Water | Shadow Scout | Moves faster |
| Pebble | Water | Rampart | Bonk works from any side; a touch slower |
| Drift | Water | Mist Marksman | Sleep-dart (3, ranged bonk) |
| Bubble | Water | Rescue Specialist | Crouches faster |
| Lord Tidal | Water | Supreme Commander | Wider awareness tint on enemy cones |

One engine, one data table — every hero playable through the whole mission.

## Verification (Playwright/Chromium, 390×844, deviceScaleFactor 2)

All runs served from the local tree (`file://…/site/rebellion.html`).
Gameplay was driven with real keyboard input plus the game's test handle
(`window.__FBR` — state snapshot / start / teleport / codec dismiss; a
standard debug hook, documented here openly).

- `node --check assets/rebellion-game.js` — **syntax OK**.
- **A+ grep audit on the final tree** — inline `<script>` without `src`: **0**;
  `<style>` blocks: **0** on all 4 pages; `style=` attributes: **0**; inline
  event handlers: **0**; external asset loads (`src="http…"`): **0**. The only
  outbound URLs anywhere are the firebabys.io navigation links and this site's
  own og: metadata.
- Hero select renders with **12 hero cards**; codec card appears on deploy
  with live typewriter text ("Hero, the Underworld hol…").
- **Transformation proven**: walked Blaze east onto the gear pad with the
  keyboard — `formed: false → true`, stage advanced 0 → 1.
  Screenshots: `game-shot-before-transform.png`, `game-shot-after-transform.png`.
- **Stealth states proven**: hero placed in Patrol 1's cone on open floor —
  suspicion captured at 0.41 ("?" pop, orange cone visibly occluded by a
  crate, status "A patrol is suspicious…"), then ALERT ("!" pop, red cone,
  "SPOTTED — break line of sight!"), `spotted: 1`, and the chase ended in a
  catch: shields 3 → 2 with zone-entrance knockback.
  Screenshots: `game-shot-suspicious.png`, `game-shot-alert.png`.
- **Rescue proven**: hold-E at Cage A — count 0 → 1 with the captive's
  hop/"Rescued!" animation. Screenshot: `game-shot-rescue.png`.
- **Full mission loop proven** (second run): rescues A→1, B→2, C→3; pump
  hold → stage 2 with `escapeT: 20.0`; extraction → phase `complete`,
  stats rendered (Hero Blaze, clear time, spotted 0, rank **Silent Flame**)
  and the best-on-record line written from `localStorage`.
  Screenshot: `game-shot-complete.png`.
- Pause menu: Esc opens (phase `pause`, overlay visible), Esc resumes.
  Screenshot: `game-shot-pause.png`.
- **Console: zero console errors, zero warnings, zero page errors across
  every run.** (Error lists were empty — nothing to quote.)

Screenshots live in `~/workspace/firebabys-online/`: `game-shot-select.png`,
`game-shot-codec.png`, `game-shot-before-transform.png`,
`game-shot-after-transform.png`, `game-shot-suspicious.png`,
`game-shot-alert.png`, `game-shot-rescue.png`, `game-shot-pause.png`,
`game-shot-complete.png`.

## Bugs found and fixed during the build

1. Hero movement silently dead: `moveEntity` operates on `{x, y}` entities
   while hero state lives in `G.px/G.py` — the hero "moved" phantom fields.
   Fixed with an adapter in `updateHero`. (Patrols were unaffected, which is
   what made it sneaky.)
2. Complete-screen stats overflowed the 316 px-wide stage: widths used `vw`
   (viewport) instead of the container. Fixed to `width: 100%` + `max-width`.
3. Hero-select title clipped: flex `justify-content: center` + scrollable
   overlay cuts off the top of tall content. Fixed with auto-margin centering
   (margins collapse to 0 on overflow, so tall overlays scroll from the top).
4. Two patrol loops originally crossed crates; rerouted to clean rectangles.
   The whole map (row lengths, key tiles, every patrol segment) is validated
   by a script before testing.

## Known limits (honest)

- **Playtesting method**: mission-critical paths were proven with keyboard
  input + teleports between waypoints, not one continuous human-speed stealth
  run. A full no-teleport clear is possible by design (patrol gaps, steam
  cover, bonks) but a human balance pass (patrol density, cone range) is
  still a fair Phase 1.1 tuning item.
- **Bonk/smother/dart** were exercised in code paths during testing only via
  the catch/rescue flows; the bonk itself (patrol sleep) and the sleep-dart
  were not screenshot-verified in this pass. They share the same action
  handler proven by the smother-range logic and the alert/chase system, but
  they have not had their own dedicated playtest run.
- The other two pages (`index.html`, `heroes.html`) still show a "Mission 1 —
  Deploying Soon" status chip in their mode/roadmap sections; their footers
  were updated to match ("More Fire Babys:"), but the chips were left for the
  parent's call since this task scoped copy updates to `rebellion.html`.
- The art is procedural canvas drawing (no image files) — crisp at any DPR,
  on-canon signatures for all 12 heroes, but silhouettes are stylized rather
  than sprite-based.
- `window.__FBR` debug handle ships in the file (state/start/teleport for
  automated tests). Harmless in production, removable in one edit if unwanted.
