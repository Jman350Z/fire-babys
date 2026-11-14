# Fire Babys Shows — 3D Overhaul Plan

**Written:** 2026-10-12, per Jeff's directive the same day: the show is rebuilt in 3D, the 2D direction is rejected, and the 2D Episode 1 is shelved (not posted).
**Scope of this document:** inventory + production plan only. No episode has been produced under this plan, nothing has been posted, and no money has been spent (free tools only).

**Show rules (unchanged, they carry into 3D):**
- ~40-second episodes, vertical 9:16.
- Gibberish and funny sounds only — no real words.
- Every episode opens with a changing Simpsons-style couch gag.
- Fire + Water Babys play together, compete, and have dinner together — real little stories, clip comedy.
- Characters are GOLD: lovable, never harmed, burned, destroyed, or made the cruelty joke.
- Jeff sees and approves the full video before anything posts.
- Approved roster — Fire: Blaze, Ruko, Boulder, Sizzle, Cinder, Lord Inferno. Water: Aqua, Splash, Pebble, Drift, Bubble, Lord Tidal.
- Character fidelity is mandatory: match Jeff's approved designs, no off-design reinventions.

---

## A. Asset inventory — honest state of everything

### A1. The 2D show (shelved, kept as reference + reusable parts)

Location: `~/workspace/fire-babys-shows/`

