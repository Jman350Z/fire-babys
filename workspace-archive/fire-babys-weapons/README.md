# Fire Babys — Weapons HQ

Independent home for everything weapons. Any weapon code, data, art, or
balance work starts here. The 3D arena pulls from this roster.

## Files

- `weapons.json` — the official weapon roster (Jeff's design, 2026-10-03).
  Source of truth. Do not change stats without Jeff's word.
- `codes/` — weapon system code modules live here (armory UI, combat
  wiring, unlock logic, effects). Drop new weapon code here first, then
  integrate into the game builds.

## Roster

| # | Weapon | Class | Mult | Element | Effect | Unlock |
|---|--------|-------|------|---------|--------|--------|
| 1 | High-Pressure Magma Hose | Blaze | 2.5x | Plasma Fire | AoE Splash | Starter (default) |
| 2 | Soot-Crusher Power Fists | Ruko | 2.2x | Kinetic Impact | Armor-Piercing Slam | Full bronze set |
| 3 | Spitfire Precision Bow | Sizzle | 2.0x | Ignition Arrow | Long-Range Pierce | Season 1 tier 8 |
| 4 | Blue-Tip Spark Grenade | Cinder | 2.4x | Wild Chaos | Multi-Split Explosion | Season 1 tier 16 |
| 5 | Magma Core Anvil | Boulder | 3.0x | Earth-Magma | Vertical Crush | Silver armor (250 tasks) |
| 6 | Underworld Doom Rod | Lord Inferno | 3.5x | Dark Slag | Boss Terrain Scorcher | Season 1 tier 20 |

## Rules (Jeff's locks)

- Multipliers are Jeff's design — implement as given.
- Weapon damage stacks multiplicatively with armor/season boosts.
- All-ages, fire-safety centered. No beaks/wings/feathers, nothing like
  Angry Birds, no realistic humans.
- Classes (Blaze, Ruko, Boulder, Sizzle, Cinder, Lord Inferno) are the
  weapon attunements — future playable characters.

## Integration points

- 3D arena: `~/workspace/fire-babys-3d-rebuild/3d-multiplayer.html`
  (armory UI, combat wiring, Vault weapons section, season grants)
- Godot open world: `~/workspace/fire-babys-godot/world/progression.gd`
  (profile sync, season XP, weapon unlocks/equip) +
  `~/workspace/fire-babys-godot/world/progression_ui.gd`
  (Vault/Season/Armory panels). Export: `export-world.sh`.
- Worker profile sync: `~/workspace/fire-babys-auth/worker/src/index.js`
  (`/profile/weapons` endpoint; `/profile/season` for XP/claims)
- Data copy: `~/workspace/fire-babys-3d-rebuild/data/weapons.json`
  (keep in sync with this folder's `weapons.json`)
