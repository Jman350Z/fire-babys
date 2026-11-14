/* =====================================================================
   PATCH 009 — trailer-button
   Date: 2026-10-01 | For: Jeff (Fire Babys)
   Directive: "start adding this video to a few areas.. on the website" —
     Jeff's 30s Fire Babys cinematic trailer.
   What it changes:
     - HUD gets a trailer button (next to the codex button): tap it and
       the cinematic plays in a fullscreen overlay, tap X to close.
     - The video lives next to the game as trailer.mp4 (repo root on
       firebabys.io; same folder as the demo file locally). The game
       file itself stays light — the video streams, it is NOT bundled.
     - DOM-only change. No canvas, combat, balance, or baseline changes.
   Touches: DOM (#trailerBtn in #hud, #trailerOv overlay). No game-logic
     function is wrapped or replaced.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
     (Also delete trailer.mp4 from the site root if you want it gone.)
   Test: tap the trailer button on the deploy screen — video plays.
   ===================================================================== */
(function(){
'use strict';

var TR = {};

TR.ensureDom = function(){
  if(typeof document === 'undefined') return false;
  var hud = document.getElementById('hud');
  if(!hud) return false;
  if(!TR.button && !document.getElementById('trailerBtn')){
    var mute = document.getElementById('muteBtn');
    var btn = document.createElement('button');
    btn.id = 'trailerBtn';
    btn.textContent = '🎬';
    btn.setAttribute('aria-label', 'watch the Fire Babys trailer');
    btn.style.cssText = 'pointer-events:auto;background:rgba(12,6,4,.72);' +
      'border:1px solid rgba(255,150,60,.25);border-radius:10px;' +
      'font-size:20px;padding:6px 9px;margin-right:6px;cursor:pointer;';
    btn.addEventListener('click', function(){
      TR.open();
      try{ if(window.AudioSys) AudioSys.ui(); }catch(e){}
    });
    if(mute) hud.insertBefore(btn, mute);
    else hud.appendChild(btn);
    TR.button = btn;
  }
  if(!TR.overlay && !document.getElementById('trailerOv')){
    var ov = document.createElement('div');
    ov.id = 'trailerOv';
    ov.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:30;' +
      'display:none;justify-content:center;align-items:center;' +
      'background:rgba(8,3,2,0.94);';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:92%;max-width:560px;';
    var vid = document.createElement('video');
    vid.id = 'trailerVid';
    vid.setAttribute('src', 'trailer.mp4');
    vid.setAttribute('controls', 'controls');
    vid.setAttribute('playsinline', 'playsinline');
    vid.setAttribute('preload', 'none');
    vid.style.cssText = 'width:100%;border-radius:12px;border:2px solid #ffb347;' +
      'background:#000;';
    var close = document.createElement('button');
    close.id = 'trailerClose';
    close.textContent = '✕ CLOSE';
    close.style.cssText = 'position:absolute;top:-14px;right:-6px;z-index:2;' +
      'background:#ff5d2e;color:#fff;border:none;border-radius:20px;' +
      'font:800 13px system-ui,sans-serif;padding:8px 14px;cursor:pointer;';
    close.addEventListener('click', function(){ TR.close(); });
    ov.addEventListener('click', function(e){
      if(e && e.target === ov) TR.close();
    });
    wrap.appendChild(vid);
    wrap.appendChild(close);
    ov.appendChild(wrap);
    var stage = document.getElementById('stage') || document.body;
    stage.appendChild(ov);
    TR.overlay = ov;
    TR.video = vid;
  }
  return true;
};

TR.open = function(){
  if(!TR.ensureDom()) return;
  var ov = TR.overlay || document.getElementById('trailerOv');
  var vid = TR.video || document.getElementById('trailerVid');
  if(ov) ov.style.display = 'flex';
  if(vid && vid.play){ try{ vid.play(); }catch(e){} }
};

TR.close = function(){
  if(typeof document === 'undefined') return;
  var ov = TR.overlay || document.getElementById('trailerOv');
  var vid = TR.video || document.getElementById('trailerVid');
  if(vid && vid.pause){ try{ vid.pause(); }catch(e){} }
  if(ov) ov.style.display = 'none';
};

TR.ensureDom();

/* debug/test handle for the verifier harness */
if(typeof window !== 'undefined'){
  window.__TR_DEBUG = { open: TR.open, close: TR.close,
    button: function(){ return TR.button || null; },
    overlay: function(){ return TR.overlay || null; } };
}

})();
