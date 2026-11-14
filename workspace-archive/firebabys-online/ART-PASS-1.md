# Fire Babys Rebellion — Art Pass 1 (2026-10-29)

**Trigger:** Jeff's verdict on the 3D proof: *"Art has to be better before
you build more."* The full game build stays frozen. This pass touched ONLY
character art (plus a light crate touch-up and a capture-only camera flag).
No new gameplay, no new systems, no mission content.

## Stills delivered (engine renders, xvfb, 1280×720)

- `art-blaze-front.png` — Blaze front, full body, three-point beauty light
- `art-blaze-closeup.png` — head/shoulders: face, flame hair, crown
- `art-blaze-guard.png` — Blaze + refreshed Bonehead in the courtyard, pale cone

## Blaze — rebuilt model-by-model (`scripts/player.gd`)

The old rig (sphere head, capsule limbs, one box vest, five cones of hair)
was replaced with **lathe-turned forms** — a surface-of-revolution helper
(`_lathe()`) generates tapered, organic meshes from radius profiles:

- **Silhouette:** athletic proportions, ~1.87 m to the head top (head ≈
  1/6.1 of height). Turned torso (waist → chest → neck taper, elliptical
  cross-section), turned pelvis, thighs with a knee taper, shins with a
  calf bulge, upper arms with a deltoid swell, forearms — all with real
  elbow/knee pivots in the mesh layout, so the existing procedural
  walk/crouch animation now bends actual joints. Heroic idle: elbows
  softly bent (0.38 rad), arms held slightly off the body.
- **Head/face:** turned head with a jaw taper (not a ball). Thick black
  **angry-V brows** (inner ends dropped, outer ends swept back — straight
  from the character brief), **shaped glowing eyes** (flattened almond
  spheres, pale-hot emission) with **dark-red hot pupils**, a subtle nose,
  and a **determined smirk** (rising line + corner tick).
- **Flame hair:** 10 sculpted teardrop tongues (lathe profile: fat base,
  curved taper, fine tip) in three depth layers, replacing the 5 cones.
  Side tongues were re-seated behind the temple line after the first
  capture round showed them sweeping across the cheeks.
- **Crown:** gold band with twin rim rings, five 4-sided points, two small
  side stars, and the **big front star** — Blaze's identity, always on.
- **Gear:** slimmer front/back plates so living-fire chest shows above and
  below the armor; shoulder yoke + straps with metal buckles, vertical
  webbing straps and seam lines on the plate, three flapped pouches, belt
  with buckle, backpack with bedroll and pouches, shoulder pads, forearm
  cuffs, knee pads, boots with toes, mitten fists with thumbs. A small
  **ember-flame emblem** glows on the chest plate (own shader gradient
  range so it actually emits).

## Fire shader (`shaders/fire.gdshader`)

- Four-stop gradient: deep red → dark orange → bright orange → yellow →
  **yellow-white hot core**, with per-material `low_y`/`high_y` ranges.
  The body range was retuned so the head lands **golden** (round 1 blew it
  out to cream/white); hair ranges retuned so tips stay yellow, never white.
- Two-octave flicker (broad breathing + fine licking detail) + a slow
  emission pulse — alive, but subtle at beauty range.
- Stronger hot-yellow fresnel rim.
- Optional vertex sway (`sway_amt`, hair only) so tongues waver.
- Backward compatible: `main.gd`'s brazier flames use the same uniforms.

## Bonehead refresh (`scripts/guard.gd`)

- **Skull:** proper cranium sphere (scaled), brow ridge, cheek block, deep
  dark sockets with glowing coal eyes, nose hole, **teeth** (four upper
  stubs under a dark gum line, three lower), and a darker, slightly open
  jaw. Goofy-menacing, not horror.
- **Body:** segmented vertebra spine + neck vertebrae, **four evenly
  spaced ribs** tapering like a barrel with a sternum strip, grimy
  two-tone bone materials (matte off-white, roughness 0.82, gentler
  self-glow; darker bone for jaw/pelvis/hands/feet).
- **Limbs:** shafts with **knuckle spheres at every joint**, hands and
  feet — no more plain sticks. Pivot layout unchanged, so patrol
  animation and perception code are untouched.

## Environment (light touch, `scripts/main.gd`)

Crates only: two alternating darker wood tones, dark edge trim on all
corners, and a mid band. Colliders/sizes unchanged. Nothing else rebuilt.
Also added `art_mode` (default **off**): when a capture script enables it,
`main._process` skips camera control so the beauty rig owns the camera.
Gameplay default path is byte-identical in behavior.

## Capture rig (`art_capture.gd`, new)

Loads the real scene, enables `art_mode`, parks Blaze by the NW brazier,
adds a **three-point rig** (warm key from the brazier side, cool blue rim
from behind, soft fill) plus his own ground light pool, and frames the
three stills using the rig's real facing basis. `art_verify.gd` (new)
parks the Bonehead, stands Blaze dead ahead, and asserts ALERT.

## Verification (final code state, after polish round)

- Headless boot, 300 frames: **zero script errors, zero parse errors,
  zero shader errors** (only the known ALSA audio-device noise under
  xvfb, which is environmental).
- **Alert loop proven:** `ART VERIFY: ALERT REACHED` — perception
  (range/FOV/raycast occlusion → suspicion → SUSPICIOUS → ALERT) works
  end-to-end with the rebuilt models. Player/guard public APIs
  (`get_detection_factor`, `force_alert_pose`, `state`, `suspicion`,
  `waypoints`) unchanged.
- Two capture rounds: round 1 caught three real defects (flame tongues
  crossing the face, blown-white hair, vest reading as one black slab,
  hero hidden behind a wall in shot 3) — all fixed and re-captured.

## Honest limits

- Still **procedural primitive/lathe modeling, not sculpted meshes**: no
  imported character model, no sculpted hands (mitten fists with thumbs),
  no facial animation — the face is a fixed determined expression.
- Faces are assembled from surface-mounted features (brows/eyes/mouth as
  separate small meshes on the head form). They read cleanly at beauty
  range; at extreme close-up the seams of the technique show.
- The chest emblem is subtle, and hair tips still run pale-yellow at the
  very top of the tallest tongue (reads as the hottest part of the flame).
- Bonehead's refresh reads best at mid-range; at long patrol distances he
  is still a small figure (teeth/jaw detail is a close-range payoff).
- No bloom in the Compatibility renderer (unchanged from the proof) —
  glow is emissive + real lights.
- Software rendering (llvmpipe) says nothing about phone frame rates.
