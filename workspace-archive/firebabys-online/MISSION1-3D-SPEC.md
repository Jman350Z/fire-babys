# Fire Babys Rebellion — Mission 1 in 3D: Build Spec (PREPARED, awaiting Jeff's verdict)

Prepared 2026-10-29 by the proactive research run. Status: **spec only — no
build started.** The 3D proof (see `GODOT-PROOF.md`) was shown to Jeff on
2026-10-29 ~02:07 PT; his call — build the full Mission 1 in 3D with the art
pass baked in, or art-first (a better Blaze before anything else) — is still
open. This spec makes either path start instantly.

## What already exists (do not rebuild)

- **Site**: `site/` — home, rebellion, heroes pages, A+ (zero inline code),
  deploy-ready; blocked only by Namecheap DNS (Jeff's ticket NC-GBE-9090).
- **2D Mission 1** (`site/assets/rebellion-game.js`, see `GAME.md`): complete
  and Playwright-verified — 12-hero select, Gear Up transformation, 3 cage
  rescues, Slime Pump sabotage + 20 s escape, extraction, word ranks
  (Silent Flame → Loud & Proud), 6 Bonehead patrols with real LOS cones,
  4 Slimers smothered by ember-burst, codec cards, HUD tab-bar law,
  keyboard + touch. **Parked, not deleted** — it is the design source of
  truth for the 3D port and a fallback if 3D slips.
- **Godot 3D proof** (`godot/`, `godot-web/`): night Caldera courtyard,
  living-fire Blaze (fire shader, crown, tac vest), one Bonehead patrol with
  working 3D vision cone (CALM → SUSPICIOUS → ALERT with real raycast
  occlusion), MGS-style follow camera, web export booted in Chromium with
  zero console errors.

## The port: systems that carry over 1:1 from the 2D design

1. **Objectives in order**: Gear Up on the pad → rescue 3 Water Babys →
   plant ember charge on the Slime Pump (20 s escape, fizzle-and-replant,
   no cheap game-over) → extraction at the NE gate.
2. **Heroes**: all 12, traits in words only (never stat sheets) — archers'
   sleep-dart, Boulder/Pebble bonk from any side, Ruko/Splash sprinters,
   Bubble rescue-fast, commanders' wider cone tint. One data table.
3. **Enemies**: Bonehead patrols (waypoint loops, ?/! states, bonk = 20 s
   nap with Zzz, nobody hurt) and Slimers (smothered by ember-burst, never
   sprayed; slippery trails). Proof already implements one patrol's full
   perception model (range + FOV + raycast, posture/distance scaling) —
   generalize it, don't redesign it.
4. **HUD law**: one slim top tab bar (objective, ALARM meter, rescued
   count, shields, pause) + slim status strip; restart/sound/help/quit
   ONLY in the pause menu.
5. **Codec**: Lord Inferno + Aqua briefing cards at start, after rescue 2,
   and at charge-plant. Skippable.
6. **Rank + best** persisted locally; mute persisted.
7. **Co-Op stays honestly labeled Phase 2** — no fake lobby.

## The art pass (the reason Jeff rejected 2D)

- Heroes and Boneheads are currently primitive-built. Full build needs:
  sculpted-grade hero models keeping the Transformation Law (suited =
  sleek humanoid of living fire/water, elemental texture, flame hair,
  glowing eyes; unsuited = round ball), tiered-height readability, and
  procedural-or-better walk/crouch/bonk animation.
- Environment: extend the proof courtyard into the full 3-zone outpost
  (west/mid/east with door gaps, per the 2D map) — lava-crack shader,
  steam vents, braziers, crates and walls as real occluders.
- **Checkpoint rule (from the film lesson)**: Jeff sees and blesses the
  improved Blaze still/renders BEFORE the full mission is built on top.

## Known blockers and prep items (from GODOT-PROOF.md honest limits)

1. **Deploy size**: web export `index.wasm` is 39.5 MB — over GitHub's
   25 MB single-file limit. Needs the wasm-split treatment used by the
   Oct 3 firebabys.io 3D build, or a different host. Solve before launch
   day, not on it.
2. **Phone layout**: proof is landscape 1280×720 only. Portrait/phone
   pass + touch controls (virtual joystick + ACT/BNK/CRCH, per the 2D
   build) are unbuilt.
3. **Real-device performance unproven**: verification was software-rendered
   (SwiftShader/llvmpipe). Scene is light (~4 point lights, primitive
   meshes), but a real-phone run is a required gate before "launch live."
4. **Domain**: firebabys.online DNS is Jeff's Namecheap recovery track.
   Fallback launch address is rebellion.firebabys.io (Cloudflare-wired),
   labeled clearly as a fallback — never dressed up as the real domain.
5. No bloom in the Compatibility renderer; glow = emissive + real lights.
   Accept (phone-safe) unless Jeff demands Forward+/WebGPU cost.

## Suggested build order (once Jeff says go)

1. Art checkpoint: improved Blaze + one Bonehead, stills to Jeff.
2. Full outpost scene (3 zones) + generalized patrols/Slimers.
3. Mission loop wired (gear pad, cages, pump, extraction, rank).
4. Portrait + touch pass; real-phone performance check.
5. Bugs check (per Jeff's standing rule: server endpoints, pages live,
   console errors, boot on phone view) → wasm-split → deploy to fallback
   address; firebabys.online flips when Namecheap is Jeff's again.
