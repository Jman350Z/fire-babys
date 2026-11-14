# Godot 4.7.2 Feature Knowledge Base — Fire Babys

> **Purpose:** Research-only study of Godot Engine 4 features so the Fire Babys games (2D battler, 3D arena, open world) can be built better.
> **Binary verified against:** `4.7.2.stable.official.ed1daf0bf` at `~/workspace/godot/Godot_v4.7.2-stable_linux.x86_64` (headless `--script` + real-project runs, 2026-10-04).
> **Constraint honored:** the game project at `~/workspace/fire-babys-godot/` was never touched; all verification ran in `/tmp/godot-study-*/` scratch dirs.
> **Caveat:** headless uses a dummy renderer — GPU *compilation* of shaders and actual *pixel output* cannot be validated headless. Everything marked "verified headless" means the API accepted the calls and behavior held up in real project runs where stated.

---

## ⭐ Top 10 features to adopt for Fire Babys (ranked by impact vs. effort)

| # | Feature | Impact / Effort | Why for Fire Babys |
|---|---------|-----------------|--------------------|
| 1 | **StandardMaterial3D emission + Environment glow/tonemap** (3D rendering) | High / **Low** | The entire "living fire" look — emissive orange bodies, lava, ACES tonemap, bloom — is fully Compatibility-safe with **zero custom shaders**. Biggest visual lever for the web build. |
| 2 | **UI stretch `canvas_items` + aspect `expand` + anchor layouts** (UI) | High / **Low** | Two project settings + anchor discipline = HUD survives every kid's phone screen ratio. Docs-prescribed mobile setup, verified in 4.7.2. |
| 3 | **Custom Resources for item/quest/weapon data** (GDScript) | High / **Low** | One `WeaponData`-style script + hundreds of `.tres` files replaces per-weapon code — the 1006-weapon roster becomes data-editable with `@export` sliders/dropdowns; Jeff can balance without reading code. |
| 4 | **Audio bus tree + AudioStreamRandomizer + master limiter** (audio) | High / **Low** | `Master → Music / SFX / Ambience / UI` buses with a limiter; randomizer kills repetition on fire crackles. 17 headless tests passing. |
| 5 | **GPUParticles3D fire/ember/smoke system** (VFX) | High / **Low** | Campfire embers, volcano smoke (sub-emitter), POOF steam bursts — verified on the exact nothreads web config. Instant visual life. |
| 6 | **AnimationTree + AnimationNodeStateMachine + BlendSpace** (3D gameplay) | High / **Low** | The whole combat/locomotion system (Idle/Run/Attack/Hit + 8-way run blending + one-shot hit reactions) — the standard Godot pattern, verified working. |
| 7 | **SpringArm3D third-person camera** (3D gameplay) | High / **Low** | One node stops the follow camera clipping through arena walls. Verified in 6 lines of setup. |
| 8 | **NavigationAgent3D + runtime navmesh baking** (navigation) | High / **Medium** | Real skeleton pathfinding around volcano rocks/kingdom walls (bake 3–5 ms at level load) + free RVO crowd avoidance. Unlocks actual AI instead of scripted movement. |
| 9 | **Shared Theme + StyleBoxFlat for kid-friendly UI** (UI) | High / **Medium** | One Theme = chunky rounded big-button styling app-wide, zero art assets; per-screen `add_theme_*_override()` for exceptions. |
| 10 | **WorldEnvironment depth/height fog + ProceduralSkyMaterial + one shadowed directional sun** (3D rendering) | High / **Low–Med** | Warm height fog around the volcano + art-directed sunset sky + 4-split cascade shadows = cinematic open world, all web-safe (skip volumetric/SSIL/DOF — silently dead on web). |

**Just outside the top 10 (high value, next round):** AudioStreamInteractive adaptive music (calm→tense→battle, High/Med); MultiplayerSynchronizer (smooth arena state sync, High/Med); WebXR `immersive-ar` "AR Fire Baby in your room" (High/Low-Med, needs device test); SkeletonIK3D for CATCH-mode grab/dunk (Med/Low); CanvasItem shaders for pulsing fire-glow on 2D UI (High/Med).

**Web-build headline rule:** on the Compatibility (GLES3) renderer + nothreads template, design around **emission + glow + fog + sky + baked lighting**. Treat SDFGI, VoxelGI, SSIL, volumetric fog, DOF, screen-space reflections, TAA, FXAA, SMAA, and FSR (1.0 and 2.2) as **non-existent**. They are silently dead on web — the engine only emits warnings, it doesn't fail.

---

## 1. 2D Systems

### Sprite2D / AnimatedSprite2D
Displays a single texture (Sprite2D) or frame-based animations from a SpriteFrames resource (AnimatedSprite2D) with per-animation speed and loop control. Fully supported in Compatibility + web.
```gdscript
var sf = SpriteFrames.new()
sf.add_animation("walk")
sf.set_animation_speed("walk", 8.0)
sf.set_animation_loop("walk", true)
sf.add_frame("walk", frame_tex_1)
var a = AnimatedSprite2D.new()
a.frames = sf
a.play("walk")   # a.is_playing(), a.speed_scale, a.frame
```
Verified headless: 2 frames in "walk", `is_playing=true`.
**Fire Babys:** Ruko idle/walk/attack cycles via SpriteFrames for the 2D battler (or 2D UI sprites/portraits in the open world).

### TileMapLayer + TileSet (Godot 4's new tile system)
Godot 4 replaced old TileMap with **TileMapLayer** nodes (one per layer, stacked); tiles come from a TileSet of TileSetAtlasSources. Fully web-safe.
```gdscript
var ts = TileSet.new(); ts.tile_size = Vector2i(16, 16)
var src = TileSetAtlasSource.new(); src.texture = atlas_texture
src.texture_region_size = Vector2i(16, 16); src.create_tile(Vector2i(0, 0))
var source_id = ts.add_source(src)
var layer = TileMapLayer.new(); layer.tile_set = ts
layer.set_cell(Vector2i(2, 1), source_id, Vector2i(0, 0))
layer.map_to_local(Vector2i(2, 1))   # grid -> world pos
```
Verified headless: set/erase/query round-trips all pass.
**Fire Babys:** 2D mode — fire-station/neighborhood safety maps ("escape the house" level layouts).

