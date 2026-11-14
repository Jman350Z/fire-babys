/* =====================================================================
   PATCH 017 — play-3d-button
   Date: 2026-10-02 | For: Jeff (Fire Babys)
   Directive: "Update the different games of the game" — 2D to 3D and
     all of the above. The 3D open-world game is live at 3d.html.
   What it changes:
     - HUD gets a 3D button (next to the trailer button): tap it and the
       game navigates to the 3D open-world version (3d.html, same site).
       Progress is kept — both games save to localStorage separately.
     - DOM-only change. No canvas, combat, balance, or baseline changes.
   Touches: DOM (#fb3dBtn in #hud). No game-logic function is wrapped
     or replaced.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: tap the 🎮 button — the 3D game loads.
   ===================================================================== */
(function(){
'use strict';

var FB3D = {};

FB3D.ensureDom = function(){
  if(typeof document === 'undefined') return false;
  var hud = document.getElementById('hud');
  if(!hud) return false;
  if(!document.getElementById('fb3dBtn')){
    var trailer = document.getElementById('trailerBtn');
    var btn = document.createElement('button');
    btn.id = 'fb3dBtn';
    btn.textContent = '🎮';
    btn.setAttribute('aria-label', 'play the Fire Babys 3D open world');
    btn.style.cssText = 'pointer-events:auto;background:rgba(12,6,4,.72);' +
      'border:1px solid rgba(255,150,60,.25);border-radius:10px;' +
      'font-size:20px;padding:6px 9px;margin-right:6px;cursor:pointer;';
    btn.addEventListener('click', function(){
      try{ if(window.AudioSys) AudioSys.ui(); }catch(e){}
      window.location.href = '3d.html';
    });
    if(trailer) hud.insertBefore(btn, trailer.nextSibling);
    else hud.appendChild(btn);
  }
  return true;
};

FB3D.ensureDom();

/* debug/test handle for the verifier harness */
if(typeof window !== 'undefined'){
  window.__FB3D_DEBUG = { button: function(){ return document.getElementById('fb3dBtn'); } };
}

})();
