/* =====================================================================
   PATCH 004 — two-girl-fire-babys
   Date: 2026-09-30 | For: Jeff (Fire Babys)
   What it changes: SIZZLE (archer) and CINDER (pyro) are now the two
     girl Fire Babys. New she/her bios, attitudes, and backstories in
     the codex; new unmistakably-feminine fire silhouettes drawn by the
     live renderer (Sizzle: flowing flame ponytail + her bow; Cinder:
     twin ember-buns replacing the crest); subtle eyelash flicks for
     both. Roles, names, stats, skills, and specials are untouched.
     Their codex cards + portraits are repainted in place.
   Touches: window.__FB_BIOS (archer, pyro), drawBabyEyes,
     drawBabyExtras (wrapped; originals kept patch-local for rollback),
     codex card DOM (archer/pyro cards only). No stat or logic changes.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: tap 🔥 — Sizzle and Cinder read as girls in bio and portrait.
   ===================================================================== */
(function(){
'use strict';

var __fb4_prevEyes = drawBabyEyes;
var __fb4_prevExtras = drawBabyExtras;

/* ---------------- girl bios ---------------- */
if(window.__FB_BIOS){
  window.__FB_BIOS.archer = {
    name:'SIZZLE', title:'The Showoff',
    attitude:'"Watch and learn, boys."',
    desc:'Lean, fast, and allergic to humility. The squad\'s trick-shot sniper — she celebrates every hit like she just won the championship, and she usually has.',
    backstory:'Born a stray campfire spark. She learned to shoot straight racing canyon winds — lost every race, and still claims she let them win.',
    special:'SPARK VOLLEY', specialDesc:'A fan of flaming arrows, all aimed with total (over)confidence.',
    stats:'Archer · Long range · High crit, low patience'
  };
  window.__FB_BIOS.pyro = {
    name:'CINDER', title:'The Chaos Gremlin',
    attitude:'"Hehehe... did that explode? GOOD."',
    desc:'Unpredictable, unhinged, unforgettable. She giggles while things detonate. Banned from three armories and one very nice library.',
    backstory:'A wizard tried to bottle lightning. The bottle broke. Cinder didn\'t. Nobody has been able to explain her since — least of all Cinder herself.',
    special:'METEOR DROP', specialDesc:'Cinder points at the sky and a burning rock answers. Do not stand near the pointing.',
    stats:'Pyro · Splash damage · Chaos, but effective'
  };
}

/* ---------------- lashes for the two girls ---------------- */
var __fb4_lashCount = 0;
function __fb4_lashes(u, s){
  var fx = u.faceX, er = s * 0.26, ex = fx * s * 0.06, ey = -s * 0.06;
  ctx.strokeStyle = '#200a02';
  ctx.lineWidth = Math.max(1.4, er * 0.16);
  ctx.lineCap = 'round';
  for(var i = -1; i <= 1; i += 2){
    var cx = ex + i * s * 0.30;
    var ox = cx + i * er * 0.92, oy = ey - er * 0.25;
    for(var f = 0; f < 3; f++){
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + i * er * (0.28 + f * 0.14), oy - er * (0.3 + f * 0.22));
      ctx.stroke();
      __fb4_lashCount++;
    }
  }
}

drawBabyEyes = function(u, s){
  __fb4_prevEyes(u, s);
  if(!u.customSpec && (u.key === 'archer' || u.key === 'pyro')) __fb4_lashes(u, s);
};

/* ---------------- girl silhouettes (pure fire, no extras from elsewhere) ---------------- */
drawBabyExtras = function(u, s, t){
  if(u.customSpec) return __fb4_prevExtras(u, s, t); /* creator babies keep their own look */
  var fx = u.faceX, k;
  if(u.key === 'archer'){
    /* SIZZLE — flowing flame ponytail + her headband + her bow */
    var sway = Math.sin(t * 7 + u.walkPh) * s * 0.1;
    var bx = -fx * s * 0.82, by = -s * 0.55;
    for(k = 3; k >= 1; k--){
      var w = s * (0.34 - k * 0.07), yy = by - k * s * 0.34;
      ctx.fillStyle = k === 3 ? u.colDark : (k === 2 ? u.colMain : '#fff3c0');
      ctx.beginPath();
      ctx.moveTo(bx - w, by - (k - 1) * s * 0.34);
      ctx.quadraticCurveTo(bx - fx * s * 0.5 + sway * k, yy,
                           bx + sway * k * 1.4, yy - s * 0.3);
      ctx.quadraticCurveTo(bx - fx * s * 0.5 + sway * k, yy,
                           bx + w, by - (k - 1) * s * 0.34);
      ctx.closePath(); ctx.fill();
    }
    /* headband (her gear) */
    ctx.fillStyle = u.colDark;
    ctx.fillRect(-s * 0.76, -s * 0.72, s * 1.52, s * 0.28);
    ctx.fillStyle = '#ffd76a';
    ctx.fillRect(-s * 0.1, -s * 0.72, s * 0.2, s * 0.28);
    /* bow (her weapon) */
    var a1 = fx > 0 ? -1.25 : Math.PI - 1.25, a2 = fx > 0 ? 1.25 : Math.PI + 1.25;
    ctx.strokeStyle = '#5c2e10'; ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.arc(fx * s * 0.72, 0, s * 0.68, a1, a2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,200,0.85)'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(fx * s * 0.72 + Math.cos(a1) * s * 0.68, Math.sin(a1) * s * 0.68);
    ctx.lineTo(fx * s * 0.72 + Math.cos(a2) * s * 0.68, Math.sin(a2) * s * 0.68);
    ctx.stroke();
    return;
  }
  if(u.key === 'pyro'){
    /* CINDER — twin ember-buns (puffs of living flame) */
    for(k = -1; k <= 1; k += 2){
      var cxp = k * s * 0.48, cyp = -s * 0.98;
      var fl = 1 + Math.sin(t * 11 + u.walkPh + k * 2) * 0.1;
      ctx.fillStyle = u.colDark;
      ctx.beginPath(); ctx.arc(cxp, cyp, s * 0.36 * fl, 0, 6.2832); ctx.fill();
      ctx.fillStyle = u.colMain;
      ctx.beginPath(); ctx.arc(cxp, cyp - s * 0.03, s * 0.24 * fl, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#fff3c0';
      ctx.beginPath(); ctx.arc(cxp - s * 0.06, cyp - s * 0.1, s * 0.1 * fl, 0, 6.2832); ctx.fill();
    }
    return;
  }
  return __fb4_prevExtras(u, s, t);
};

/* ---------------- repaint the two codex cards in place ---------------- */
function __fb4_portrait(cv, key){
  var def = UNIT_DEFS[key];
  var pctx = cv.getContext('2d');
  var realCtx = ctx;
  ctx = pctx;
  try{
    var s = 30, k, a;
    pctx.clearRect(0, 0, 96, 112);
    pctx.save();
    pctx.translate(48, 60);
    pctx.fillStyle = def.dark;
    for(k = 0; k < 6; k++){
      a = k * 1.047 + 0.3;
      var L = s * 1.25, ca = Math.cos(a), sa = Math.sin(a);
      pctx.beginPath();
      pctx.moveTo(ca * s * 0.55, sa * s * 0.55);
      pctx.lineTo(Math.cos(a + 0.3) * s * 0.78, Math.sin(a + 0.3) * s * 0.78);
      pctx.lineTo(ca * L, sa * L);
      pctx.lineTo(Math.cos(a - 0.3) * s * 0.78, Math.sin(a - 0.3) * s * 0.78);
      pctx.closePath(); pctx.fill();
    }
    pctx.fillStyle = def.body;
    pctx.beginPath(); pctx.arc(0, 0, s, 0, 6.2832); pctx.fill();
    pctx.fillStyle = def.core;
    pctx.beginPath(); pctx.arc(-s * 0.06, s * 0.06, s * 0.5, 0, 6.2832); pctx.fill();
    var fake = { key:key, faceX:1, isHero:false, colDark:def.dark, colMain:def.body, walkPh:1.3 };
    drawBabyExtras(fake, s, 1.3);
    drawBabyEyes(fake, s);
    pctx.strokeStyle = '#ffd76a'; pctx.lineWidth = 3;
    pctx.beginPath(); pctx.arc(0, 0, s + 4, 0, 6.2832); pctx.stroke();
    pctx.restore();
  } finally {
    ctx = realCtx;
  }
}

function __fb4_bodyHTML(b){
  return '<div class="cx-name">' + b.name + '</div>' +
    '<div class="cx-title">' + b.title + '</div>' +
    '<p class="cx-att">' + b.attitude + '</p>' +
    '<div class="cx-sec">SCOUTING REPORT</div>' +
    '<p class="cx-txt">' + b.desc + '</p>' +
    '<div class="cx-sec">BACKSTORY</div>' +
    '<p class="cx-txt">' + b.backstory + '</p>' +
    '<div class="cx-sec">SPECIAL MOVE</div>' +
    '<p class="cx-txt"><span class="cx-spec">🔥 ' + b.special + '</span> — ' + b.specialDesc + '</p>' +
    '<div class="cx-stats">' + b.stats + '</div>';
}

(function __fb4_refreshCodex(){
  var ov = document.getElementById('codexOv');
  if(!ov || !window.__FB_BIOS) return;
  var cards = ov.querySelector('#codexCards');
  if(!cards || !cards.children) return;
  var order = ['hero', 'brawler', 'guardian', 'archer', 'pyro', 'boss'];
  for(var n = 0; n < order.length; n++){
    var key = order[n];
    if(key !== 'archer' && key !== 'pyro') continue;
    var card = cards.children[n];
    if(!card) continue;
    var b = window.__FB_BIOS[key];
    var body = card.querySelector('.cx-body');
    if(body) body.innerHTML = __fb4_bodyHTML(b);
    var cv = card.querySelector('canvas');
    if(cv) __fb4_portrait(cv, key);
  }
})();

/* debug/testing interface */
window.__FB4_DEBUG = {
  GIRL_KEYS: ['archer', 'pyro'],
  girlBio: function(key){ return (window.__FB_BIOS && window.__FB_BIOS[key]) || null; },
  lashCount: function(){ return __fb4_lashCount; },
  resetLashCount: function(){ __fb4_lashCount = 0; }
};

})();