### AnimationPlayer (2D usage)
Keyframed animation of any node property. Godot 4 stores clips in an **AnimationLibrary** (`add_animation_library("", lib)` — `add_animation()` no longer exists). **Track paths resolve relative to the player's parent** (standard pattern: player is a child of the animated node; `":position"` targets the parent).
```gdscript
var anim = Animation.new(); anim.length = 1.0
var idx = anim.add_track(Animation.TYPE_VALUE)
anim.track_set_path(idx, ":position")
anim.track_insert_key(idx, 0.0, Vector2.ZERO)
anim.track_insert_key(idx, 1.0, Vector2(64, 32))
var lib = AnimationLibrary.new(); lib.add_animation("hop", anim)
ap.add_animation_library("", lib); ap.play("hop")
```
Verified headless: at t=0.5 position interpolated to (32, 16) exactly. Sibling paths (`"../SSprite:position"`) do NOT resolve in 4.7.
**Fire Babys:** UI tweens (menu pops, badge unlocks), NPC bobbing, script-free 2D motion.

### GPUParticles2D / CPUParticles2D
GPU version configured via ParticleProcessMaterial; CPU version with plain properties — the safe fallback. Both web-safe in Compatibility.
```gdscript
var pm = ParticleProcessMaterial.new()
pm.direction = Vector3(0, -1, 0); pm.spread = 25.0
pm.gravity = Vector3(0, 98, 0)
pm.initial_velocity_min = 60.0; pm.initial_velocity_max = 120.0
var gpu = GPUParticles2D.new(); gpu.amount = 32; gpu.lifetime = 0.6
gpu.process_material = pm; gpu.emitting = true
```
Verified headless. On low-end phones prefer CPUParticles2D or small GPU amounts.
**Fire Babys:** ember trails on Ruko, splash particles when extinguishing fires, badge-unlock bursts — highest feel-per-line in 2D.

### CanvasItem shaders
`shader_type canvas_item;` fragment shaders on any 2D node via ShaderMaterial. `get_shader_parameter` returns null for never-overridden uniforms (defaults live in shader code — not a bug). TIME/UV/COLOR/TEXTURE all work in Compatibility on web.
```gdscript
sh.code = """shader_type canvas_item;
uniform float pulse_speed = 4.0;
void fragment() {
    float pulse = 0.75 + 0.25 * sin(TIME * pulse_speed + UV.x * 6.2831);
    vec2 center = UV - vec2(0.5);
    float glow = smoothstep(0.5, 0.0, length(center)) * pulse;
    COLOR = vec4(glow_color.rgb * glow, glow);
}"""
```
**Fire Babys:** pulsing fire-glow on Ruko, water shimmer, lava heat-haze tint — zero extra art assets.

### 2D physics: CharacterBody2D, RigidBody2D, Area2D, CollisionShape2D
CharacterBody2D = kinematic player via `move_and_slide()`; RigidBody2D = full simulation; Area2D = non-solid detection zone (`body_entered`/`body_exited`). Verified in a **real project run** (bare `--script` mode does NOT integrate RigidBody2D or collide `move_and_slide` — key environment finding).
```gdscript
area.body_entered.connect(func(b): print(b.name, " entered"))
area.get_overlapping_bodies()
```
Verified: player landed exactly on floor (on_floor=true), Area2D fired enter + exit.
**Fire Babys:** 2D minigame movement, tossed water balloons/extinguisher props, hazard zones ("too close!" campfire trigger), pickups.

### PointLight2D + 2D shadows
Radial light with gradient texture, energy, color, `texture_scale`; LightOccluder2D + OccluderPolygon2D cast shadows. Supported in Compatibility on web (a handful of lights is fine; dozens hurt weak phones).
```gdscript
var light = PointLight2D.new()
light.texture = radial_gradient_texture
light.energy = 1.2; light.color = Color(1.0, 0.6, 0.25)  # warm fire glow
light.texture_scale = 3.0; light.shadow_enabled = true
```
**Fire Babys:** campfire/volcano glow, Ruko's flickering light, Underworld Kingdom atmosphere.

### Camera2D
Limits, position/rotation smoothing, drag margins, zoom, shake via `offset`. Call `make_current()` after `add_child`. Zero renderer cost.
**Fire Babys:** smooth follow-cam with map limits; shake on volcano rumble / Ruko taking a hit.

### ParallaxBackground / ParallaxLayer
Infinite-scroll layers: `motion_scale` (depth factor), `motion_mirroring` (repeat), drive via `scroll_offset` (there is no `scroll_begin()` in Godot 4).
**Fire Babys:** layered skies/volcano silhouettes behind 2D levels or title screen.

---

## 2. 3D Rendering (with Compatibility-renderer verdicts)

### StandardMaterial3D — albedo / metallic / roughness / emission ✅ WORKS on web
PBR material; `emission` + `emission_energy_multiplier` = fire-glow workhorse; `rim_enabled` = cheap fresnel edge tint (toon-friendly). Subsurface scattering is the only feature ❌ in Compatibility — use emission + rim instead.
```gdscript
mat.albedo_color = Color(1.0, 0.35, 0.08)
mat.emission_enabled = true
mat.emission = Color(1.0, 0.25, 0.05)
mat.emission_energy_multiplier = 3.0
mat.rim_enabled = true; mat.rim = 1.0
```
**Fire Babys:** living-fire bodies with zero shader code — emissive orange body + bright rim + bloom reads as "made of fire."

