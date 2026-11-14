# Fire Babys 3D Overhaul — PROOF #2: The Remaining Ten Characters

Built 2026-10-15, following Jeff's verdict to build out the full roster in 3D
after Proof #1 (Blaze + Aqua). Same pipeline as Proof #1: Godot 4.7.2, the
proof stage (gray studio, ACES, key + fill light, ground plane), headless
xvfb-run capture. NOT posted anywhere — for Jeff's eyes first, like Proof #1.

## What was built

A new parameterized character builder, `show_stage/roster_baby.gd` in the
`fire-babys-godot` project (proof #1's `show_baby.gd` untouched). One builder,
ten configurations — each one read directly off Jeff's approved 2D masters in
`~/workspace/fire-babys-shows/characters/`. Every character got a front and a
three-quarter model-sheet still plus a side-by-side sheet against its master
(this folder, one subfolder per character), and all 12 characters (with Blaze
and Aqua from proof #1's builder) appear in `group/full-cast.png`.

| Character | Master source | 3D build |
|---|---|---|
| Ruko | characters/ruko.png | Deep-red flame ball, plain black headband with the angry brows drawn OVER it (as in the master), gritted-teeth bar, sweat drops, fists raised, flame-lick crown |
| Boulder | characters/boulder.png | Orange flame ball tiled with dark charcoal rock plates, face window open, flat unimpressed frown, lava-glow drips under the bottom plates |
| Sizzle | characters/sizzle.png | Bright yellow-orange ball, headband with red chevrons, smirk grin, wooden bow + flaming arrow prop in the left fist |
| Cinder | characters/cinder.png | Wild flame creature: tall cone flame tongues tipped blue/purple, fang grin with pink tongue peeking out, separate belly body, floating ember-shard stars |
| Lord Inferno | characters/lord-inferno.png | Chibi armored knight: charcoal plate armor, horned helmet shell with center spike + forehead gem, red face, gritted teeth, jagged beard plates, spiked pauldrons, chest gem, subtle lava cracks, flame wisps behind the shoulders |
| Splash | characters/splash.png | Blue droplet body, plain black headband + brows over it, gritted teeth, water droplets beaded on the body, fists raised |
| Pebble | characters/pebble.png | Cyan water ball tiled with blue ice-rock plates, flat frown, water drips under the plates |
| Drift | characters/drift.png | Blue droplet, headband with light-blue chevrons, smirk, wooden bow + ice arrow |
| Bubble | characters/bubble.png | Wild water creature: tall splash-cone tongues, fang grin + tongue, belly body, droplets |
| Lord Tidal | characters/lord-tidal.png | Chibi knight in blue-steel armor: horned helmet, pale-blue face, gritted teeth, beard plates, spiked pauldrons, cyan gems |

Brand rules held throughout: toyetic plushie silhouettes, ZERO
beaks/wings/feathers on any Baby (Lord Tidal deliberately got NO shoulder
splashes — at the shoulders they read as wings), nobody harmed or mocked.

## Fidelity gaps — stated plainly

1. **The Lords are stylized chibi approximations.** Their 2D masters are the
   most detailed designs on the roster (engraved plate armor, many small
   parts). The 3D versions capture the silhouette, colors, horns, gems,
   beard, pauldrons and attitude, but not the fine armor engraving. Lord
   Tidal's pale face also renders near-white under the stage key light.
2. **Boulder & Pebble's rock plates are rounded boxes**, not the irregular
   cracked-rock chunks of the masters; there is no crack texture, and the
   lava/water glow shows only as drips under the bottom edge rather than
   light shining through every plate gap.
3. **Cinder & Bubble are the wildest interpretations.** Their masters are
   sharp, jagged 2D silhouettes; the 3D tongues are cone-and-ball plush
   forms — same shapes and colors, softer read, in line with the proof #1
   plush style.
4. **Headbands sit as 3D cylinders**; the knot tails are at the back (best
   seen in the three-quarter stills). The chevrons are separate small
   chevron plates standing on the band, not printed on it.
5. **Same known proof-#1 gaps carry over**: glossy shader-gradient bodies
   vs the painted masters, mouths don't animate in stills, stubby rig legs,
   and the Lords' builder path is stills-only (no idle animation yet —
   they're not wired for episodes until Jeff approves the look).
6. Water side-licks render pale under the stage light (same as Aqua in
   proof #1).

## Addendum — stands re-stage (2026-10-15, Jeff's direction)

Jeff on the flat group shot: "You need to have them standing on a stadium
stands — they are all the same size, so I can't see the characters in the
back." Re-staged in `show_stage/proof2_stands.gd`: 4 tiered bleacher rows
(rise 1.30, depth 1.85) — front: Pebble / Bubble / Boulder; then Splash /
Cinder / Drift; then Ruko / Aqua / Sizzle; top: Lord Inferno / Blaze /
Lord Tidal (Lords anchor the top ends, Blaze top-center). Models unchanged.
Output: `group/full-cast-stands.png` (1920×1080) plus
`group/full-cast-stands-portrait.png` (1080×1920). All 12 faces verified
fully visible (v1 rise hid Aqua's chin behind Cinder's crown; rise + row
depth fixed it). `group/full-cast.png` untouched.

## Files

- Stills: `proof-2/<character>/<character>-front.png` and
  `-threequarter.png` (1080×1920), `<character>-side-by-side.png`
- Group: `proof-2/group/full-cast.png` (1920×1080, all 12)
- Code: `~/workspace/fire-babys-godot/show_stage/roster_baby.gd` (builder),
  `proof2_stills.gd` (model sheets; pass character names as args to
  re-render a subset), `proof2_group.gd` (group shot),
  `make_side_by_side.py` (comparison sheets)
