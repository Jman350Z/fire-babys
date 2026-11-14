/* =====================================================================
   PATCH 016 — story-cinematics
   Date: 2026-10-02 | For: Jeff (Fire Babys)
   Directive: Jeff — "We want a bad ass story mode first."
   What it changes:
     - DLG cinematic engine: portrait + name + typewriter dialogue,
       tap to advance, SKIP button. Pure DOM/canvas, no baseline touch.
     - Main INTRO cinematic: the team's arrival, every hero introduced
       with attitude, Lord Inferno's threat. Auto-plays the first time
       the story map opens; replayable via a 🎬 INTRO button on the map.
     - Per-town CINEMATICS: villain taunt + team answer for all 6 towns,
       each weaving in that town's fire-safety lesson. A 🎬 INTRO button
       is injected into every town brief; the cinematic auto-plays on a
       town's first visit (skippable).
     - LIBERATION lines: the team celebrates when a town falls.
     - GRADUATION cinematic: the full ceremony at the volcano.
     - Portraits drawn live from each character's signature colors
       (canon: spherical fireballs, expressive mouths, zero bird traits).
   Touches: DOM only (#dlgOv overlay). Watches 014's overlays
     (#storyOv, #townOv, #storyDoneOv) via polling — never modifies
     014's code.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: engine plays a script; all 6 towns have cinematics; intro replays.
   ===================================================================== */
