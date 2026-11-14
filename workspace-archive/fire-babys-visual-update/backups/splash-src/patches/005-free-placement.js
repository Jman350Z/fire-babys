/* =====================================================================
   PATCH 005 — free-placement
   Date: 2026-09-30 | For: Jeff (Fire Babys)
   What it changes: deploying troops during the deploy phase is FREE.
   The starting-gold gate is gone — players can fill their whole field
   (all 12 grid tiles) with their team. Gold is still earned from kills
   and stage bonuses and shown as a score; nothing spends it right now.
   Touches: tryPlace (reassigned), UI.buildTroops / UI.refreshTroops (wrapped)
   How to disable: set "enabled": false for this file in patches/manifest.json,
                   then run: python3 src/build.py
   Test: start any stage — tap troops and fill all 12 tiles; no
   "Not enough gold!" hint, troop buttons show FREE and never dim.
   ===================================================================== */
(function () {
  'use strict';

  /* Placing a troop costs nothing — the only limit is the 12 grid tiles. */
  tryPlace = function (col, row) {
    if (Game.phase !== 'deploy' || !selTroop) return;
    if (tileOccupant(col, row) >= 0) {
      UI.hint('Tile is taken — drag babys to move or MERGE!');
      return;
    }
    deployed.push({ key: selTroop, tier: 0, col: col, row: row });
    AudioSys.place();
    buzz(12);
    var p = tileXY(col, row);
    burst(p.x, p.y, '#ffd76a', 8, 130, 0.4, 4, 200);
    UI.syncGold();
    UI.refreshTroops();
  };

  /* Troop bar: every troop shows FREE and never dims as "poor". */
  var origBuildTroops = UI.buildTroops;
  UI.buildTroops = function () {
    origBuildTroops();
    var costs = document.querySelectorAll('#troopBar .troop .cost');
    for (var i = 0; i < costs.length; i++) costs[i].textContent = 'FREE';
  };

  var origRefreshTroops = UI.refreshTroops;
  UI.refreshTroops = function () {
    origRefreshTroops();
    for (var i = 0; i < TROOP_KEYS.length; i++) {
      var b = document.getElementById('troop_' + TROOP_KEYS[i]);
      if (b) b.classList.remove('poor');
    }
  };

  /* Re-render the bar now in case the game already built it. */
  try {
    if (document.getElementById('troopBar')) UI.buildTroops();
  } catch (e) {}
})();
