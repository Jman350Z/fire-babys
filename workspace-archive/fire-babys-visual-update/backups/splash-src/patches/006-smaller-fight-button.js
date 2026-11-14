/* =====================================================================
   PATCH 006 — smaller-fight-button
   Date: 2026-09-30 | For: Jeff (Fire Babys)
   What it changes: the deploy-phase FIGHT button is much smaller so it
   no longer covers the bottom row of placement tiles. Same position
   (centered above the troop bar), still big enough to tap.
   Touches: #bigBtn CSS only (injected <style>, baseline untouched)
   How to disable: set "enabled": false for this file in patches/manifest.json,
                   then run: python3 src/build.py
   Test: start any stage — the FIGHT button sits clear of the grid and
   all 12 tiles are tappable; it still reads "FIGHT" and starts battle.
   ===================================================================== */
(function () {
  'use strict';

  var css = document.createElement('style');
  css.id = 'fb6css';
  css.textContent =
    '#bigBtn{' +
    'font-size:15px !important;' +
    'letter-spacing:2px !important;' +
    'padding:10px 26px !important;' +
    'border-radius:14px !important;' +
    '}';
  document.head.appendChild(css);
})();