(function(){
'use strict';

var DLG = {};
DLG.KEY = 'fb_cine_v1';

/* ---------------- 1. cast colors ---------------- */
DLG.CAST = {
  narrator: null,
  ruko:    { name:'RUKO',    body:'#ff8c2e', dark:'#a33d00', core:'#ffd76a', extra:'headband' },
  boulder: { name:'BOULDER', body:'#a0663a', dark:'#4a2c12', core:'#ffd76a', extra:null },
  sizzle:  { name:'SIZZLE',  body:'#ff9d2e', dark:'#a33d00', core:'#fff7c0', extra:'bow' },
  cinder:  { name:'CINDER',  body:'#e8352c', dark:'#7c0e04', core:'#ffb347', extra:'buns' },
  blaze:   { name:'BLAZE',   body:'#ffc93c', dark:'#8f5a00', core:'#fff7c0', extra:'crown' },
  twiggy:  { name:'TWIGGY',  body:'#7a8a3a', dark:'#2c3a12', core:'#d6e6a0', extra:null },
  slick:   { name:'SLICK',   body:'#d8a02e', dark:'#6e4a0b', core:'#ffe08a', extra:null },
  buzz:    { name:'BUZZ',    body:'#3ca9ff', dark:'#0b3d7c', core:'#d6f1ff', extra:null },
  slag:    { name:'SLAG',    body:'#8a8a9a', dark:'#2c2c3a', core:'#d6d6e6', extra:null },
  inferno: { name:'LORD INFERNO', body:'#5a1a0a', dark:'#1c0500', core:'#ff5a1e', extra:'horns' }
};

/* ---------------- 2. the scripts ---------------- */
DLG.SCRIPTS = {
/* 90210-style teen drama: rivalries, the new kid, clashing egos —
   then the whole crew locks in to save the world. Kid-safe: the drama
   is friendship, rivalry, and self-doubt. The payoff is always teamwork. */
intro: [
  { who:'narrator', text:'West Ember High. Population: six very loud teenagers.' },
  { who:'ruko',  text:"Okay, listen up! I'm Ruko, I'm the leader, and —" },
  { who:'sizzle',text:"Says who? Last week's training? I outscored you." },
  { who:'cinder',text:"Please. I outscored BOTH of you. By a lot." },
  { who:'boulder',text:"...I'm Boulder. I keep them from killing each other." },
  { who:'blaze', text:"I'm Blaze. I'm new. This is... a lot." },
  { who:'ruko',  text:"Whatever! The land needs protecting and we're the team. So we act like one." },
  { who:'sizzle',text:"Fine. But I'm still keeping score." },
  { who:'inferno',text:"Children playing heroes... I'll burn your little schoolyard down." },
  { who:'cinder',text:"Did that volcano just threaten us?" },
  { who:'ruko',  text:"Six towns. Six trials. We do it together — or not at all." },
  { who:'blaze', text:"Together. I'm in." }
],
towns: {
ember: [
  { who:'twiggy', text:"Trash fires! Everywhere! Try and stop me, babies!" },
  { who:'sizzle',text:"I've got the left flank. Cinder, take right — and try to keep up." },
  { who:'cinder',text:"KEEP UP? Girl, I AM the flank." },
  { who:'ruko',  text:"Enough! Sizzle left, Cinder right, NOW. Save the arguing for after we win." },
  { who:'boulder',text:"Class A. Trash and wood. Simple. Like some people's brains." },
  { who:'blaze', text:"Match the tool to the fire... together. Let's go!" }
],
grease: [
  { who:'slick',  text:"Careful, heroes... one wrong splash and this whole kitchen goes UP." },
  { who:'cinder', text:"Oh, I wanna go in HOT. Let me at him!" },
  { who:'boulder',text:"No. Water on grease explodes — you know this. Foam. Slow. Together." },
  { who:'cinder', text:"...Fine. But I don't have to like it." },
  { who:'sizzle', text:"Nobody likes it. That's why it's called training." }
],
volt: [
  { who:'buzz',   text:"BZZZT! Touch my grid and you FRY, little sparks!" },
  { who:'blaze',  text:"Guys... what if I'm not ready for this?" },
  { who:'sizzle', text:"Hey. New kid. You hatched with us. That makes you ready." },
  { who:'ruko',   text:"Kill the power first, then fight. I'll go left with you, Blaze. We got this." },
  { who:'blaze',  text:"...Together. Okay. Let's do it." }
],
slag: [
  { who:'slag',   text:"Metal burns hotter than your courage, sparks." },
  { who:'ruko',   text:"I got this one solo. Cover me — actually, don't. I don't need —" },
  { who:'boulder',text:"Ruko. Leaders trust their team. Sand. Smother. MY lane." },
  { who:'ruko',   text:"...You're right. Boulder takes point. Team — back him up." },
  { who:'cinder', text:"Did Ruko just... listen? Mark this day." }
],
smoke: [
  { who:'inferno',text:"My four generals. Your funeral." },
  { who:'ruko',   text:"This is it. Everybody's got a job. Sizzle — Buzz. Cinder — Slick. Boulder — Slag. Blaze — you're with me on Twiggy." },
  { who:'sizzle', text:"No arguing this time?" },
  { who:'ruko',   text:"No arguing. Just winning. Together." },
  { who:'blaze',  text:"The drama ends here. Let's save this city!" }
],
volcano: [
  { who:'inferno',text:"This is where sparks come to DIE." },
  { who:'ruko',   text:"Then it's a good thing we're not sparks anymore." },
  { who:'sizzle', text:"We're not even rivals anymore." },
  { who:'cinder', text:"Don't push it." },
  { who:'boulder',text:"We're protectors. All of us." },
  { who:'blaze',  text:"The new kid says: let's finish this. TOGETHER." }
]},
liberate: [
  [ { who:'ruko', text:"Town's safe. And nobody fought about it. Growth!" } ],
  [ { who:'sizzle', text:"Told you I don't miss. Cinder — you were okay too." } ],
  [ { who:'cinder', text:"OKAY? I was amazing. But... good team win." } ],
  [ { who:'boulder', text:"The land is safer. And we're still friends. Mostly." } ]
],
graduate: [
  { who:'narrator', text:'The volcano is silent.' },
  { who:'ruko',  text:"Remember when we couldn't stop arguing for five minutes?" },
  { who:'sizzle',text:"I still think I'm the best." },
  { who:'cinder',text:"And I still know it's me." },
  { who:'boulder',text:"And I still keep you both alive." },
  { who:'blaze', text:"I came in the new kid. I'm leaving family." },
  { who:'ruko',  text:"We're not trainees anymore. We're the Fire Babys — and this land is OURS to protect." },
  { who:'narrator', text:'Graduation complete. The Elemental Armor Generator awaits...' }
]};
DLG.saveSeen = function(){
  try{ if(typeof localStorage !== 'undefined') localStorage.setItem(DLG.KEY, JSON.stringify(DLG.seen)); }catch(e){}
};

/* ---------------- 4. portrait ---------------- */
DLG.face = function(canvas, id){
  try{
    var c = DLG.CAST[id];
    if(!canvas || !canvas.getContext || !c) return false;
    var ctx = canvas.getContext('2d');
    if(!ctx) return false;
    var S = canvas.width || 120, cx = S / 2, cy = S / 2 + S * 0.04, r = S * 0.34;
    var g = ctx.createRadialGradient(cx, cy - r * 0.25, r * 0.1, cx, cy, r * 1.25);
    g.addColorStop(0, c.core); g.addColorStop(0.55, c.body); g.addColorStop(1, c.dark);
    ctx.clearRect(0, 0, S, S);
    /* flame licks */
    ctx.fillStyle = c.body;
    for(var f = 0; f < 5; f++){
      var a = -Math.PI / 2 + (f - 2) * 0.5;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * r * 0.75, cy + Math.sin(a) * r * 0.75,
        r * 0.22, r * 0.42, (f - 2) * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    /* extras */
    if(c.extra === 'headband'){
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(cx - r * 0.95, cy - r * 0.62, r * 1.9, r * 0.3);
    } else if(c.extra === 'crown'){
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.5, cy - r * 0.72);
      ctx.lineTo(cx - r * 0.5, cy - r * 1.05); ctx.lineTo(cx - r * 0.25, cy - r * 0.8);
      ctx.lineTo(cx, cy - r * 1.1); ctx.lineTo(cx + r * 0.25, cy - r * 0.8);
      ctx.lineTo(cx + r * 0.5, cy - r * 1.05); ctx.lineTo(cx + r * 0.5, cy - r * 0.72);
      ctx.closePath(); ctx.fill();
    } else if(c.extra === 'horns'){
      ctx.fillStyle = '#2a0a05';
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.7, cy - r * 0.55); ctx.lineTo(cx - r * 1.05, cy - r * 1.15);
      ctx.lineTo(cx - r * 0.45, cy - r * 0.75); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.7, cy - r * 0.55); ctx.lineTo(cx + r * 1.05, cy - r * 1.15);
      ctx.lineTo(cx + r * 0.45, cy - r * 0.75); ctx.closePath(); ctx.fill();
    } else if(c.extra === 'buns'){
      ctx.fillStyle = c.body;
      ctx.beginPath(); ctx.arc(cx - r * 0.62, cy - r * 0.85, r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + r * 0.62, cy - r * 0.85, r * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    /* body */
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    /* face: glaring eyes + expressive mouth (canon) */
    var er = r * 0.16, ey = cy - r * 0.1, ex = r * 0.34;
    ctx.fillStyle = '#1a0a05';
    ctx.beginPath(); ctx.arc(cx - ex, ey, er, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + ex, ey, er, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = (id === 'buzz') ? '#7dd7ff' : '#ff2e1a';
    ctx.beginPath(); ctx.arc(cx - ex, ey, er * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + ex, ey, er * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a0a05'; ctx.lineWidth = Math.max(2, r * 0.09); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - ex - er * 1.3, ey - er * 1.5); ctx.lineTo(cx - ex + er * 1.1, ey - er * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + ex + er * 1.3, ey - er * 1.5); ctx.lineTo(cx + ex - er * 1.1, ey - er * 0.7); ctx.stroke();
    var villain = (id === 'twiggy' || id === 'slick' || id === 'buzz' || id === 'slag' || id === 'inferno');
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.beginPath();
    if(villain) ctx.arc(cx, cy + r * 0.62, r * 0.3, 1.15 * Math.PI, 1.85 * Math.PI); /* snarl */
    else ctx.arc(cx + r * 0.08, cy + r * 0.28, r * 0.34, 0.15 * Math.PI, 0.85 * Math.PI); /* smirk */
    ctx.stroke();
    return true;
  }catch(e){ return false; }
};

/* ---------------- 5. the engine ---------------- */
DLG.css = function(){
  try{
    if(typeof document === 'undefined' || document.getElementById('dlgCss')) return;
    var s = document.createElement('style');
    s.id = 'dlgCss';
    s.textContent =
      '#dlgOv{position:absolute;top:0;left:0;right:0;bottom:0;z-index:46;display:none;' +
      'flex-direction:column;justify-content:flex-end;background:rgba(5,2,1,.88);cursor:pointer;}' +
      '#dlgBox{background:rgba(20,8,4,.97);border-top:3px solid #ff5d2e;border-radius:18px 18px 0 0;' +
      'padding:16px 18px 22px;display:flex;gap:14px;align-items:flex-start;min-height:170px;}' +
      '#dlgName{color:#ffd76a;font:900 13px system-ui;letter-spacing:2px;margin-bottom:6px;}' +
      '#dlgText{color:#ffe9d6;font:600 15px/1.65 system-ui;min-height:74px;}' +
      '#dlgNext{color:#ff9d3c;font:800 12px system-ui;text-align:right;margin-top:6px;' +
      'animation:dlgBlink 1s infinite;}' +
      '@keyframes dlgBlink{0%,100%{opacity:1}50%{opacity:.35}}' +
      '#dlgSkip{position:absolute;top:14px;right:16px;background:rgba(12,6,4,.8);color:#ffb347;' +
      'border:1px solid rgba(255,150,60,.5);border-radius:12px;font:800 12px system-ui;' +
      'padding:8px 14px;cursor:pointer;}';
    var h = document.getElementsByTagName && document.getElementsByTagName('head')[0];
    (h || document.body).appendChild(s);
  }catch(e){}
};

DLG.q = null; DLG.i = 0; DLG.done = null; DLG.typing = null;

DLG.play = function(script, onDone){
  if(typeof document === 'undefined' || !script || !script.length){
    if(onDone) onDone();
    return;
  }
  DLG.css();
  var stage = document.getElementById('stage') || document.body;
  if(!stage || !stage.appendChild){ if(onDone) onDone(); return; }
  var old = document.getElementById('dlgOv');
  if(old && old.parentNode && old.parentNode.removeChild) old.parentNode.removeChild(old);
  var ov = document.createElement('div');
  ov.id = 'dlgOv';
  ov.innerHTML =
    '<button id="dlgSkip">SKIP ▸▸</button>' +
    '<div id="dlgBox">' +
    '<canvas id="dlgFace" width="120" height="120" style="width:84px;height:84px;flex-shrink:0;"></canvas>' +
    '<div style="flex:1;min-width:0;">' +
    '<div id="dlgName"></div><div id="dlgText"></div><div id="dlgNext">TAP ▸</div>' +
    '</div></div>';
  stage.appendChild(ov);
  DLG.q = script; DLG.i = 0; DLG.done = onDone || null;
  ov.style.display = 'flex';
  var skip = document.getElementById('dlgSkip');
  if(skip && skip.addEventListener) skip.addEventListener('click', function(e){
    if(e && e.stopPropagation) e.stopPropagation();
    DLG.finish();
  });
  if(ov.addEventListener) ov.addEventListener('click', function(){ DLG.advance(); });
  DLG.render();
};

DLG.render = function(){
  try{
    var line = DLG.q[DLG.i];
    var c = DLG.CAST[line.who] || {};
    var nm = document.getElementById('dlgName');
    var tx = document.getElementById('dlgText');
    var fc = document.getElementById('dlgFace');
    if(!nm || !tx) return;
    if(line.who === 'narrator'){
      nm.textContent = '—';
      nm.style.color = '#8a6a5a';
      if(fc) fc.style.visibility = 'hidden';
      tx.style.fontStyle = 'italic';
      tx.style.textAlign = 'center';
    } else {
      nm.textContent = c.name || line.who.toUpperCase();
      nm.style.color = '#ffd76a';
      if(fc){ fc.style.visibility = 'visible'; DLG.face(fc, line.who); }
      tx.style.fontStyle = 'normal';
      tx.style.textAlign = 'left';
    }
    /* typewriter */
    if(DLG.typing && DLG.typing.timer && typeof clearInterval !== 'undefined'){
      try{ clearInterval(DLG.typing.timer); }catch(e){}
    }
    var full = line.text, n = 0;
    tx.textContent = '';
    DLG.typing = { full: full, done: false };
    var step = function(){
      n += 2;
      if(n >= full.length){ tx.textContent = full; DLG.typing.done = true; return; }
      tx.textContent = full.slice(0, n);
    };
    if(typeof setInterval !== 'undefined'){
      DLG.typing.timer = setInterval(function(){
        try{ step(); if(DLG.typing.done && DLG.typing.timer) clearInterval(DLG.typing.timer); }catch(e){}
      }, 18);
    } else {
      tx.textContent = full; DLG.typing.done = true;
    }
  }catch(e){}
};

DLG.advance = function(){
  try{
    if(DLG.typing && !DLG.typing.done){
      var tx = document.getElementById('dlgText');
      if(tx) tx.textContent = DLG.typing.full;
      DLG.typing.done = true;
      if(DLG.typing.timer && typeof clearInterval !== 'undefined'){
        try{ clearInterval(DLG.typing.timer); }catch(e){}
      }
      return;
    }
    DLG.i++;
    if(DLG.i >= DLG.q.length){ DLG.finish(); return; }
    DLG.render();
  }catch(e){ DLG.finish(); }
};

DLG.finish = function(){
  try{
    if(DLG.typing && DLG.typing.timer && typeof clearInterval !== 'undefined'){
      try{ clearInterval(DLG.typing.timer); }catch(e){}
    }
    var ov = document.getElementById('dlgOv');
    if(ov) ov.style.display = 'none';
  }catch(e){}
  var cb = DLG.done;
  DLG.q = null; DLG.done = null;
  if(cb){ try{ cb(); }catch(e){} }
};

/* ---------------- 6. hooks into 014's overlays (polling, no code touch) ---------------- */
DLG.TOWN_IDS = ['ember', 'grease', 'volt', 'slag', 'smoke', 'volcano'];

DLG.watch = function(){
  try{
    if(typeof document === 'undefined') return;
    /* town brief open? inject 🎬 INTRO button + auto-play first visit */
    var townOv = document.getElementById('townOv');
    if(townOv && townOv.style.display !== 'none' && !document.getElementById('dlgTownBtn')){
      var idx = DLG.currentTownIdx(townOv);
      if(idx >= 0){
        var id = DLG.TOWN_IDS[idx];
        var btn = document.createElement('button');
        btn.id = 'dlgTownBtn';
        btn.textContent = '🎬 INTRO';
        btn.style.cssText = 'background:transparent;color:#ffd76a;border:2px solid #ffd76a;' +
          'border-radius:14px;font:800 15px system-ui;padding:14px 20px;cursor:pointer;margin-top:10px;';
        if(btn.addEventListener) btn.addEventListener('click', function(e){
          if(e && e.stopPropagation) e.stopPropagation();
          DLG.play(DLG.SCRIPTS.towns[id]);
        });
        /* 014 puts buttons in a row div; append nearby */
        var box = townOv.firstChild || townOv;
        if(box && box.appendChild) box.appendChild(btn);
        var seen = DLG.loadSeen();
        if(!seen.towns[id]){
          seen.towns[id] = 1;
          DLG.saveSeen();
          DLG.play(DLG.SCRIPTS.towns[id]);
        }
      }
    }
    /* story map open? intro auto-play first time + replay button */
    var storyOv = document.getElementById('storyOv');
    if(storyOv && storyOv.style.display !== 'none' && !document.getElementById('dlgMapBtn')){
      var seen2 = DLG.loadSeen();
      var head = storyOv.firstChild;
      if(head && head.appendChild){
        var mb = document.createElement('button');
        mb.id = 'dlgMapBtn';
        mb.textContent = '🎬 PLAY INTRO';
        mb.style.cssText = 'background:transparent;color:#ffd76a;border:1px solid rgba(255,215,106,.6);' +
          'border-radius:12px;font:800 12px system-ui;padding:8px 18px;cursor:pointer;margin-top:8px;';
        if(mb.addEventListener) mb.addEventListener('click', function(e){
          if(e && e.stopPropagation) e.stopPropagation();
          DLG.play(DLG.SCRIPTS.intro);
        });
        head.appendChild(mb);
      }
      if(!seen2.intro){
        seen2.intro = true;
        DLG.saveSeen();
        DLG.play(DLG.SCRIPTS.intro);
      }
    }
    /* liberation / graduation overlay? celebrate */
    var doneOv = document.getElementById('storyDoneOv');
    if(doneOv && doneOv.style.display !== 'none' && !doneOv.__dlgSeen){
      doneOv.__dlgSeen = true;
      var txt = '';
      try{ txt = doneOv.textContent || ''; }catch(e){}
      if(/GRADUAT/i.test(txt)){
        DLG.play(DLG.SCRIPTS.graduate);
      } else {
        var libs = DLG.SCRIPTS.liberate;
        DLG.play(libs[(Math.random() * libs.length) | 0]);
      }
    }
  }catch(e){}
};

/* figure out which town the brief is for, from the brief's title text */
DLG.currentTownIdx = function(townOv){
  try{
    var txt = (townOv.textContent || '').toUpperCase();
    var names = ['EMBER VILLAGE', 'GREASEWORKS', 'VOLT TOWN', 'SLAGHEAP', 'SMOKESTACK CITY', 'VOLCANO'];
    for(var i = 0; i < names.length; i++){
      if(txt.indexOf(names[i]) >= 0) return i;
    }
  }catch(e){}
  return -1;
};

/* seen-state: which cinematics already auto-played (localStorage) */
DLG.loadSeen = function(){
  var d = { intro:false, towns:{} };
  try{
    if(typeof localStorage !== 'undefined'){
      var raw = localStorage.getItem(DLG.KEY);
      if(raw){ var p = JSON.parse(raw); if(p && typeof p === 'object') d = p; }
    }
  }catch(e){}
  if(typeof d.intro === 'undefined') d.intro = false;
  if(!d.towns || typeof d.towns !== 'object') d.towns = {};
  DLG.seen = d;
  return d;
};
DLG.loadSeen();

if(typeof window !== 'undefined' && typeof window.setInterval !== 'undefined'){
  window.setInterval(function(){ try{ DLG.watch(); }catch(e){} }, 600);
}

if(typeof window !== 'undefined'){
  window.__CINE_DEBUG = {
    play: DLG.play, face: DLG.face, CAST: DLG.CAST, SCRIPTS: DLG.SCRIPTS,
    watch: DLG.watch, currentTownIdx: DLG.currentTownIdx, loadSeen: DLG.loadSeen
  };
}

})();
