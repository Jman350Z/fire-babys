/* =====================================================================
   PATCH 015 — player-profile
   Date: 2026-10-02 | For: Jeff (Fire Babys)
   Directive: Jeff — player profile: name, Fire Baby avatar, battle
     stats, towns liberated, armor collection.
   What it changes:
     - 👤 PROFILE button on the HUD (next to 🗺️) + a PROFILE button
       injected into the title-screen menu.
     - Profile overlay: your Fire Baby avatar (drawn from your equipped
       baby's flame colors), editable player name, trainee rank,
       battle stats (wins / losses / win rate), towns liberated (x/6,
       pulled live from story-mode progress), armor collection
       (pieces owned + rarity mix, pulled live from the armory).
     - Wins/losses counted via a Game.checkEnd chain (stacks with
       003's and 014's hooks). Progress persists in localStorage
       under its own key, guarded.
   NOTE (COPPA): Jeff asked about linking an email for a welcome
     reward. Because this game is for kids, NO email field ships in
     this patch — collecting children's emails needs a settled
     parental-consent design first. The profile is fully local until
     then. Do not add an email input here without Jeff's explicit
     go-ahead on the consent design.
   Touches: DOM only (#profileBtn, #profileOv). Game.checkEnd (chained).
     No canvas, combat, or baseline changes.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: wins/losses count; rank climbs with towns; overlay builds.
   ===================================================================== */
