# 🌊 SPLASH (Fire Babys) — Roblox Experience

The flagship Fire Babys game mode, rebuilt for Roblox. Two teams of cute little
Fire Babys, two pools, one rule: **grab your rivals and dunk them in YOUR pool.
Last team standing wins.**

Kid-safe (ages 5–12). Fall Guys energy — slapstick, bouncy, silly. Nobody gets
hurt; they just get SPLASHED. 💦

## How the game works

1. **Join** → you're auto-assigned to 🔵 Blue Splash or 🔴 Red Splash (balanced).
2. **Intermission (15s)** → get ready at your team spawn.
3. **Round (3:00)** → run around, press **E** (or tap **GRAB!** on mobile) near a
   rival to hoist them onto your shoulders. Carry them to YOUR team's pool and
   dunk them — they're splashed out of the round. Watch out: fall into the
   ENEMY pool yourself and you're out too!
4. **Round end** → the team with players still standing wins. Then:
   `the future is BLAZING FOR FIRE BABYS 🔥`

While the game loads, players see rotating **real fire-safety tips**
(Get low and go! Get out, stay out! Call 911 from outside! …).

## Project structure

```
fire-babys-roblox/
├── README.md                      ← you are here
├── BUILD-LOG.md                   ← what was built + publish steps
└── src/
    ├── ServerScriptService/
    │   ├── SPLASHGame.module.lua      shared state: teams, rounds, remotes, HUD
    │   ├── GameManager.server.lua     round loop, spawning, win detection
    │   ├── GrabService.module.lua     server-validated grab & carry logic
    │   ├── PoolManager.server.lua     dunk detection + splash effects
    │   ├── ArenaBuilder.server.lua    builds the WHOLE arena in code
    │   └── FireBabyAppearance.server.lua  cute Fire Baby look for every player
    └── StarterPlayerScripts/
        ├── GrabController.client.lua  E key / mobile GRAB! button
        └── SPLASHGui.client.lua       loading screen, HUD, banners (all in code)
```

**Zero manual building required.** The arena, the UI, the teams, the RemoteEvents
— everything is created by the scripts. You only place 8 scripts.

## Where each script goes in Roblox Studio

| File | Place in |
|---|---|
| `SPLASHGame.module.lua` | ServerScriptService (as a **ModuleScript** named `SPLASHGame`) |
| `GrabService.module.lua` | ServerScriptService (as a **ModuleScript** named `GrabService`) |
| `GameManager.server.lua` | ServerScriptService (as a **Script** named `GameManager`) |
| `PoolManager.server.lua` | ServerScriptService (as a **Script** named `PoolManager`) |
| `ArenaBuilder.server.lua` | ServerScriptService (as a **Script** named `ArenaBuilder`) |
| `FireBabyAppearance.server.lua` | ServerScriptService (as a **Script** named `FireBabyAppearance`) |
| `GrabController.client.lua` | StarterPlayer → StarterPlayerScripts (as a **LocalScript**) |
| `SPLASHGui.client.lua` | StarterPlayer → StarterPlayerScripts (as a **LocalScript**) |

> File extensions (`.server.lua`, `.client.lua`, `.module.lua`) are just labels so
> you know what kind of Roblox script each file becomes. The **names must match**
> exactly (`SPLASHGame`, `GrabService`, …) because scripts find each other with
> `WaitForChild("SPLASHGame")`.

## Quick test in Studio

1. Open Roblox Studio → **New → Baseplate**.
2. Add the 8 scripts per the table above (right-click the service → Insert Object
   → Script / LocalScript / ModuleScript → paste the file contents).
3. Press **Play** (F5). The arena builds itself; you spawn as a Fire Baby.
4. Press **Play with 2+ players**: Test tab → Clients and Servers → 2 Players →
   Start. Grab with **E**, dunk your rival in your pool. 💦

## Tuning (all in `SPLASHGame.module.lua` → `SPLASHGame.Config`)

| Setting | Default | What it does |
|---|---|---|
| `IntermissionTime` | 15 | Get-ready seconds before a round |
| `RoundTime` | 180 | Round length (3 minutes) |
| `GrabRange` | 10 | How close a rival must be to grab |
| `WalkSpeed` / `JumpPower` | 20 / 62 | Bouncy Fire Baby movement |
| `BrandLine` | … | Shown at every match end (do not remove) |

Sound IDs at the top of `GrabService.module.lua` are placeholders — swap in the
final Fire Babys SFX any time.

## Brand rules baked into the code

- Fire Babys are precious: dunked players are never harmed — they get a cartoon
  splash and watch from the spectator pad.
- No beaks, wings, feathers, realistic humans, or scary content anywhere.
- Every match end shows: `the future is BLAZING FOR FIRE BABYS 🔥`
- Loading screen teaches real USFA/NFPA fire-safety tips.

## Publishing checklist (for the person with Studio)

See **BUILD-LOG.md** for the exact click-by-click publish steps. Short version:
publish as **Private** first, name it `🌊 SPLASH (Fire Babys)`, set max players
(12–20 recommended), configure age/chat settings for kids, then flip to Public
when ready.