### OmniLight3D / SpotLight3D / DirectionalLight3D + shadows ✅ WORKS (limits)
Max 8 omni + 8 spot per mesh (raisable), 8 directional; shadowed lights are multi-pass (costly); PCSS soft shadows, contact shadows, light projectors ❌. Practical rule: one shadowed directional sun + a few shadowless omnis.
```gdscript
sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
sun.directional_shadow_max_distance = 120.0
```
**Fire Babys:** shadowed sun for the volcano island + cheap shadowless orange omnis under lava pools and inside each Fire Baby.

### Global illumination: SDFGI / VoxelGI / LightmapGI
**There is no `SDFGI` node class** — it is only `Environment.sdfgi_enabled`. SDFGI ❌ and VoxelGI ❌ on Compatibility (Forward+ only — engine warns). LightmapGI: rendering baked lightmaps ✔ works, but baking needs RenderingDevice-capable hardware (not the web target).
**Fire Babys:** don't design around GI on web. Skip entirely; lean on emission + ambient sky light.

### WorldEnvironment ✅ mostly WORKS on web
Sky background, ACES/Filmic/AgX tonemap, SSAO ✔, glow/bloom ✔, depth + height fog ✔, adjustments ✔ — all web-safe. SSIL ❌, volumetric fog ❌, DOF ❌. **DOF moved off Environment in 4.7** — it now lives on `CameraAttributesPractical` (`dof_blur_far_enabled`).
```gdscript
env.background_mode = Environment.BG_SKY
env.tonemap_mode = Environment.TONE_MAPPER_ACES
env.glow_enabled = true; env.glow_bloom = 0.1
env.fog_enabled = true; env.fog_height_density = 0.02
```
**Fire Babys:** ACES + warm height fog around the volcano + glow on emissive lava = the entire art direction, web-safe.

### Volumetric fog / FogVolume ❌ NOT on web
"Volumetric fog is only available when using the Forward+ renderer."
**Fire Babys:** substitute height fog + animated smoke particles for the volcano plume.

### Sky resources ✅ WORKS on web
ProceduralSkyMaterial (art-directable colors/sun), PhysicalSkyMaterial (atmospheric), PanoramaSkyMaterial (HDRI). 4.7 enum is `Sky.PROCESS_MODE_AUTOMATIC`.
**Fire Babys:** day/night + "volcano sunset" dial; the sky drives ambient light for free.

### LOD ✅ WORKS on web
No `HLODInstance3D`/`LODGroup3D` node in 4.7.2 — automatic mesh LOD is generated at import time (meshoptimizer, glTF/FBX); per-instance `GeometryInstance3D.lod_bias`; manual distance culling via `visibility_range_begin/end` + fade modes.
**Fire Babys:** import-time LOD + `visibility_range_end` on distant kingdom props/trees — the cheapest perf win for low-end phones.

### Occlusion culling (OccluderInstance3D) ✅ WORKS on web
Box/Sphere/Quad/Polygon/Array occluders hide what's behind them. (Headless caveat: assigning `.occluder` segfaults in dummy-renderer mode — almost certainly headless-only.)
**Fire Babys:** modest value for an open island (shines indoors); skip unless kingdom forts get dense.

### ReflectionProbe ✅ WORKS on web (2 per mesh)
Box-projected cubemap reflections; property is `size` (not `box_size`); `update_mode = UPDATE_ONCE` for baked captures. Screen-space reflections ❌ on web — this is the only reflection path.
**Fire Babys:** one probe over the lava lake, one at the crater — molten reflections on rock for free.

### MSAA / anti-aliasing ✅ MSAA only on web
MSAA 4x ✔, SSAA ✔, bilinear scaling ✔; TAA ❌, FXAA ❌, SMAA ❌, FSR 1.0 ❌, FSR 2.2 ❌.
**Fire Babys:** MSAA 4x is the *only* quality AA on web — enable it (the documented pairing for the toon look).

---

## 3. 3D Gameplay & Animation

### CharacterBody3D ✅ web-safe
Kinematic body with `move_and_slide()`; `floor_max_angle`, `floor_snap_length`, `floor_block_on_wall`. Verified in project mode: fell, landed, ran a 30° ramp edge (`on_floor=true`).
**Fire Babys:** the playable fire baby controller (WASD + jump + slopes).

### RigidBody3D ✅ web-safe
Mass, `physics_material_override` (friction/bounce), `contact_monitor` + `max_contacts_reported` for `body_entered`. Verified: bounced, rolled, 3 enter events.
**Fire Babys:** dunk tanks, projectiles, knockback props in CATCH mode.

### Ragdolls via PhysicalBone3D ⚠️ half-verified headless
PhysicalBone3D (collision + joint) under PhysicalBoneSimulator3D (child of Skeleton3D); `physical_bones_start_simulation()` / `physical_bones_stop_simulation()`. No `simulate_physics` property — use `is_simulating_physics()`. **Bodies fall and collide headless, but Skeleton3D bone poses never mirrored the bodies** (headless skeleton-update limitation). Physics half verified; skeleton mirroring needs an in-editor visual check.
**Fire Babys:** skeleton death/collapse animations.

### AnimationPlayer (3D) ✅ web-safe
Key transform tracks (`TYPE_POSITION_3D`, `TYPE_ROTATION_3D`, `TYPE_SCALE_3D`); `advance()` steps deterministically headless.
**Fire Babys:** emotes, UI-attached 3D effects, build-a-fire-baby preview.

