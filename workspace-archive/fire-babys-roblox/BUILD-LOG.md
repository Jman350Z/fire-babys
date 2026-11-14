# BUILD LOG — 🌊 SPLASH (Fire Babys) Roblox Experience

**Built:** 2026-10-05
**Status:** Complete — 8 Luau scripts, all syntax-checked, file delivery only.
Nothing has been uploaded to Roblox.

## What was built

A complete, server-authoritative Roblox experience for the SPLASH game mode:

| # | File | Kind → Location | Job |
|---|---|---|---|
| 1 | `SPLASHGame.module.lua` | ModuleScript → ServerScriptService | Shared brain: teams, round state, RemoteEvents, HUD broadcasts, eliminate logic |
| 2 | `GameManager.server.lua` | Script → ServerScriptService | Round loop (Lobby → Intermission → Playing → Round End), team-balanced spawning, win detection, grab input routing |
| 3 | `GrabService.module.lua` | ModuleScript → ServerScriptService | Server-validated grab/carry/release; E toggles carry→playful toss |
| 4 | `PoolManager.server.lua` | Script → ServerScriptService | Dunk detection (carrier's pool dunks rivals; enemy pool catches fallers) + splash FX |
| 5 | `ArenaBuilder.server.lua` | Script → ServerScriptService | Builds the ENTIRE arena in code: floor, team zones, 2 pools, spawns, spectator sky-pad, walls, sign, glow pillars |
| 6 | `FireBabyAppearance.server.lua` | Script → ServerScriptService | Every player becomes a Fire Baby: flame colors, aura particles, cozy glow, bouncy movement |
| 7 | `GrabController.client.lua` | LocalScript → StarterPlayerScripts | E key on PC + GRAB! touch button on mobile |
| 8 | `SPLASHGui.client.lua` | LocalScript → StarterPlayerScripts | Loading screen w/ rotating fire-safety tips, HUD (alive counts, timer, round wins), banners, grab status |

**Verification:** all 8 files compile clean (Lua 5.x parse check with Luau `+=`
normalized). Cross-references checked: every `WaitForChild`/`require` target
exists; every RemoteEvent referenced is created by `SPLASHGame`.

**Design decisions:**
- Server-authoritative: clients only send "I pressed grab" — the server validates
  distance, teams, cooldowns, and round state. Exploit-resistant by construction.
- Zero manual building: arena + UI are 100% code-built. The person with Studio
  pastes 8 scripts and presses Play.
- Kid-safe: dunked players get a cartoon splash + spectator view. No damage,
  no death messages, no scary content.
- Brand line `the future is BLAZING FOR FIRE BABYS 🔥` fires at every match end.
- Loading screen rotates 7 real USFA/NFPA fire-safety tips.

## EXACT STEPS for the person with Roblox Studio (Windows/Mac)

### A. Load the project (10 min)
1. Open **Roblox Studio** and sign in as **FireBabysGame**.
2. **New → Baseplate.**
3. In the Explorer panel:
   - Right-click **ServerScriptService** → Insert Object → **ModuleScript**.
     Rename it `SPLASHGame`. Double-click, delete contents, paste in
     `src/ServerScriptService/SPLASHGame.module.lua`.
   - Repeat for `GrabService` (ModuleScript).
   - Insert → **Script**, rename `GameManager`, paste `GameManager.server.lua`.
   - Insert → **Script**, rename `PoolManager`, paste `PoolManager.server.lua`.
   - Insert → **Script**, rename `ArenaBuilder`, paste `ArenaBuilder.server.lua`.
   - Insert → **Script**, rename `FireBabyAppearance`, paste `FireBabyAppearance.server.lua`.
   - Expand **StarterPlayer → StarterPlayerScripts**. Right-click it →
     Insert Object → **LocalScript**, rename `GrabController`, paste
     `src/StarterPlayerScripts/GrabController.client.lua`.
   - Another **LocalScript**, rename `SPLASHGui`, paste `SPLASHGui.client.lua`.
4. **Names must match exactly** — scripts find each other by name.

### B. Test it (5 min)
1. Press **Play** (F5). The arena builds itself. You spawn as a Fire Baby 🔥.
   Walk around, check the loading screen tips and HUD.
2. **Multiplayer test (important — grabbing needs 2 players):**
   Test tab → **Clients and Servers** → set Players to **2** → **Start**.
   - In one window, walk up to the other player and press **E**.
   - Carry them to YOUR team's pool → 💦 they're splashed out.
   - Check the HUD counts drop and the round ends when a team is wiped.
3. If anything looks wrong, check **View → Output** for `[SPLASH]`/`[PoolManager]`
   log lines and fix before publishing.

### C. Publish as PRIVATE first (5 min)
1. **File → Publish to Roblox As…** → **Create new experience**.
2. Name: `🌊 SPLASH (Fire Babys)`
3. Description: `Grab your rivals and dunk them in your pool! Last team standing wins. A kid-safe Fire Babys game that teaches real fire safety. 🔥`
4. Set visibility to **Private**.
5. On the Creator Dashboard for the experience:
   - **Audience → Age guidelines:** set appropriate for ages 5+ (complete the
     age questionnaire honestly).
   - **Permissions → Collaborators:** add Jeff's team as needed.
   - **Settings → Max players:** 20 (12 minimum for good matches).
   - **Communication:** keep chat filtered; consider disabling voice.
6. Play it live once from the Roblox app as a final check.

### D. Go public (when Jeff says so)
1. Creator Dashboard → experience → **Audience → Public**.
2. Complete the **content questionnaire** (Roblox requires it before public).
3. Share the link everywhere — it's go time. 🔥

## Notes / known placeholders
- **Sound IDs** in `GrabService.module.lua` (`GrabService.Sounds`) are stock
  Roblox sounds. Swap in final Fire Babys SFX any time — one table, two lines.
- **Fire Baby look** is colors + flame aura + glow (no custom mesh yet). When the
  official teardrop mesh is ready, apply it in `FireBabyAppearance.server.lua`.
- **Account requirements:** publishing a public experience needs the
  FireBabysGame account to meet Roblox's age/verification requirements
  (account age, 2FA, possibly ID verification) — that's done in the browser on
  roblox.com, not in Studio.
- **Do NOT upload any other game builds** to launcher sites — Jeff's rule.
  SPLASH is the flagship and only promoted game.
