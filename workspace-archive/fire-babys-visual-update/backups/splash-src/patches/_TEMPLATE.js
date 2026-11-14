/* =====================================================================
   PATCH 00X — <short-name>            <-- rename this file to 001-<short-name>.js etc.
   Date: <YYYY-MM-DD> | For: Jeff (Fire Babys)
   What it changes: <one plain sentence>
   Touches: <e.g. CFG.HERO_NOVA_CD, Game.spawnWave, UI.drawCastle>
   How to disable: set "enabled": false for this file in patches/manifest.json,
                   then run: python3 src/build.py
   Test: <how to verify it works in the game>
   ===================================================================== */
(function () {
  'use strict';

  // The whole baseline game is visible here as plain globals:
  //   CFG      - all tuning numbers (cooldowns, ranges, speeds...)
  //   Game     - game state + logic (Game.stage, Game.toDeploy(), ...)
  //   UI       - drawing + HUD (UI.syncNova(), ...)
  //   SaveSys  - saves (SaveSys.data, SaveSys.save())
  //
  // RULES:
  //  1. Never redeclare CFG/Game/UI/SaveSys — just use them.
  //  2. To change a number:   CFG.HERO_NOVA_CD = 8;
  //  3. To change behavior, wrap the original and call it:
  //       var origDeploy = Game.toDeploy;
  //       Game.toDeploy = function () { origDeploy(); /* your extra stuff */ };
  //  4. New globals must hang off window explicitly, e.g. window.MyThing = ...
  //  5. Keep it small and focused — one patch, one job.

  // ---- your update code goes here ----

})();
