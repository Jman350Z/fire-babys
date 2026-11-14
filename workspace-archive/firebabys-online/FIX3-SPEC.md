# FIX RUN 3 — real-phone controls (Jeff's retest of Fix Run 2, 2026-10-30 ~20:45 PDT: "controls still don't work")

## Root cause (found by Bobby, code-level, deterministic)
Fix Run 2's change (d) set `pointing/emulate_mouse_from_touch=false` in `godot/project.godot`
to stop emulated mouse drags from orbiting the camera. But EVERY interactive control in
the game is a Godot `Button` — the five touch buttons (hud.gd `_build_touch`, whose own
comment says "Godot feeds them BOTH touch (via touch->mouse emulation) and real mouse
clicks"), the codec tap-catcher (hud.gd:513), hero-select cards, equip START, pause menu.
On a real phone browser, GUI Buttons receive touch presses through that emulation; with
it OFF the buttons are dead — including the codec catcher, so the game looks frozen from
the first screen. The joystick (raw InputEventScreenTouch in `HUD._input`) is the only
control that doesn't need emulation. Playwright/CDP taps synthesize browser-level mouse
events, which is why every harness pass "verified" buttons that real hardware can't fire.
The camera concern is already handled separately: main.gd:991/995 ignore emulated mouse
events (`device != -2`) for orbit/drag.

## Changes
1. `godot/project.godot`: `pointing/emulate_mouse_from_touch=true`. Keep the device -2
   guards in main.gd exactly as they are.
2. Belt-and-braces raw-touch backup in `hud.gd` `_input` (Jeff has burned three playtests;
   the four idempotent actions must fire even if a browser's emulation path misbehaves):
   on `InputEventScreenTouch` pressed, hit-test the touch position against the global
   rects of the ATK / JUMP / WPN / ACT buttons (only when the touch layer is shown) and
   set the same flags their `button_down` handlers set (`atk_queued`, `jump_queued`,
   `wpn_queued`, `act_held = true`); on release, clear `act_held` if the released touch
   started on ACT. Do NOT raw-wire CRCH (toggle would double-fire with the GUI path) and
   do NOT raw-wire the codec catcher (double advance would skip dialogue) — those two
   work through the restored emulation.
3. `site/_headers`: add a `/game/*` block with `Cache-Control: no-cache` so phones
   revalidate the game files on every load — same-named pck/wasm across deploys must
   never serve a stale build again.

## Build + verify (NO deploy — staging only)
- Re-export with the established treatment: wasm split, loader patch, `__FBR3D` absent
  (grep the shipped .pck: 0 matches), `emulate_mouse_from_touch` present as enabled in
  the exported project data if checkable.
- Playwright 390×844 DPR 2 touch pass on the EXPORTED build: boot → select (real
  pictures) → equip → START → codec advances by tap → JUMP (hero leaves ground) →
  double jump → ATK swing → WPN menu → swap → ACT hold near Cage 1. Zero console errors.
  Report harness limits honestly — emulation in a desktop harness is not proof; Jeff's
  phone is the confirming check.
- Rebuild the deploy ZIP at `~/workspace/firebabys-online/firebabys-online-deploy.zip`
  (site tree only, `_headers` included, archive-2d excluded). Update LAUNCH-REPORT.md
  with a Fix Run 3 addendum.
