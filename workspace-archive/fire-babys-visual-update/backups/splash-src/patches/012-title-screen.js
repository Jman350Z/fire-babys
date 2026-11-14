/* =====================================================================
   PATCH 012 — title-screen
   Date: 2026-10-01 | For: Jeff (Fire Babys)
   Directive: Jeff — "build the ui .. how the game starts .. this needs
     to feel like a video game."
   What it changes:
     - Full-screen TITLE screen on every launch: the official title art,
       tagline, a pulsing TAP TO START, and a real menu —
       PLAY / ARMORY / CODEX / TRAILER — plus rising ember particles.
     - PLAY (or TAP TO START) fades the title out onto the deploy screen.
     - ARMORY / CODEX / TRAILER dismiss the title and open their
       patches' overlays (011 / 002 / 009). If one of those patches is
       disabled, its menu button hides itself gracefully.
     - Footer carries the copyright notice and the safety line.
   Touches: DOM only (#titleOv overlay, #titleEmbers canvas). No canvas
     game code, combat, or baseline changes.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: title overlay exists on load; play() hides it; menu buttons route.
   ===================================================================== */
(function(){
'use strict';

var TITLE_ART = 'data:image/jpeg;base64,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';

var T = {};

T.css = function(){
  if(typeof document === 'undefined' || document.getElementById('titleCss')) return;
  var s = document.createElement('style');
  s.id = 'titleCss';
  s.textContent =
    '@keyframes titlePulse{0%,100%{transform:scale(1);opacity:1}' +
    '50%{transform:scale(1.06);opacity:.85}}' +
    '@keyframes titleFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}' +
    '#titleOv{transition:opacity .45s ease}' +
    '#titleOv.gone{opacity:0;pointer-events:none}' +
    '#titleStart{animation:titlePulse 1.6s ease-in-out infinite}' +
    '#titleLogo{animation:titleFloat 4s ease-in-out infinite}';
  var h = (typeof document.getElementsByTagName === 'function' &&
             document.getElementsByTagName('head')[0]) ||
            document.getElementById('stage') || document.body;
  if(h && h.appendChild) h.appendChild(s);
};

T.menu = [
  { id:'titlePlay',    label:'▶ PLAY',    target:'deploy' },
  { id:'titleArmory',  label:'🎁 ARMORY',  btn:'armoryBtn' },
  { id:'titleCodex',   label:'📖 CODEX',   btn:'codexBtn' },
  { id:'titleTrailer', label:'🎬 TRAILER', btn:'trailerBtn' }
];

T.build = function(){
  if(typeof document === 'undefined') return false;
  if(document.getElementById('titleOv')) return true;
  T.css();
  var stage = document.getElementById('stage') || document.body;
  if(!stage || !stage.appendChild) return false;

  var ov = document.createElement('div');
  ov.id = 'titleOv';
  ov.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:40;' +
    'display:flex;flex-direction:column;justify-content:flex-end;align-items:center;' +
    'background:#0d0503;overflow:hidden;';

  var art = document.createElement('img');
  art.id = 'titleLogo';
  art.src = TITLE_ART;
  art.alt = 'Fire Babys title art';
  art.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;' +
    'object-fit:cover;opacity:.92;';
  ov.appendChild(art);

  var shade = document.createElement('div');
  shade.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;' +
    'background:linear-gradient(180deg,rgba(10,4,2,.15) 30%,rgba(10,4,2,.88) 78%);';
  ov.appendChild(shade);

  var em = document.createElement('canvas');
  em.id = 'titleEmbers';
  em.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
  ov.appendChild(em);

  var panel = document.createElement('div');
  panel.style.cssText = 'position:relative;z-index:2;width:100%;max-width:520px;' +
    'display:flex;flex-direction:column;align-items:center;padding:0 22px 26px;';

  var tag = document.createElement('div');
  tag.textContent = 'BLAZE ON • FIRED UP • READY TO BLAST';
  tag.style.cssText = 'color:#ffb347;font:800 11px system-ui;letter-spacing:2.5px;margin-bottom:12px;';
  panel.appendChild(tag);

  var start = document.createElement('button');
  start.id = 'titleStart';
  start.textContent = '🔥 TAP TO START';
  start.style.cssText = 'background:linear-gradient(180deg,#ff7a2e,#e23c0a);color:#fff;border:none;' +
    'border-radius:16px;font:900 20px system-ui;letter-spacing:1px;padding:16px 44px;' +
    'cursor:pointer;box-shadow:0 6px 30px rgba(255,93,46,.55);margin-bottom:14px;';
  if(start.addEventListener) start.addEventListener('click', function(){ T.play(); });
  panel.appendChild(start);

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;margin-bottom:14px;';
  T.menu.forEach(function(m){
    /* hide buttons whose patch is disabled/missing (except PLAY) */
    if(m.btn && !document.getElementById(m.btn)) return;
    var b = document.createElement('button');
    b.id = m.id;
    b.textContent = m.label;
    b.style.cssText = 'background:rgba(12,6,4,.72);color:#ffe9d6;border:1px solid rgba(255,150,60,.4);' +
      'border-radius:12px;font:800 14px system-ui;padding:12px;cursor:pointer;letter-spacing:.5px;';
    (function(mm){
      if(b.addEventListener) b.addEventListener('click', function(){ T.choose(mm); });
    })(m);
    grid.appendChild(b);
  });
  panel.appendChild(grid);

  var foot = document.createElement('div');
  foot.style.cssText = 'text-align:center;color:rgba(255,233,214,.55);font:600 10.5px/1.7 system-ui;';
  foot.textContent = '© 2026 Jeffery Pruden. All rights reserved. · Real fire is never a toy.';
  panel.appendChild(foot);

  ov.appendChild(panel);
  stage.appendChild(ov);
  T.ov = ov;
  T.embers(em);
  return true;
};

T.choose = function(m){
  if(m.target === 'deploy'){ T.play(); return; }
  T.hide();
  var btn = (typeof document !== 'undefined') && document.getElementById(m.btn);
  if(btn && btn.click) btn.click();
};

T.play = function(){ T.hide(); };
T.show = function(){
  T.build();
  var ov = T.ov || (typeof document !== 'undefined' && document.getElementById('titleOv'));
  if(!ov) return;
  if(ov.classList && typeof ov.classList.remove === 'function') ov.classList.remove('gone');
  ov.style.opacity = '';
  ov.style.display = 'flex';
  T.hidden = false;
};
T.hide = function(){
  var ov = T.ov || (typeof document !== 'undefined' && document.getElementById('titleOv'));
  if(!ov) return;
  if(ov.classList && typeof ov.classList.add === 'function') ov.classList.add('gone');
  else ov.style.opacity = '0';
  T.hidden = true;
  setTimeout(function(){ ov.style.display = 'none'; }, 480);
};

/* rising ember particles — heavily guarded for non-browser envs */
T.embers = function(cv){
  try{
    if(!cv || !cv.getContext || typeof requestAnimationFrame !== 'function') return;
    var ctx = cv.getContext('2d');
    if(!ctx) return;
    var W = cv.width = 480, H = cv.height = 800;
    var ps = [];
    for(var i = 0; i < 42; i++) ps.push(T.spawn(W, H, true));
    (function tick(){
      if(!T.ov || T.ov.style.display === 'none') return; /* stop when hidden */
      ctx.clearRect(0, 0, W, H);
      for(var j = 0; j < ps.length; j++){
        var p = ps[j];
        p.y -= p.v; p.x += p.w; p.a -= 0.004;
        if(p.a <= 0 || p.y < -10) ps[j] = T.spawn(W, H, false);
        else{
          ctx.globalAlpha = Math.max(0, p.a);
          ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(tick);
    })();
  }catch(e){ /* particles are decoration — never break the game */ }
};
T.spawn = function(W, H, anywhere){
  var cols = ['#ffb347', '#ff7a2e', '#ffd76a', '#ff5d2e'];
  return { x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10,
    v: 0.6 + Math.random() * 1.6, w: (Math.random() - 0.5) * 0.6,
    r: 1 + Math.random() * 2.6, a: 0.35 + Math.random() * 0.5,
    c: cols[(Math.random() * cols.length) | 0] };
};

T.build();

if(typeof window !== 'undefined'){
  window.__TITLE_DEBUG = { overlay: function(){ return T.ov || null; },
    play: T.play, show: T.show, menu: T.menu,
    isHidden: function(){ return !!T.hidden; } };
}

})();