### AnimationTree + AnimationNodeStateMachine + OneShot ✅ web-safe
`tree_root` = state machine or blend tree; `parameters/playback` → `travel()`; transitions need `AnimationNodeStateMachineTransition` with `xfade_time`. OneShot lives inside a blend tree: `connect_node("OneShot", 0, "Base")`, `connect_node("OneShot", 1, "Shot")`, `connect_node("output", 0, "OneShot")` — output node is lowercase `"output"`; fire with `parameters/OneShot/request = ONE_SHOT_REQUEST_FIRE`.
```gdscript
sm.add_node("Idle", idle_node); sm.add_node("Attack", attack_node)
var t := AnimationNodeStateMachineTransition.new(); t.xfade_time = 0.2
sm.add_transition("Idle", "Attack", t)
tree.tree_root = sm; tree.active = true
(tree.get("parameters/playback") as AnimationNodeStateMachinePlayback).travel("Attack")
```
Verified headless in project mode: travel landed on Attack, OneShot fired and auto-cleared.
**Fire Babys:** combat state machine (Idle/Run/Attack/Hit/Dunk), one-shot hit reactions.

### BlendSpace1D / 2D ✅ web-safe
Locomotion blending; `add_blend_point(node, pos, -1, "Name")` (name recommended — 4.7.2 warns on empty); drive with `parameters/blend_position`.
**Fire Babys:** 8-way run blending for the fire baby and skeletons.

### SkeletonIK3D ✅ web-safe (deprecated but functional)
A SkeletonModifier3D — **must be a child of Skeleton3D** (uses parent skeleton); set `root_bone`/`tip_bone` **before** `add_child`; `interpolation` deprecated → use `influence`; `start(true)` = one-time solve. Verified exact: hand landed on target (dist 0.0).
**Fire Babys:** CATCH-mode grab/dunk hand placement, foot planting. Migration path: TwoBoneIK3D et al.

### SkeletonModifier3D / SpringBoneSimulator3D ⚠️ setup verified headless
22 subclasses in 4.7.2. SpringBoneSimulator3D is chain-based with **indexed** settings: `set_setting_count(1)` first, then `set_root_bone_name(0, ...)`. Setup applies cleanly; simulation didn't manifest headless (deferred-update limitation) — worth one editor visual pass.
**Fire Babys:** flame-tip jiggle, accessory wobble (hats, capes) — cheap procedural life.

### MultiMeshInstance3D ✅ web-safe
One draw call for N instances: `transform_format = TRANSFORM_3D`, `mesh`, `instance_count`, `set_instance_transform(i, t)`. Headless caveat: per-instance readback returns identity under the dummy renderer (server round-trip only works on a real renderer).
**Fire Babys:** skeleton crowds, forests, arena decorations — the standard web crowd technique.

### CSG nodes ✅ (prototype only)
CSGBox3D/CSGCylinder3D/CSGCombiner3D with `OPERATION_SUBTRACTION`; `get_meshes()` returns pairs. Bake at build time — don't ship CSG in final scenes (convert to static meshes).
**Fire Babys:** rapid prototyping of arenas, dunk tanks, obstacle courses.

### SpringArm3D ✅ web-safe
Third-person camera boom: `get_hit_length()` shortens when blocked; camera child auto-pulls in. Verified in project mode: wall at z=-2 → `hit_length=1.74`, camera pulled in exactly.
**Fire Babys:** third-person follow camera that never clips through arena walls — one node, six lines.

---

## 4. Audio

### Positional audio ✅ (headless-tested)
AudioStreamPlayer3D with attenuation, `max_distance`, `unit_size`, `panning_strength`. 17 headless tests passing across the audio category.
**Fire Babys:** volcano rumble that fades with distance, fire crackle near campfires.

### Bus tree ✅ web-safe (with a caveat)
`Master → Music / SFX / Ambience / UI` buses + limiter on Master. **Web caveat:** buses created at runtime via `add_bus()` may be SILENT on web — ship a `default_bus_layout.tres` in the project instead.
**Fire Babys:** independent volume sliders for kids/parents; limiter prevents harsh clipping.

### AudioStreamRandomizer ✅
Picks a random stream per play — kills repetition on fire crackles, footsteps, UI blips.
**Fire Babys:** fire sounds that never feel looped.

### Audio effects ✅
Reverb (ReverbEffect/AudioEffectReverb), EQ, compressor, pitch shift, low-pass. Gotchas found: `AudioStreamWAV.loop_end` must be set explicitly (default 0 = stream ends immediately); `AudioEffectEQ` bands use `set_band_gain_db(idx, db)`, not `band_db/<idx>`; `AudioEffectPitchShift.fft_size` takes an enum index, not a sample count.
**Fire Babys:** volcano-area reverb, underwater muffling via low-pass, pitch-varied fire pops.

### AudioStreamInteractive ✅ (adaptive music)
Layers/intensity crossfade — verified for calm→tense→battle transitions.
**Fire Babys:** arena music that intensifies as the match heats up — High impact/Medium effort.

### DIY occlusion
**Godot 4.7.2 has NO built-in audio occlusion and no ReverbZone node** — DIY via raycast + low-pass bus effect.
**Fire Babys:** muffle volcano sounds when the player ducks behind a rock wall.

### Web audio rules (verified)
- Audio starts only after a **real user gesture** — keep a tap-to-start gate.
- `audio/general/default_playback_type.web = 1` (PLAYBACK_TYPE_STREAM) verified.
- nothreads export = higher audio latency; Runtime `add_bus()` may be silent on web.
- Area ambience: code-driven zone crossfade + reverb wet (High/Low) — e.g. volcano vs. meadow vs. Underworld.

---

## 5. XR (AR/VR)

### XRServer + interface system
Singleton registry: `get_interfaces()`, `find_interface("OpenXR")`, `initialize()` (returns bool — false with no hardware, graceful, no crash). Graceful failure = how to make XR optional without breaking the flat game.

### OpenXR (native) — verified present in 4.7.2
OpenXRInterface, OpenXRActionSet, OpenXRAction, composition layers all in core. `is_passthrough_supported()` callable. **Not in core:** OpenXRFBRenderModelManager, OpenXRMetaSpatialAnchor — those are in the **OpenXR Vendors plugin** (shipped with the Godot Asset Store in 4.7).
**Fire Babys:** future native Quest/Android build (hand-tracked fire-safety play); needs real headset + vendor plugin.