(function(){
'use strict';

var PF = {};
PF.KEY = 'fb_profile_v1';

/* ---------------- 1. store ---------------- */
PF.mem = null;
PF.load = function(){
  if(PF.mem) return PF.mem;
  var d = { name:'', wins:0, losses:0, since:0 };
  try{
    if(typeof localStorage !== 'undefined'){
      var raw = localStorage.getItem(PF.KEY);
      if(raw){ var p = JSON.parse(raw); if(p && typeof p === 'object') d = p; }
    }
  }catch(e){}
  if(typeof d.wins !== 'number' || d.wins < 0) d.wins = 0;
  if(typeof d.losses !== 'number' || d.losses < 0) d.losses = 0;
  if(!d.since) d.since = Date.now();
  PF.mem = d;
  return d;
};
PF.save = function(){
  try{ if(typeof localStorage !== 'undefined') localStorage.setItem(PF.KEY, JSON.stringify(PF.mem)); }catch(e){}
};

/* ---------------- 2. battle stats hook (chains with 003/014) ---------------- */
PF.recordResult = function(won){
  var d = PF.load();
  if(won) d.wins++; else d.losses++;
  PF.save();
};
if(typeof Game !== 'undefined' && Game.checkEnd){
  var __pf_origCheckEnd = Game.checkEnd;
  Game.checkEnd = function(){
    var wasWon = this.won, wasLost = this.lost;
    __pf_origCheckEnd.apply(this, arguments);
    try{
      if(this.won && !wasWon) PF.recordResult(true);
      else if(this.lost && !wasLost) PF.recordResult(false);
    }catch(e){}
  };
}

/* ---------------- 3. live readers (guarded; never throw) ---------------- */
PF.readJSON = function(key, fallback){
  try{
    if(typeof localStorage === 'undefined') return fallback;
    var raw = localStorage.getItem(key);
    if(!raw) return fallback;
    var p = JSON.parse(raw);
    return (p && typeof p === 'object') ? p : fallback;
  }catch(e){ return fallback; }
};

/* story towns liberated — reads 014's store directly */
PF.towns = function(){
  var names = [];
  try{
    var s = PF.readJSON('fb_story_v1', null);
    var doneIds = (s && s.done instanceof Array) ? s.done : [];
    var map = {};
    if(typeof window !== 'undefined' && window.__STORY_DEBUG && window.__STORY_DEBUG.TOWNS){
      var towns = window.__STORY_DEBUG.TOWNS;
      for(var i = 0; i < towns.length; i++) map[towns[i].id] = towns[i].name;
    }
    for(var k = 0; k < doneIds.length; k++){
      names.push(map[doneIds[k]] || doneIds[k]);
    }
  }catch(e){}
  return names;
};

/* armor collection — reads 011's armory */
PF.armor = function(){
  var list = PF.readJSON('fb_armory', []);
  if(!(list instanceof Array)) list = [];
  var mix = {};
  for(var i = 0; i < list.length; i++){
    var r = (list[i] && list[i].rarity) || 'unknown';
    mix[r] = (mix[r] || 0) + 1;
  }
  return { count: list.length, mix: mix };
};

/* equipped baby — reads 003's creator store */
PF.baby = function(){
  var out = { name:'No baby yet', cls:'—', body:'#ff8c2e', dark:'#a33d00', core:'#ffd76a' };
  try{
    var spec = null;
    if(typeof window !== 'undefined' && window.__FB3_DEBUG && window.__FB3_DEBUG.equippedSpec){
      spec = window.__FB3_DEBUG.equippedSpec();
    }
    if(!spec){
      var s = PF.readJSON('fireBabysCreatorV1', null);
      if(s && s.customs instanceof Array && s.customs.length){
        var eq = null;
        for(var i = 0; i < s.customs.length; i++){
          if(s.customs[i] && s.customs[i].id === s.equipped){ eq = s.customs[i]; break; }
        }
        spec = eq || s.customs[0];
      }
    }
    if(spec){
      if(spec.name) out.name = String(spec.name);
      if(window.__FB3_DEBUG && window.__FB3_DEBUG.cls){
        try{ var c = window.__FB3_DEBUG.cls(spec.cls); if(c && c.name) out.cls = c.name; }catch(e){}
      }
      var pal = null;
      if(window.__FB3_DEBUG && window.__FB3_DEBUG.pal){
        try{ pal = window.__FB3_DEBUG.pal(spec.pal); }catch(e){}
      }
      if(pal){
        if(pal.body) out.body = pal.body;
        if(pal.dark) out.dark = pal.dark;
        if(pal.core) out.core = pal.core;
      }
    }
  }catch(e){}
  return out;
};

/* ---------------- 3b. escaper (town/armor names come from localStorage) ---------------- */
PF.esc = function(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};

/* ---------------- 4. rank ---------------- */
PF.RANKS = [
  { towns:6, icon:'🎓', title:'Protector of the Land' },
  { towns:5, icon:'⭐', title:'Senior Trainee' },
  { towns:3, icon:'🔥', title:'Blaze Trainee' },
  { towns:1, icon:'🔥', title:'Ember Trainee' },
  { towns:0, icon:'✨', title:'Spark Trainee' }
];
PF.rank = function(){
  var n = PF.towns().length;
  for(var i = 0; i < PF.RANKS.length; i++){
    if(n >= PF.RANKS[i].towns) return PF.RANKS[i];
  }
  return PF.RANKS[PF.RANKS.length - 1];
};

/* ---------------- 5. avatar (mini fireball, baby's colors) ---------------- */
PF.drawAvatar = function(canvas, baby){
  try{
    if(!canvas || !canvas.getContext) return false;
    var ctx = canvas.getContext('2d');
    if(!ctx) return false;
    var S = canvas.width || 96, cx = S / 2, cy = S / 2, r = S * 0.36;
    var g = ctx.createRadialGradient(cx, cy - r * 0.25, r * 0.1, cx, cy, r * 1.25);
    g.addColorStop(0, baby.core);
    g.addColorStop(0.55, baby.body);
    g.addColorStop(1, baby.dark);
    ctx.clearRect(0, 0, S, S);
    /* flame licks */
    ctx.fillStyle = baby.body;
    for(var f = 0; f < 5; f++){
      var a = -Math.PI / 2 + (f - 2) * 0.5;
      var fx = cx + Math.cos(a) * r * 0.75, fy = cy + Math.sin(a) * r * 0.75;
      ctx.beginPath();
      ctx.ellipse(fx, fy, r * 0.22, r * 0.42, (f - 2) * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    /* body */
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    /* face: glaring eyes + mouth (canon: expressive mouths on every baby) */
    var er = r * 0.16, ey = cy - r * 0.12, ex = r * 0.34;
    ctx.fillStyle = '#1a0a05';
    ctx.beginPath(); ctx.arc(cx - ex, ey, er, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + ex, ey, er, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff2e1a';
    ctx.beginPath(); ctx.arc(cx - ex, ey, er * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + ex, ey, er * 0.45, 0, Math.PI * 2); ctx.fill();
    /* angry brow slabs */
    ctx.strokeStyle = '#1a0a05'; ctx.lineWidth = Math.max(2, r * 0.09); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - ex - er * 1.3, ey - er * 1.5); ctx.lineTo(cx - ex + er * 1.1, ey - er * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + ex + er * 1.3, ey - er * 1.5); ctx.lineTo(cx + ex - er * 1.1, ey - er * 0.7); ctx.stroke();
    /* cocky smirk */
    ctx.strokeStyle = '#1a0a05'; ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.beginPath(); ctx.arc(cx + r * 0.08, cy + r * 0.28, r * 0.34, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    return true;
  }catch(e){ return false; }
};

/* ---------------- 6. HUD button + title menu injection ---------------- */
PF.ensureBtn = function(){
  try{
    if(typeof document === 'undefined') return false;
    if(document.getElementById('profileBtn')) return true;
    var hud = document.getElementById('hud');
    if(hud){
      var b = document.createElement('button');
      b.id = 'profileBtn';
      b.textContent = '👤';
      b.setAttribute('aria-label', 'player profile');
      b.style.cssText = 'pointer-events:auto;background:rgba(12,6,4,.72);' +
        'border:1px solid rgba(255,150,60,.25);border-radius:10px;' +
        'font-size:20px;padding:6px 9px;margin-right:6px;cursor:pointer;';
      if(b.addEventListener) b.addEventListener('click', function(){ PF.open(); });
      var anchor = document.getElementById('storyBtn') || document.getElementById('muteBtn');
      if(anchor && hud.insertBefore) hud.insertBefore(b, anchor); else hud.appendChild(b);
    }
    PF.injectTitleBtn();
    return true;
  }catch(e){ return false; }
};

PF.injectTitleBtn = function(){
  try{
    if(typeof document === 'undefined' || document.getElementById('titleProfile')) return;
    var play = document.getElementById('titlePlay');
    var grid = play && play.parentNode;
    if(!grid || !grid.appendChild) return;
    var b = document.createElement('button');
    b.id = 'titleProfile';
    b.textContent = '👤 PROFILE';
    b.style.cssText = 'background:rgba(12,6,4,.72);color:#ffe9d6;border:1px solid rgba(255,150,60,.4);' +
      'border-radius:12px;font:800 14px system-ui;padding:12px;cursor:pointer;letter-spacing:.5px;';
    if(b.addEventListener) b.addEventListener('click', function(){
      try{
        var t = document.getElementById('titleOv');
        if(t) t.style.display = 'none';
      }catch(e){}
      PF.open();
    });
    grid.appendChild(b);
  }catch(e){}
};

/* ---------------- 7. profile overlay ---------------- */
PF.css = function(){
  try{
    if(typeof document === 'undefined' || document.getElementById('pfCss')) return;
    var s = document.createElement('style');
    s.id = 'pfCss';
    s.textContent =
      '#profileOv{position:absolute;top:0;left:0;right:0;bottom:0;z-index:42;display:none;' +
      'flex-direction:column;background:rgba(8,3,2,.97);overflow-y:auto;}' +
      '.pf-card{background:rgba(30,12,6,.9);border:2px solid rgba(255,150,60,.3);' +
      'border-radius:14px;padding:14px;margin:8px 18px;}' +
      '.pf-card h3{color:#ffd76a;font:800 12px system-ui;letter-spacing:2px;margin:0 0 8px;}' +
      '.pf-stat{display:flex;flex-direction:column;align-items:center;flex:1;}' +
      '.pf-stat b{color:#ffe9d6;font:900 20px system-ui;}' +
      '.pf-stat span{color:#c98a5a;font:700 10px system-ui;letter-spacing:1px;}';
    var h = document.getElementsByTagName && document.getElementsByTagName('head')[0];
    (h || document.body).appendChild(s);
  }catch(e){}
};

PF.build = function(){
  if(typeof document === 'undefined') return false;
  PF.css();
  var old = document.getElementById('profileOv');
  if(old && old.parentNode && old.parentNode.removeChild) old.parentNode.removeChild(old);
  var stage = document.getElementById('stage') || document.body;
  if(!stage || !stage.appendChild) return false;

  var d = PF.load();
  var baby = PF.baby();
  var towns = PF.towns();
  var armor = PF.armor();
  var rank = PF.rank();
  var total = d.wins + d.losses;
  var rate = total > 0 ? Math.round(d.wins / total * 100) + '%' : '—';
  var since = '';
  try{
    if(d.since) since = new Date(d.since).toLocaleDateString();
  }catch(e){}

  var ov = document.createElement('div');
  ov.id = 'profileOv';

  /* header: avatar + name + rank */
  var head = document.createElement('div');
  head.className = 'pf-card';
  head.style.textAlign = 'center';
  var cv = document.createElement('canvas');
  cv.width = 96; cv.height = 96;
  cv.style.cssText = 'width:96px;height:96px;';
  head.appendChild(cv);
  var nm = document.createElement('div');
  nm.style.cssText = 'color:#ffd76a;font:900 20px system-ui;margin-top:6px;cursor:pointer;';
  var shown = d.name || baby.name || 'Trainee';
  nm.textContent = '✏️ ' + shown;
  if(nm.addEventListener) nm.addEventListener('click', function(){
    try{
      var cur = PF.load().name || '';
      var next = window.prompt('Your trainee name:', cur);
      if(next !== null){
        next = String(next).slice(0, 24);
        PF.load().name = next;
        PF.save();
        PF.build(); PF.open();
      }
    }catch(e){}
  });
  head.appendChild(nm);
  var rk = document.createElement('div');
  rk.style.cssText = 'color:#7dff9a;font:800 13px system-ui;letter-spacing:1px;margin-top:4px;';
  rk.textContent = rank.icon + ' ' + rank.title.toUpperCase();
  head.appendChild(rk);
  var bb = document.createElement('div');
  bb.style.cssText = 'color:#c98a5a;font:600 12px system-ui;margin-top:4px;';
  bb.textContent = '🔥 ' + baby.name + (baby.cls && baby.cls !== '—' ? ' · ' + baby.cls : '') +
    (since ? ' · playing since ' + since : '');
  head.appendChild(bb);
  ov.appendChild(head);
  PF.drawAvatar(cv, baby);

  /* battle stats */
  var st = document.createElement('div');
  st.className = 'pf-card';
  st.innerHTML = '<h3>⚔️ BATTLE RECORD</h3>';
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:6px;';
  var stats = [
    /* Consistency fix (2026-10-03): a fresh profile with no battles yet
       shows em-dashes, not zeros — "0 WINS / 0 LOSSES" next to "No baby
       yet" looked like seeded demo data. Real numbers appear after the
       first recorded battle. */
    [total > 0 ? String(d.wins) : '—', 'WINS'],
    [total > 0 ? String(d.losses) : '—', 'LOSSES'],
    [rate, 'WIN RATE']
  ];
  stats.forEach(function(sv){
    var c = document.createElement('div');
    c.className = 'pf-stat';
    var bEl = document.createElement('b'); bEl.textContent = sv[0];
    var sEl = document.createElement('span'); sEl.textContent = sv[1];
    c.appendChild(bEl); c.appendChild(sEl);
    row.appendChild(c);
  });
  st.appendChild(row);
  ov.appendChild(st);

  /* story progress */
  var sm = document.createElement('div');
  sm.className = 'pf-card';
  var pips = '';
  for(var k = 0; k < 6; k++) pips += (k < towns.length ? '●' : '○');
  sm.innerHTML = '<h3>🗺️ TOWNS LIBERATED — ' + towns.length + '/6</h3>' +
    '<div style="color:#ffd76a;font-size:14px;letter-spacing:3px;margin-bottom:6px">' + pips + '</div>' +
    (towns.length
      ? '<div style="color:#ffe9d6;font:600 12px/1.8 system-ui">' +
        towns.map(function(t){ return '✅ ' + PF.esc(t); }).join('<br>') + '</div>'
      : '<div style="color:#c98a5a;font:600 12px system-ui">No towns yet — open 🗺️ Story Mode and start with Ember Village!</div>');
  ov.appendChild(sm);

  /* armor collection */
  var am = document.createElement('div');
  am.className = 'pf-card';
  var mixHtml = '';
  var keys = Object.keys(armor.mix);
  if(keys.length){
    mixHtml = keys.map(function(r){
      return '<span style="display:inline-block;background:rgba(255,150,60,.15);border:1px solid rgba(255,150,60,.4);' +
        'border-radius:10px;padding:3px 10px;margin:2px;color:#ffe9d6;font:700 11px system-ui">' +
        PF.esc(r) + ' ×' + armor.mix[r] + '</span>';
    }).join(' ');
  } else {
    mixHtml = '<div style="color:#c98a5a;font:600 12px system-ui">No armor yet — forge it in the ARMORY or redeem a keychain code!</div>';
  }
  am.innerHTML = '<h3>🛡️ ARMOR COLLECTION — ' + armor.count + '</h3>' + mixHtml;
  ov.appendChild(am);

  var foot = document.createElement('div');
  foot.style.cssText = 'padding:10px 18px 22px;text-align:center;';
  var close = document.createElement('button');
  close.textContent = 'CLOSE';
  close.style.cssText = 'background:#ff5d2e;color:#fff;border:none;border-radius:20px;' +
    'font:800 13px system-ui;padding:10px 26px;cursor:pointer;';
  if(close.addEventListener) close.addEventListener('click', function(){ PF.close(); });
  foot.appendChild(close);
  ov.appendChild(foot);

  stage.appendChild(ov);
  PF.ov = ov;
  return true;
};

PF.open = function(){
  if(!PF.build()) return;
  PF.ov.style.display = 'flex';
};
PF.close = function(){
  var ov = PF.ov || (typeof document !== 'undefined' && document.getElementById('profileOv'));
  if(ov) ov.style.display = 'none';
};

PF.ensureBtn();
/* title screen may build after patches load — retry injection briefly */
if(typeof window !== 'undefined' && typeof window.setInterval !== 'undefined'){
  var __pf_tries = 0;
  var __pf_timer = window.setInterval(function(){
    __pf_tries++;
    try{ PF.injectTitleBtn(); }catch(e){}
    try{
      if(document.getElementById('titleProfile') || __pf_tries > 20){
        window.clearInterval(__pf_timer);
      }
    }catch(e){ window.clearInterval(__pf_timer); }
  }, 500);
}

if(typeof window !== 'undefined'){
  window.__PROFILE_DEBUG = {
    load: PF.load, recordResult: PF.recordResult, rank: PF.rank,
    towns: PF.towns, armor: PF.armor, baby: PF.baby,
    build: PF.build, open: PF.open, drawAvatar: PF.drawAvatar, RANKS: PF.RANKS
  };
}

})();
