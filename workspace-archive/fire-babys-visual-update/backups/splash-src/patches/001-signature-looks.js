/* =====================================================================
   PATCH 001 — signature-looks
   Date: 2026-09-30 | For: Jeff (Fire Babys)
   What it changes: Full signature face redesign. Bigger eyes,
     one thick brow slab per eye slammed into an angry V, black pupils
     with red-hot rims, and chunkier per-character mouths + silhouette
     extras (headbands, fists, rock plates, wild crests, bigger crown).
   Touches: drawBabyEyes, drawBabyExtras (reassigned; originals kept as
     __fb_origEyes / __fb_origExtras for instant rollback inside this file)
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: open the game — every baby on the field has the new look.
   ===================================================================== */
(function(){
'use strict';

var __fb_origEyes = drawBabyEyes;
var __fb_origExtras = drawBabyExtras;

/* rounded-rect path, patch-local */
function __fb_rr(x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

drawBabyEyes = function(u, s){
  var fx = u.faceX, er = s * 0.26, ex = fx * s * 0.06, ey = -s * 0.06;
  var i, cx, k, tx, px, py;
  ctx.lineCap = 'round';

  /* ---- SIGNATURE BROW: one thick slab per eye, slammed into an angry V ---- */
  ctx.fillStyle = '#200a02';
  for(i = -1; i <= 1; i += 2){
    cx = ex + i * s * 0.30;
    ctx.save();
    ctx.translate(cx + fx * i * er * 0.35, ey - er * 1.85);
    ctx.rotate(i * -0.42 - fx * 0.10);
    __fb_rr(-er * 1.05, -er * 0.38, er * 2.1, er * 0.76, er * 0.38);
    ctx.fill();
    ctx.restore();
  }

  /* ---- big white eyes ---- */
  ctx.fillStyle = '#ffffff';
  for(i = -1; i <= 1; i += 2){
    cx = ex + i * s * 0.30;
    ctx.beginPath(); ctx.ellipse(cx, ey, er, er * 0.88, 0, 0, 6.2832); ctx.fill();
  }

  /* ---- pupils: black core, red-hot rim, locked onto facing ---- */
  for(i = -1; i <= 1; i += 2){
    cx = ex + i * s * 0.30;
    px = cx + fx * er * 0.42; py = ey + er * 0.10;
    ctx.fillStyle = '#e8120c';
    ctx.beginPath(); ctx.arc(px, py, er * 0.52, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#140402';
    ctx.beginPath(); ctx.arc(px, py, er * 0.34, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(px - er * 0.12, py - er * 0.14, er * 0.11, 0, 6.2832); ctx.fill();
  }

  /* ---- MOUTHS: bigger, chunkier, per character ---- */
  var my = ey + er * 2.05, mw = er * 1.25, mh = er * 0.66;
  if(u.isHero){
    /* BLAZE — big confident smirk */
    ctx.strokeStyle = '#3a0d05'; ctx.lineWidth = Math.max(2.5, er * 0.34);
    ctx.beginPath();
    ctx.moveTo(ex - fx * mw, my + mh * 0.35);
    ctx.quadraticCurveTo(ex + fx * mw * 0.25, my + mh * 0.15, ex + fx * mw * 1.05, my - mh * 0.55);
    ctx.stroke();
  } else if(u.key === 'brawler'){
    /* RUKO — wide gritted grin */
    ctx.fillStyle = '#ffffff';
    __fb_rr(ex - mw, my - mh * 0.55, mw * 2, mh * 1.1, mh * 0.4); ctx.fill();
    ctx.strokeStyle = '#3a0d05'; ctx.lineWidth = Math.max(2, er * 0.24); ctx.stroke();
    ctx.lineWidth = Math.max(1.2, er * 0.13);
    for(k = -2; k <= 2; k++){
      tx = ex + k * mw * 0.4;
      ctx.beginPath(); ctx.moveTo(tx, my - mh * 0.55); ctx.lineTo(tx, my + mh * 0.55); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(ex - mw, my); ctx.lineTo(ex + mw, my); ctx.stroke();
  } else if(u.key === 'guardian'){
    /* BOULDER — heavy underbite, two square teeth */
    ctx.strokeStyle = '#3a0d05'; ctx.lineWidth = Math.max(2.5, er * 0.3);
    ctx.beginPath(); ctx.moveTo(ex - mw * 0.9, my); ctx.lineTo(ex + mw * 0.9, my); ctx.stroke();
    ctx.fillStyle = u.colDark;
    __fb_rr(ex - mw * 0.7 + fx * mw * 0.15, my - mh * 0.1, mw * 1.4, mh * 0.95, mh * 0.35);
    ctx.fill();
    ctx.strokeStyle = '#3a0d05'; ctx.lineWidth = Math.max(1.5, er * 0.18); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ex - mw * 0.42 + fx * mw * 0.15, my - mh * 0.52, mw * 0.3, mh * 0.5);
    ctx.fillRect(ex + mw * 0.12 + fx * mw * 0.15, my - mh * 0.52, mw * 0.3, mh * 0.5);
  } else if(u.key === 'archer'){
    /* SIZZLE — cocky sideways smirk */
    ctx.strokeStyle = '#3a0d05'; ctx.lineWidth = Math.max(2.5, er * 0.32);
    ctx.beginPath();
    ctx.moveTo(ex - fx * mw * 0.8, my + mh * 0.4);
    ctx.quadraticCurveTo(ex + fx * mw * 0.3, my + mh * 0.2, ex + fx * mw, my - mh * 0.4);
    ctx.stroke();
  } else if(u.key === 'pyro'){
    /* CINDER — huge maniac grin, fangs top AND bottom */
    ctx.fillStyle = '#3a0d05';
    ctx.beginPath(); ctx.ellipse(ex, my, mw * 1.05, mh * 1.05, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#ff5a1e';
    ctx.beginPath(); ctx.ellipse(ex, my + mh * 0.25, mw * 0.7, mh * 0.6, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#ffffff';
    for(k = -1; k <= 1; k++){
      tx = ex + k * mw * 0.55;
      ctx.beginPath();
      ctx.moveTo(tx - mw * 0.22, my - mh * 0.8); ctx.lineTo(tx + mw * 0.22, my - mh * 0.8);
      ctx.lineTo(tx, my - mh * 0.8 + mh * 0.7); ctx.closePath(); ctx.fill();
    }
    for(k = 0; k <= 1; k++){
      tx = ex + (k === 0 ? -1 : 1) * mw * 0.45;
      ctx.beginPath();
      ctx.moveTo(tx - mw * 0.2, my + mh * 0.85); ctx.lineTo(tx + mw * 0.2, my + mh * 0.85);
      ctx.lineTo(tx, my + mh * 0.85 - mh * 0.6); ctx.closePath(); ctx.fill();
    }
  } else {
    /* LORD INFERNO (boss) + default — massive jaw, big fangs, inner glow */
    ctx.fillStyle = '#2a0802';
    ctx.beginPath(); ctx.ellipse(ex, my + mh * 0.2, mw * 1.2, mh * 1.15, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#ff7a1e';
    ctx.beginPath(); ctx.ellipse(ex, my + mh * 0.45, mw * 0.8, mh * 0.65, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#ffffff';
    var fang = mh * 0.95;
    for(k = -1.5; k <= 1.5; k += 1){
      tx = ex + k * mw * 0.5;
      ctx.beginPath();
      ctx.moveTo(tx - mw * 0.2, my - mh * 0.7); ctx.lineTo(tx + mw * 0.2, my - mh * 0.7);
      ctx.lineTo(tx, my - mh * 0.7 + fang); ctx.closePath(); ctx.fill();
    }
  }
};

drawBabyExtras = function(u, s, t){
  var fx = u.faceX, k, a;
  if(u.key === 'brawler'){
    /* RUKO — big fists + red headband with knot tails */
    ctx.fillStyle = u.colDark;
    ctx.beginPath(); ctx.arc(-s * 0.98, s * 0.2, s * 0.36, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.98, s * 0.2, s * 0.36, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = u.colDark; ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-s * 0.48, -s * 0.42); ctx.lineTo(-s * 0.12, -s * 0.3);
    ctx.moveTo(s * 0.48, -s * 0.42); ctx.lineTo(s * 0.12, -s * 0.3);
    ctx.stroke();
    /* headband */
    ctx.fillStyle = '#c81e1e';
    ctx.fillRect(-s * 0.78, -s * 0.86, s * 1.56, s * 0.26);
    ctx.strokeStyle = '#7a0d0d'; ctx.lineWidth = 2;
    ctx.strokeRect(-s * 0.78, -s * 0.86, s * 1.56, s * 0.26);
    var sway = Math.sin(t * 6 + u.walkPh) * s * 0.08;
    ctx.strokeStyle = '#c81e1e'; ctx.lineWidth = s * 0.12; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-fx * s * 0.78, -s * 0.73);
    ctx.quadraticCurveTo(-fx * s * 1.15, -s * 0.55 + sway, -fx * s * 1.05, -s * 0.25 + sway);
    ctx.stroke();
  } else if(u.key === 'guardian'){
    /* BOULDER — bigger molten-rock plates, brighter cracks */
    ctx.fillStyle = '#241408';
    for(k = 0; k < 7; k++){
      a = k * 0.897 + 0.3;
      ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.88, Math.sin(a) * s * 0.88, s * 0.32, 0, 6.2832); ctx.fill();
    }
    ctx.strokeStyle = '#ffcf5e'; ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, s * 0.3); ctx.lineTo(-s * 0.1, s * 0.05); ctx.lineTo(-s * 0.3, -s * 0.25);
    ctx.moveTo(s * 0.35, s * 0.35); ctx.lineTo(s * 0.15, s * 0.1); ctx.lineTo(s * 0.4, -s * 0.2);
    ctx.stroke();
  } else if(u.key === 'archer'){
    /* SIZZLE — chunky headband + bigger bow */
    ctx.fillStyle = u.colDark;
    ctx.fillRect(-s * 0.76, -s * 0.72, s * 1.52, s * 0.28);
    ctx.fillStyle = '#ffd76a';
    ctx.fillRect(-s * 0.1, -s * 0.72, s * 0.2, s * 0.28);
    var a1 = fx > 0 ? -1.25 : Math.PI - 1.25, a2 = fx > 0 ? 1.25 : Math.PI + 1.25;
    ctx.strokeStyle = '#5c2e10'; ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.arc(fx * s * 0.72, 0, s * 0.68, a1, a2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,200,0.85)'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(fx * s * 0.72 + Math.cos(a1) * s * 0.68, Math.sin(a1) * s * 0.68);
    ctx.lineTo(fx * s * 0.72 + Math.cos(a2) * s * 0.68, Math.sin(a2) * s * 0.68);
    ctx.stroke();
  } else if(u.key === 'pyro'){
    /* CINDER — wild triple-spike crest */
    var fl2 = 1 + Math.sin(t * 12 + u.walkPh) * 0.12;
    var spikes = [[-0.34, 1.0], [0, 1.35], [0.34, 1.0]];
    for(k = 0; k < 3; k++){
      var bx = spikes[k][0] * s, hh = s * (1.5 + 0.3 * Math.sin(t * 12 + k)) * spikes[k][1] * fl2;
      ctx.fillStyle = u.colDark;
      ctx.beginPath(); ctx.moveTo(bx - s * 0.22, -s * 0.6); ctx.lineTo(bx + s * 0.22, -s * 0.6);
      ctx.lineTo(bx + Math.sin(t * 9 + k * 2) * s * 0.1, -hh); ctx.closePath(); ctx.fill();
      ctx.fillStyle = k === 1 ? '#fff3c0' : u.colMain;
      ctx.beginPath(); ctx.moveTo(bx - s * 0.12, -s * 0.6); ctx.lineTo(bx + s * 0.12, -s * 0.6);
      ctx.lineTo(bx + Math.sin(t * 9 + k * 2) * s * 0.06, -hh * 0.72); ctx.closePath(); ctx.fill();
    }
  } else if(u.key === 'boss'){
    /* LORD INFERNO — heavy plates, glowing cracks, horn nubs */
    ctx.fillStyle = '#2e0e04';
    ctx.beginPath(); ctx.ellipse(-s * 0.42, s * 0.38, s * 0.34, s * 0.22, 0.4, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.44, -s * 0.32, s * 0.3, s * 0.2, -0.4, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#1c0702';
    ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.75); ctx.lineTo(-s * 0.28, -s * 0.85); ctx.lineTo(-s * 0.32, -s * 1.15); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.5, -s * 0.75); ctx.lineTo(s * 0.28, -s * 0.85); ctx.lineTo(s * 0.32, -s * 1.15); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffcf5e'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s * 0.1); ctx.lineTo(-s * 0.2, s * 0.1); ctx.lineTo(-s * 0.45, s * 0.45);
    ctx.moveTo(s * 0.5, -s * 0.45); ctx.lineTo(s * 0.25, -s * 0.15); ctx.lineTo(s * 0.55, s * 0.2);
    ctx.stroke();
  }
  if(u.isHero){
    /* BLAZE — bigger star crown with glow pulse */
    ctx.globalAlpha = 0.45 + 0.2 * Math.sin(t * 6);
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(0, -s * 1.5, s * 0.72, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = 1;
    starPath(0, -s * 1.5, s * 0.52);
    ctx.fillStyle = '#fff7c0'; ctx.fill();
    ctx.strokeStyle = '#ff9d3c'; ctx.lineWidth = 2.4; ctx.stroke();
  }
};

})();