### WebXR (web export) — the Fire Babys XR path
`WebXRInterface` drives VR/AR in the browser via the WebXR Device API. Signal-based: `session_supported`, `session_started`, `session_ended`, `session_failed`; `session_mode` = `"immersive-ar"` / `"immersive-vr"` / `"inline"`. Requirements: **HTTPS** (firebabys.io qualifies), a **user gesture**, a WebXR-capable browser. Open question: nothreads template behavior — verify on device.
**Fire Babys:** "AR Fire Baby in your room" viewer or room-scale fire-hazard scavenger hunt inside the existing web export, behind one button. Phone AR (`immersive-ar`) fits the fire-safety mission; headset passthrough needs a native build.

### XROrigin3D / XRCamera3D / XRController3D / XRNode3D / XRAnchor3D
The XR rig; same node API under OpenXR and WebXR — rig code is portable, only interface init differs.

### Hand tracking
XRHandTracker + **XRHandModifier3D** (works with any backend; the old OpenXRHand node is deprecated). WebXR can request `required_features = "hand-tracking"`.
**Fire Babys:** controller-free interaction (grab extinguishers, point at hazards) — the kid-friendliest XR input.

### AR reality check
Plane detection / spatial anchors are NOT in Godot core — vendor-plugin territory. Passthrough is standardized via OpenXR environment blend modes.
**Fire Babys:** phone-based WebXR AR is the only AR path from the web export today.

---

## 6. Networking / Multiplayer

### MultiplayerAPI fundamentals ✅ verified over real TCP
`get_multiplayer()` (note: SceneTree exposes it as methods, not a `multiplayer` property — Node has the property). `set_multiplayer_peer()`, `poll()` drives it. Server = ID 1. End-to-end test: server saw peer join, client got unique ID.
**Fire Babys:** the framework an authoritative arena server would be built on.

### @rpc ✅ verified live
`@rpc(mode, sync, transfer_mode, channel)`. **mode = who may CALL** (`"authority"` = only authority; `"any_peer"` = anyone — use for player input). sync: `call_remote` vs `call_local`. Arg order is `(mode, sync, transfer_mode, channel)` — `"unreliable"` in second position is a parse error. The authority rule is **enforced**: a client calling an `"authority"` RPC was rejected with an engine ERROR.
**Fire Babys:** `any_peer` for player input/fireball casts, `authority` for server-adjudicated hits, `unreliable` for high-frequency effects.

### MultiplayerSynchronizer ✅ verified live
Replicates node properties from authority to peers. `SceneReplicationConfig.add_property(".:position")`; modes `REPLICATION_MODE_ALWAYS` (unreliable) / `ON_CHANGE` (reliable). **Two real gotchas:** (1) `set_replication_interval()` takes **seconds** despite the bind param being named "milliseconds" (confirmed in 4.7 source) — passing 100 = 100-second intervals (silence). (2) Synchronizer nodes need explicit matching names on all peers (`@MultiplayerSynchronizer@N` breaks the path cache).
**Fire Babys:** smooth player position/health sync in the 3D arena — replaces hand-rolled state messages.

### MultiplayerSpawner ✅ verified live
Register scenes with `add_spawnable_scene()`, set `spawn_path` (default EMPTY — must be set); adding a registered scene under the path **auto-replicates**. `spawn()` is only for custom spawns (requires `spawn_function` — `spawn(null)` fails). Tracked nodes are cleaned up when the spawning peer disconnects.
**Fire Babys:** fireballs, pickups, enemies, effects become one-liners.

### ENetMultiplayerPeer ⚠️ native only
UDP with reliability layers — default low-latency choice for native. **Does NOT work on web exports** (browsers expose no raw UDP). Only relevant if Fire Babys ever ships native builds or a native dedicated server.