| Item | State |
|---|---|
| Episode 1, `episodes/ep01/fire-babys-ep01-cartoon.mp4` | Finished 2D cartoon, 39.6s, 720×1280, H.264 + AAC. **Shelved by Jeff's 2026-10-12 directive — do not post.** Plus Melon Mayhem v1/v2 cuts, silent versions, and raw AI-generated clips in the same folder. |
| 2D build tools | `tools/ep01_cartoon.py` (PIL pose-swap animation + squash & stretch), `ep01_build.py`, audio shell scripts. 2D-only; the *timing/story lessons* carry over, the code doesn't. |
| Intro | `intro/intro-master.mp4` (10s), one couch-gag variant (`intro-gag-ep01-dominoes.mp4`), title/preview cuts, raw AI clips. 2D — the couch-gag *concept* carries over, the footage doesn't. |
| Characters (2D) | All 12 roster characters: master PNG each, background cutouts, 12 six-pose sheets, and **72 cut sprites** (laugh / shocked / dizzy / sleepy / run / happy per character) under `characters/`. These are the approved designs — in 3D they serve as the **fidelity reference**, not as animation assets. |
| Props / backgrounds (2D) | Melon + bush props; one AI-generated 2D cartoon background. Not usable in 3D. |
| Audio (REUSABLE in 3D) | Gibberish voice clips: `assets/audio/g-ruko.mp3`, `g-giggle.mp3`, `g-cinder.mp3`. SFX: `assets/audio/sfx/boing.wav`, `whoosh.wav`, `burp.wav`. Small library — enough for a proof, will need growing for a series. |
| Channel kit | `channel-kit/CHANNEL-KIT.md` — YouTube/TikTok names, handles, posting rules, profile art (`profile-blaze.png`). Still valid. (Note: the kit text says ~31s episodes; Jeff's standing rule is ~40s — follow ~40s.) |
| Locked art reference | `~/workspace/fire-babys-art/reference/character-lineup-poster.webp` + `west-ember-high-crowd.webp` — the canonical look every 3D character must be judged against, alongside the approved sheets above. |

### A2. 3D assets — the blunt truth

**There are ZERO standalone 3D model files in the entire workspace.** No `.glb`, `.gltf`, `.fbx`, `.obj`, or `.blend` files exist anywhere. Blender is not installed. Every "3D" Fire Baby that exists is **procedural code** (primitives + shaders), in two separate codebases:

**1. Godot 4 project — `~/workspace/fire-babys-godot/`** (the strongest asset we have)
- Engine: Godot 4.7.2 stable, binary at `~/workspace/godot/`, verified running headless; `xvfb-run` available; project configured for 720×1280 portrait.
- `characters/fire_baby.gd` — ONE hero Fire Baby built entirely in code: spherical living-flame body with an animated flame shader, face, stubby capsule arms/legs, flame tendrils, and built-in procedural life (bob, sway, blink, tendril dance, happy wave while "performing"). With its gold cone crown this is effectively **Blaze**. It is the only distinct 3D character design that exists.
- `characters/stock_body.gd` — a generic base body (matte-vinyl gradient sphere, stubby limbs, molded face, optional flame shell), written to be the base every character is built from. **No per-character variants were ever built from it** — no Ruko headband, no Boulder rock plates, no Sizzle bow, nothing.
- `characters/fireball.gd` — a simpler fireball variant with gradient particles.
- **No Water Baby exists in 3D at all.** Aqua, Splash, Pebble, Drift, Bubble, Lord Tidal have no 3D form — not a model, not a code variant, nothing. (The word "Splash" in the Godot code is a swimming-pool gag and a weapon class, not the character.)
- Of the 12-character roster, **11 have no 3D version**: only the Blaze-type fire baby exists.
- Environments (all code-built in `world/open_world.gd`, ~730 lines): an outdoor open-world game map — central volcano with smoke FX (Inferno's Volcano), Ember Village with a golden castle, Cinder Castle / Obsidian Peaks, Crystal Flare, Scorch Arena, an industrial foundry — plus a catch-game arena (`world/catch/CatchArena.tscn`) with a MultiMesh crowd of gumdrop fans.
- **No show sets exist**: no living room (the couch-gag set), no dinner table set, no interiors of any kind. The world is a game map, not dressed cartoon sets.
- **Render/capture pipeline — PROVEN and reusable:** `capture.gd` + showcase scripts (`showcase.gd`, `fire_showcase.gd`, `stock_showcase.gd`, `world_showcase.gd`) render model-sheet stills (front + three-quarter) and short clips headlessly under `xvfb-run`. Proof is sitting in `~/workspace/fire-babys-memories/godot-build/`: Blaze front/three-quarter stills, showcase clips, world-orbit clip, catch-arena shots (Oct 3–4, 2026).
- How the 3D character actually looks (from those renders, judged honestly): glossy yellow-to-orange gradient sphere body, big white oval eyes with black pupils, a mouth strung from small dark-red spheres, stubby capsule arms/legs, flat disc feet; Blaze wears a gold cone crown. Plushie-cute and on-brief (round flame body, no beaks/wings/feathers) — **but simpler than the approved 2D designs**: no angry-V brows, no character-specific accessories beyond Blaze's crown, and the bead-string mouth reads strange up close. There is a real fidelity gap Jeff must judge with his own eyes.

**2. Web 3D game — `~/workspace/fire-babys-3d-rebuild/`** (live at firebabys.io/3d.html)
- Three.js, single-file builds (`3d.html` ~1MB). Characters are also code-built primitives (`makeBaby` / `makeVillain`, sphere/capsule/cylinder geometry); named fire characters are referenced in code, and biome names (Ember Village, Greaseworks, Volt Town, Slagheap, Smokestack City, West Ember) appear.
- It is a **playable game, not an animation tool**: no director camera, no timeline/keyframing, no video export. Using it for episodes means screen-recording gameplay.
- It is a LIVE product — touching its code for show production risks breaking the game (pre-deploy checks and deploy discipline apply).

**3. Everything else**
- `~/workspace/fire-babys-assets/` — 2D key art and avatar images only. Nothing 3D.
- ffmpeg 8.1.2 installed (compositing/audio/finishing). Python 3 + PIL installed.

---

## B. Production pipeline options for 40s 3D episodes

### Option 1 — Stage and render in the existing Godot 4 project (code-built characters, cinematic scenes)
Build a small "show stage" inside the Godot project: extend the stock body into a character factory (body shader colors + accessory kits per character, plus a brand-new water body — droplet shape, blue palette, splash tendrils), build 2–3 simple sets from primitives (couch-gag living room, dinner table, one outdoor biome corner reusing open-world pieces), animate with the characters' existing procedural life plus scripted/tweened actions and fixed cinematic cameras, render headless through the proven xvfb capture rig, finish with ffmpeg (gibberish audio, SFX, title/end cards).
- **Pros:** Free; engine, characters' base code, world pieces, and a *working headless render pipeline* already exist on this machine — it's the only route that has already produced Fire Babys 3D stills and clips. One code base generates the whole roster, so characters stay consistent with each other. Total control of camera, timing, and gags — real cartoon staging, not gameplay. Zero risk to the live web game. Every episode reuses the rig, so episodes get faster and cheaper after the first.
- **Cons:** The biggest upfront build of the three *practical* options: character factory + water body + sets must exist before Episode 1. Procedural/code animation takes iteration to hit snappy Angry Birds-style timing (the pipeline is proven for turntables and showcases, not yet for acted comedy). Render look is stylized-plush, not high-end CGI.
- **Effort:** Character factory + first two characters: the main lift (days of build-and-review iterations). Sets: small (primitives, hours each). Per episode after the rig exists: a day-scale job, shrinking as the action library grows.

### Option 2 — Capture inside the live web 3D game (Three.js build)
Add scripted behaviors or drive the game while screen-capturing with headless Chromium + ffmpeg.
- **Pros:** The world, named characters, and biomes already exist in a build Jeff has seen live; no new engine work.
- **Cons:** It's a game, not a stage: characters are driven by game logic/physics, so hitting a precise 40-second story with a specific gag at second 12 is fighting the tool. No timeline, no keyframes, no director camera. Capture framerate/quality varies. Worst: modifying the live game for show needs risks the product Jeff's players use. Weakest control for the highest collateral risk.
- **Effort:** Deceptively high — every retake is a wrestling match, and retakes are the whole job in comedy.

### Option 3 — Model and rig real 3D characters (Blender route)
Model the 12 characters properly in Blender from the approved 2D sheets, rig them, animate and render in Blender (or import into Godot).
- **Pros:** Highest fidelity and animation ceiling; true cartoon squash-and-stretch; assets reusable forever, including for the games.
- **Cons:** Blender isn't installed and there is no modeling track record on this team — 12 original rigged characters is a **weeks-scale** first step before a single frame of Episode 1, with the highest skill risk of the three. Massive overkill to prove a 40-second gibberish format.
- **Effort:** Weeks before a proof exists. Jeff would have nothing to approve for a long time.

---

## C. Recommendation

**Option 1 — build the show inside the existing Godot 4 project.**

It's the only route with a render pipeline already proven on this exact machine (the Oct 3–4 showcases), it costs nothing, it never touches the live web game, and because the characters are generated from one code base, the roster stays mutually consistent and every future episode reuses the same rig. Option 2 trades away all directorial control and risks a live product; Option 3 delays any proof by weeks. Godot's real cost — building the characters and sets first — is unavoidable in every option; Godot just makes it the cheapest version of that cost, with a proof possible in days rather than weeks.

Sequencing: (1) character proof for Jeff's approval → (2) character factory for the full roster + the three starter sets → (3) Episode 1 in 3D → (4) series rhythm.

---

## D. First milestone — the 3D character proof (Jeff approves before anything else is built)

**"3D Character Proof #1"** — deliberately small, made with the existing Godot showcase rig:

1. **Two characters only:** Blaze (polish the existing fire baby) and **Aqua — a brand-new water body** built as the fire baby's counterpart (droplet sphere, blue gradient shader, splash tendrils). Fire + Water together is the show's core pairing, and Aqua proves the water line can exist at all.
2. **Model-sheet stills:** front + three-quarter renders of both, presented **side-by-side with their approved 2D sheets** so Jeff can judge fidelity directly — same characters or not.
3. **One 5–8 second test clip:** a mini couch-gag — both characters race for the couch, Aqua splashes into her seat, Blaze does the happy wave — finished with existing gibberish audio + SFX. Proves motion, timing, and the gag format in 3D.
4. **Jeff's gate:** he approves the look and the motion, asks for changes, or kills it — *before* the other 10 characters, the sets, or any full episode get built. Nothing posts anywhere; this proof is for his eyes only.

**Hard blocker, stated plainly:** no 3D character models exist — no files, and only one fire character design in code. The Water Babys have no 3D form whatsoever and 11 of 12 characters have no 3D variant. Character building is unavoidably step 1; the only thing animatable today is the single Blaze-type fire baby. The proof above is scoped to exactly that reality.