### WebSocketMultiplayerPeer ✅ the web transport
High-level API over WebSocket; `create_server` (native only — browsers can't listen), `create_client("ws://…")` works in web exports; use `wss://` in production. WebRTCMultiplayerPeer = same API over WebRTC data channels (P2P-capable) but needs manual SDP/ICE signaling.
**Fire Babys:** a native headless Godot dedicated server speaking WebSocket (`wss://`) could authoritatively host the 3D arena — real cheat-resistant netcode to replace/augment the Cloudflare worker relay.

### Bandwidth & packet sizes ✅
`set_max_sync_packet_size(1350)` (min 128), `set_replication_interval`/`set_delta_interval` in **seconds**, separate channels per stream type to avoid head-of-line blocking (matters more on web/TCP).
**Fire Babys:** 30-player lobbies — positions on ALWAYS/unreliable, hits/pickups on reliable RPCs, separate channels.

### SceneTree polling ✅
Auto-polls each frame (`set_multiplayer_poll_enabled()`); synchronizer/spawner replication ticks live inside `poll()` — no custom network loop needed.

---

## 7. UI

### Control anchors + containers ✅
Anchors pin edges (`PRESET_FULL_RECT`, `PRESET_BOTTOM_WIDE`…); VBox/HBox stack, CenterContainer centers, MarginContainer gutters, GridContainer N columns. Verified exact layout math in 720×1280.
**Fire Babys:** the whole phone HUD built on anchors/containers survives every screen ratio.

### Theme resources ✅
`Theme` bundles styleboxes/colors/fonts/sizes; per-control `add_theme_*_override()` wins over the theme. **4.7.2 corrections:** `ThemeDB.fallback_theme` does NOT exist — use `get_default_theme()` / `get_project_theme()`; when *reading* theme items pass the explicit theme_type or you silently get the default theme.
**Fire Babys:** one shared "Fire Babys" Theme = chunky kid-friendly buttons app-wide.

### StyleBoxFlat / StyleBoxTexture ✅
Rounded bordered shadowed panels in code; 9-slice texture panels. Runtime `ImageTexture` avoids shipping assets for simple panels.
**Fire Babys:** free juicy kid-UI with zero art assets.

### RichTextLabel (BBCode) ✅
`[b]`, `[color]`, `[font_size]`, `[center]`…; `append_text()`, `clear()`. **4.7.2 quirk:** `get_parsed_text()` returns only the FIRST paragraph (stops at first newline); content is intact — page dialogue manually.
**Fire Babys:** quest text, fire-safety tips, NPC dialogue with bold/colored keywords for young readers.

### Buttons ✅ (focus needs device check)
`pressed`, `toggled` (`toggle_mode`), `focus_entered/exited`, `mouse_entered/exited`; state styleboxes normal/hover/pressed/focus/disabled + `flat` mode. `grab_focus()` doesn't work headless — eyeball focus visuals on a real device. Phones have no hover — design for touch (≥96px targets, clear `pressed` state).
**Fire Babys:** big CATCH-mode buttons with fat `pressed` feedback; `toggle_mode` for sound/element toggles.

### Touch input ✅
TouchScreenButton (Node2D, Shape2D hit-area, VISIBILITY_TOUCHSCREEN_ONLY hides it on desktop); `emulate_touch_from_mouse` for desktop testing; synthetic `InputEventScreenTouch` via `Input.parse_input_event` fires `pressed` headless.
**Fire Babys:** on-screen joystick/action buttons for the 3D arena on phones.

### UI scaling ✅ — THE phone setting
**Godot 3's `stretch_mode` names do NOT exist** (parse error) — it's `Window.content_scale_mode` / `content_scale_aspect` / `content_scale_size`. Docs-prescribed portrait mobile setup: base 720×1280, `canvas_items` + `expand` (crisp UI, fills tall screens instead of letterboxing).
```gdscript
w.content_scale_mode = Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
w.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND
w.content_scale_size = Vector2i(720, 1280)
```
**Fire Babys:** one settings change that makes every screen phone-proof.

### ScrollContainer / TabContainer ✅
Scroll: `scroll_vertical`, `ensure_control_visible()` (effective max = max_value − page). Tabs: `current_tab`, `set_tab_title()`, `tab_changed`; standalone TabBar exists. Bump tab font/height via theme for small thumbs.
**Fire Babys:** quest/task lists, the 1006-weapon inventory (scrollable); Play / Shop / Daily Quests as tabs on one screen.

---

## 8. GDScript Advanced

### Custom Resources (data assets) ✅
`class_name … extends Resource` + `@export` vars = inspector-editable, savable as `.tres`, loadable at runtime. Round-trip through `ResourceSaver.save` / `ResourceLoader.load` verified (value 120 preserved).
**Fire Babys:** **the** answer for 1006 weapons (+ armor, accessories, quests) — one script, hundreds of `.tres` files, balanced without touching code.

### Signals ✅
`signal caught_fire(intensity: int)`; `.connect()`; `.emit()`; `CONNECT_ONE_SHOT` auto-detaches. Lambda handlers work.
**Fire Babys:** `caught_fire(intensity)`, `quest_completed`, `ko_scored` — HUD/audio/analytics subscribe without game logic knowing they exist.

### Autoloads (singletons) ✅
`[autoload]` in `project.godot` instantiates under the root viewport on frame 1 (`*res://game_state.gd`). Keep them lean on phone memory.
**Fire Babys:** `GameState` (coins, season, player name), `AudioBus`, `SaveManager` — global without spaghetti.

### Static typing ✅
`var health: int`, `func heal(amount: int) -> int`, `Array[int]` — compiler catches mismatches, VM runs typed code faster. Same bytecode the web export runs.
**Fire Babys:** type hot paths (damage calc, leaderboards) and schemas (`Array[WeaponData]`) — fewer "why is damage a String" bugs.

### Lambdas / Callables ✅
`var triple := func(n: int) -> int: return n * 3`; `Callable(self, "_greet").bind("Ruko")`; `button.pressed.connect(func(): ...)`. Gotcha: lambdas capturing loop vars — bind the value instead.
**Fire Babys:** one-line button handlers, per-quest callbacks.

### EditorPlugin (compile-verified)
`@tool` scripts extending EditorPlugin: docks (`add_control_to_dock`), inspector plugins, custom types. `remove_control_from_docks()` takes the control. Headless can't instantiate them (`scr.new()` returns null) — needs a running editor.
**Fire Babys:** a "Fire Babys" editor dock — one-click weapon `.tres` creator, BBCode dialogue previewer, fire-safety checklist.

### GDExtension (overview)
C/C++/Rust classes callable from GDScript; needs SCons + compiled lib + `.gdextension` manifest. Web exports need it compiled to **WASM** — materially harder; nothreads constrains further. `GDExtension` / `GDExtensionManager` confirmed present in 4.7.2.
**Fire Babys:** almost certainly unnecessary — revisit only if profiling proves GDScript is the bottleneck.

### UID system ✅
Stable `uid://…` per resource (`.uid` sidecars) — renames/moves don't break references. `ResourceUID.text_to_id()` / `id_to_text()` round-trip exact. Keep `.uid` files in version control.
**Fire Babys:** rename-proof references across 1006 weapon `.tres` files and scenes.

### @export variants ✅
`@export_range` (slider), `@export_enum` (dropdown), `@export_flags` (bitmask), `@export_file`/`@export_dir` (pickers), `@export_multiline`, `@export_placeholder`, `@export_exp_easing`, `@export_node_path("Button")`, `@export_category`/`@export_group`. All 11 parsed correctly headless.
**Fire Babys:** designer-proof data entry — Jeff can balance weapons/quests/accessories with sliders and dropdowns, never reading code.

---

## 9. Web Export & Performance

### Export preset options ✅ verified by real headless export
This exact preset exported successfully headless in 7.3s:
```ini
variant/thread_support=false          # selects web_nothreads_release.zip
variant/extensions_support=false
vram_texture_compression/for_desktop=true
vram_texture_compression/for_mobile=false
html/canvas_resize_policy=2           # "Project" — canvas follows project size
html/focus_canvas_on_start=true
progressive_web_app/enabled=false     # true adds service worker + offline_page
```
**nothreads + Compatibility:** no `SharedArrayBuffer` → no cross-origin isolation headers → runs on any static host. Trade-offs: no worker-thread asset loading (`load_threaded_request` stalls — known Godot issue #109914), higher audio latency.
**Fire Babys:** current setup already matches the recommended config. PWA enable + `offline_page` = cheap future win for offline play.

### Export size diet ✅ measured
Near-empty project export: `index.wasm` = **38 MB** (nothreads engine — the floor, unavoidable), `index.js` = 280 KB, `index.pck` = **4.0 KB**. The ~40 MB download is essentially all engine. Diet levers: fewer/lighter textures (VRAM compression `for_desktop=true`), font subsets, `.ogg`/`qoa` music, short SFX, `exclude_filter`, icon atlases. Gzip/Brotli on the host cuts wasm ~30–40% over the wire (Cloudflare does this automatically).
**Fire Babys:** monitor `.pck` growth as content is added; the wasm floor won't change.

### Performance tooling ✅
`Performance.get_monitor(Performance.TIME_FPS / RENDER_TOTAL_DRAW_CALLS_IN_FRAME / RENDER_VIDEO_MEM_USED / PHYSICS_3D_ACTIVE_OBJECTS / NAVIGATION_3D_AGENT_COUNT…)`; per-viewport `RenderingServer.viewport_get_render_info()`. Custom monitors via `Performance.add_custom_monitor()`. (Corrections: only `get_monitor()` exists — no `get_monitor_names()`; `NAVIGATION_3D_AGENT_COUNT`, not "ACTIVE_AGENTS".)
**Fire Babys:** hidden debug HUD (`?debug=1`) showing FPS + draw calls + video mem to catch perf regressions on the 3D world page.

### Physics tick vs render frame
`_physics_process` at fixed 60 tps; `_process` per rendered frame (browser rAF). Nothreads web: when rAF throttles (background tab, slow device), physics slows too — deterministic, but wall-clock stretches. Enable **Physics Interpolation** (Project Settings → Physics → Common) so movement looks smooth when frame rate ≠ tick rate — costs almost nothing on Compatibility.
**Fire Babys:** movement/attack logic in `_physics_process`; visual juice in `_process`; turn physics interpolation ON for the 3D world.

---

## 10. VFX & Particles

### GPUParticles3D + ParticleProcessMaterial ✅
Emission shape/direction/spread, velocity, gravity, damping, scale, turbulence, color; node: amount, lifetime, explosiveness, randomness, preprocess, draw passes. Verified fire/ember example headless (enums `EMISSION_SHAPE_SPHERE=1` matched).
```gdscript
mat.gravity = Vector3(0, -1.5, 0)   # negative Y gravity = embers rise
mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
mat.turbulence_enabled = true
parts.preprocess = 1.6      # pre-simulate so burst looks "already going"
parts.local_coords = false  # trail behind when emitter moves
# Sub-emitter: a GPUParticles3D child with emitting=false triggers per-particle
parts.add_child(smoke)      # SubEmitter class does NOT exist in 4.7.2
```
**Fire Babys:** campfire embers, volcano smoke (fire sub-emitter + smoke child), POOF steam bursts.

### CPUParticles3D fallback ✅
Same feature set, CPU-simulated; emission shapes incl. ring/box. Costs main-thread time — rule: GPU for visuals, CPU only for <50 particles needing exact CPU-side behavior.
**Fire Babys:** tiny deterministic counts (exactly 8 sparks on level-complete); GPU for all ambient fire.

### Custom spatial shader — fire/heat-haze (syntax reviewed, compile unchecked)
Vertex wobble (flame licking) + fresnel emission fragment. Headless dummy renderer stores shaders but can't compile them — treat as "syntax reviewed" until eyeballed in a browser. Use `unshaded` + `EMISSION` — cheapest glow on Compatibility, no bloom needed. Avoid `SCREEN_TEXTURE` reads on GLES3.
**Fire Babys:** Ruko's living-fire body shader, lava surface, heat shimmer on volcano smoke.

### RibbonTrailMesh ✅ (`Trail3D` does NOT exist)
Extrudes a ribbon along a target's movement. No `color` property / no `SHAPE_STRIP` — use `SHAPE_FLAT`/`SHAPE_CROSS` + `curve` (CurveXYZTexture) for fade. `SHAPE_CROSS` reads better from all camera angles.
**Fire Babys:** fireball projectile trails, Ruko dash trail, ember attack streaks.

### Decal ✅ (Compatibility-safe, low counts)
Projects texture (albedo/normal/emission) onto nearby geometry — scorch marks, glowing cracks, footprints. No `fade_step` — real props are `upper_fade`/`lower_fade`/`normal_fade`. Overdraw per decal — keep counts low, free them when faded.
**Fire Babys:** scorch marks where fireballs land, glowing lava cracks, "safe zone" ring decals for fire-safety lessons.

---

## 11. Navigation

### NavigationRegion3D + runtime navmesh baking ✅ verified in project loop
`NavigationMeshGenerator.parse_source_geometry_data()` + `bake_from_source_geometry_data()` build the mesh **at runtime** — explicitly supported in export templates (unlike editor-only `bake()`). Verified: 19 polygons baked in ~3–5 ms over 20×20 with a 2×2×2 obstacle that carved a hole. Gotchas: root node must be in-tree (defer past first frame); `parse_source_geometry_data` returns `void`, not bool.
**Fire Babys:** skeleton AI pathfinding around volcano rocks/kingdom walls; bake at level load so designers can move obstacles freely.

### NavigationAgent3D ✅ verified steering
Parent under the mover; set `target_position`; per physics frame steer toward `get_next_path_position()` and feed safe velocity back via `set_velocity()` (enables RVO avoidance). Verified: mover routed *around* a 2×2 obstacle. Quirk: `get_current_navigation_path()` may return empty while steering works — the agent computes paths asynchronously; rely on `get_next_path_position()`.
**Fire Babys:** the skeleton AI — chase/flee/patrol steering in the 3D arena and around the volcano.

### NavigationObstacle3D + avoidance layers ✅
RVO avoidance for dynamic blockers — entities steer around each other without navmesh rebakes. `avoidance_layers`/`avoidance_mask` control who avoids whom; `affect_navigation_mesh = false` for dynamic-only.
**Fire Babys:** skeletons avoid each other and the player in arena combat; rolling lava boulders as dynamic obstacles.

### NavigationServer3D ✅
Direct singleton (no `get_singleton()`). `map_create()`, `region_create()`, `map_get_path()` for direct queries (returned 5 waypoints routing around an obstacle headless). No `map_set_agent_height/radius`, no `agent_set_target_position`, no `agent_is_target_reachable` — those are node-level concepts.
**Fire Babys:** pre-compute patrol routes; validate every collectible is reachable at bake time.

### NavigationLink3D ✅
Connects disconnected navmesh areas — jump pads, teleporters, ladders, crater drops. Agents path *through* the link; auto-registers on the world nav map.
**Fire Babys:** volcano crater drop-in (Underworld Kingdom entrance), jump pads between floating ember platforms.

---

## Appendix A. 4.7.2 API corrections log
(First-draft guesses the binary proved wrong — always trust the binary over docs memory.)
- `AnimationPlayer.add_animation()` does NOT exist → `AnimationLibrary` + `add_animation_library("", lib)`; track paths resolve relative to the player's **parent**.
- `ParallaxBackground.scroll_begin()` does NOT exist → use `scroll_offset`.
- Stretch API is `content_scale_mode` / `content_scale_aspect`, NOT `stretch_mode`.
- `ThemeDB.fallback_theme` does NOT exist → `get_default_theme()` / `get_project_theme()`; theme reads need explicit theme_type.
- `RichTextLabel.get_parsed_text()` returns only the first paragraph.
- `Performance`: only `get_monitor()` (no `get_monitor_names()`); `NAVIGATION_3D_AGENT_COUNT` (no "ACTIVE").
- `RenderingServer.viewport_get_render_info()` with `VIEWPORT_RENDER_INFO_*` (no `get_render_info()`).
- `Trail3D`, `SubEmitter`, `HLODInstance3D`, `LODGroup3D` do NOT exist → `RibbonTrailMesh`, child `GPUParticles3D`, import-time LOD.
- `RibbonTrailMesh` has no `color` / `SHAPE_STRIP` → `SHAPE_FLAT`/`SHAPE_CROSS` + `curve`.
- `Decal` has no `fade_step` → `upper_fade`/`lower_fade`; `ReflectionProbe` uses `size`, not `box_size`.
- No `SDFGI` node class → `Environment.sdfgi_enabled`; DOF lives on `CameraAttributesPractical`, not Environment.
- `MultiplayerSynchronizer.set_replication_interval()` takes **seconds**, despite the bind param being named "milliseconds".
- `NavigationServer3D` called directly (no `get_singleton()`); no `map_set_agent_height`, `agent_set_target_position`, `agent_is_target_reachable`.
- `NavigationAgent3D` extends `Node` (no position) — parent it under the mover.
- `AudioStreamWAV.loop_end` must be set explicitly (default 0 ends stream); `AudioEffectEQ` → `set_band_gain_db(idx, db)`; `AudioEffectPitchShift.fft_size` takes an enum index.
- `@rpc` arg order `(mode, sync, transfer_mode, channel)`; `"authority"` mode is enforced on callers.
- `SkeletonIK3D`: `interpolation` deprecated → `influence`; must be child of Skeleton3D.
- `SpringBoneSimulator3D`: `set_setting_count(1)` before indexed setting setters.
- SceneTree `get_multiplayer()` is methods on SceneTree, property on Node.

## Appendix B. Headless verification methodology (for future researchers)
- Bare `--script` runs: fine for node/API property verification. **Does NOT** integrate RigidBody2D/3D dynamics, `move_and_slide` collision, or deferred skeleton modifiers → use `--headless --path proj <scene>.tscn` real-project runs for those.
- `--headless` forces the root Window to 64×64 → layout tests run inside a fixed-size `SubViewport` (720×1280, `UPDATE_DISABLED`).
- Dummy renderer stores shaders without compiling them → shader syntax is "reviewed, compile unchecked" until a real renderer runs it.
- MultiMesh `set_instance_transform` and `get_parsed_text()`-style server/state round-trips need a real renderer to verify visually.
- Ragdoll skeleton-mirroring, spring-bone simulation, and continuous-mode IK modifiers did not manifest headless (deferred skeleton-update limitation) → worth one in-editor visual pass before shipping.
- UDp is blocked in this sandbox (TCP works) → ENetMultiplayerPeer was API-verified only; the identical MultiplayerAPI machinery was verified end-to-end over WebSocket.

## Appendix C. Research sources
- Binary: `/home/hatch/workspace/godot/Godot_v4.7.2-stable_linux.x86_64` (`4.7.2.stable.official.ed1daf0bf`)
- Scratch work: `/tmp/godot-study-2d/`, `/tmp/godot-study-3drender/`, `/tmp/godot-study-3dgameplay/`, `/tmp/godot-study-audio/`, `/tmp/godot-study-xrnet/`, `/tmp/godot-study-uigdscript/`, `/tmp/godot-study-webvfx/`
- Docs cross-checks: docs.godotengine.org (renderers table, multiple-resolutions, class docs); Godot GitHub issue #109914 (threaded loading on nothreads web).
- Godot 4.7.2 source (multiplayer_synchronizer.cpp, skeleton_3d.cpp) where behavior needed grounding beyond the API.
