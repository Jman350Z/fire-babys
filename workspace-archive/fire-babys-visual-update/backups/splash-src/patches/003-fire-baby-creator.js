/* =====================================================================
   PATCH 003 — fire-baby-creator
   Date: 2026-09-30 | For: Jeff (Fire Babys)
   What it changes (three jobs, one file):
     A) RUKO IS THE LEADER — codex + bio updated: Ruko "The Leader".
     B) UNLOCK SYSTEM — the 6 original babys unlock as you climb stages
        (Ruko + Blaze at start, Boulder @3, Sizzle @5, Cinder @8,
        Lord Inferno @12). Locked babys show as ??? in the codex.
        Every unlocked baby grants the whole army +2% damage (max +12%).
     C) BUILD-A-BABY CREATOR — full character creator (🎨 HUD button):
        name your baby, pick flame color, eyes, brows, mouth, headgear,
        torso gear, weapon, class (Archer/Knight/Heavy/Wizard/Strongman/
        Ogre), special move, and spend 12 attribute points. Save up to 6
        babies, equip one as YOUR hero in battle — it renders with the
        game's own painters and fights with its class stats + special.
        ~9.6 MILLION possible combos before attributes.
   Touches: window.__FB_BIOS (Ruko bio), Game.checkEnd (unlock check),
     spawnUnit (squad blessing), spawnHero (custom hero equip),
     drawBabyEyes/drawBabyExtras (custom face + gear painters),
     DOM: #creatorBtn, #creatorOv + CSS. Baseline untouched.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: win stages — watch unlock toasts. Tap 🎨 — build a baby, equip it,
     start a battle — your custom baby is the hero you drive.
   NOTE: this file is MEANT to grow. New heads, weapons, classes, specials:
     add one entry to the tables in section 4 and one painter in section 5.
     Nothing else needs to change.
   ===================================================================== */
(function(){
'use strict';

/* =====================================================================
   SECTION 1 — RUKO IS THE LEADER
   ===================================================================== */
if(window.__FB_BIOS && window.__FB_BIOS.brawler){
  var __rb = window.__FB_BIOS.brawler;
  __rb.title = 'The Leader';
  __rb.attitude = '"Follow me — I\'m already on fire."';
  __rb.desc = 'A compact fireball of pure temper and the undisputed leader of the Fire Babys. ' +
    'His fists ignite before his brain catches up, and he has never — not once — walked away from a fight. ' +
    'The squad would follow him into a volcano. They have. Twice.';
  __rb.stats = 'Leader · Brawler · Fast melee · Loves the front line';
}
if(window.__FB_BIOS && window.__FB_BIOS.hero){
  /* Blaze is still a star — but the player can now drive their own baby too */
  window.__FB_BIOS.hero.desc = 'The star-crowned hero, born from the first spark of the Eternal Flame. ' +
    'Drive him with the joystick — or build your OWN fire baby in the Creator (🎨) and drive that instead.';
}

/* =====================================================================
   SECTION 2 — UNLOCK SYSTEM (the original 6)
   ===================================================================== */
var UNLOCK_DEFS = [
  { key:'brawler',  stage:1  },
  { key:'hero',     stage:1  },
  { key:'guardian', stage:3  },
  { key:'archer',   stage:5  },
  { key:'pyro',     stage:8  },
  { key:'boss',     stage:12 }
];
var CODEX_ORDER = ['brawler','hero','guardian','archer','pyro','boss'];

/* ---- creator save store (own key — never touches SaveSys) ---- */
var STORE_KEY = 'fireBabysCreatorV1';
function __fb3_loadStore(){
  var d = { unlocked:{ brawler:1, hero:1 }, customs:[], equipped:null };
  try{
    if(typeof localStorage === 'undefined') return d;
    var raw = localStorage.getItem(STORE_KEY);
    if(raw){
      var p = JSON.parse(raw);
      if(p && typeof p === 'object'){
        if(p.unlocked && typeof p.unlocked === 'object') d.unlocked = p.unlocked;
        if(p.customs && p.customs instanceof Array) d.customs = p.customs;
        if(typeof p.equipped === 'string' || p.equipped === null) d.equipped = p.equipped;
      }
    }
  }catch(e){}
  if(!d.unlocked.brawler) d.unlocked.brawler = 1;
  if(!d.unlocked.hero) d.unlocked.hero = 1;
  return d;
}
function __fb3_saveStore(){
  try{
    if(typeof localStorage === 'undefined') return;
    localStorage.setItem(STORE_KEY, JSON.stringify(__FB3));
  }catch(e){}
}
var __FB3 = __fb3_loadStore();
window.__FB3 = __FB3;

function __fb3_unlockedCount(){
  var n = 0, i;
  for(i = 0; i < UNLOCK_DEFS.length; i++) if(__FB3.unlocked[UNLOCK_DEFS[i].key]) n++;
  return n;
}
function __fb3_bioName(key){
  if(window.__FB_BIOS && window.__FB_BIOS[key]) return window.__FB_BIOS[key].name;
  return key;
}

/* check stage thresholds, toast new unlocks, persist */
function __fb3_checkUnlocks(){
  if(typeof SaveSys === 'undefined') return;
  var stage = SaveSys.data.stage || 1, i, def, changed = false;
  for(i = 0; i < UNLOCK_DEFS.length; i++){
    def = UNLOCK_DEFS[i];
    if(!__FB3.unlocked[def.key] && stage >= def.stage){
      __FB3.unlocked[def.key] = 1;
      changed = true;
      var nm = __fb3_bioName(def.key);
      try{ if(typeof UI !== 'undefined') UI.hint('🔥 ' + nm + ' UNLOCKED! Squad blessing: +' + (2 * __fb3_unlockedCount()) + '% damage'); }catch(e){}
      try{ if(window.AudioSys) AudioSys.ui(); }catch(e){}
    }
  }
  if(changed){ __fb3_saveStore(); __fb3_refreshCodex(); }
}

/* hook victory: unlock check runs right after the stage is banked */
if(typeof Game !== 'undefined' && Game.checkEnd){
  var __fb3_origCheckEnd = Game.checkEnd;
  Game.checkEnd = function(){
    var wasWon = this.won;
    __fb3_origCheckEnd.apply(this, arguments);
    if(this.won && !wasWon) __fb3_checkUnlocks();
  };
}

/* squad blessing: every unlocked baby = +2% damage for YOUR army */
if(typeof spawnUnit !== 'undefined'){
  var __fb3_origSpawnUnit = spawnUnit;
  spawnUnit = function(side, key, tier, x, y, hpMult, isHero){
    var idx = __fb3_origSpawnUnit(side, key, tier, x, y, hpMult, isHero);
    if(idx >= 0 && side === 0 && typeof units !== 'undefined' && units[idx]){
      var n = __fb3_unlockedCount();
      if(n > 1) units[idx].dmg *= (1 + 0.02 * (n - 1));
    }
    return idx;
  };
}

/* ---- codex lock refresh (runs on open + after unlocks) ---- */
function __fb3_refreshCodex(){
  try{
    var ov = document.getElementById('codexOv');
    if(!ov || !window.__FB_BIOS) return;
    var cards = ov.querySelector('#codexCards');
    if(!cards || !cards.children) return;
    for(var i = 0; i < CODEX_ORDER.length && i < cards.children.length; i++){
      (function(key, card){
        var b = window.__FB_BIOS[key];
        var body = null;
        /* find .cx-body child */
        var j, ch;
        for(j = 0; j < card.children.length; j++){
          ch = card.children[j];
          if(ch.className === 'cx-body'){ body = ch; break; }
        }
        if(!body || !b) return;
        if(__FB3.unlocked[key]){
          card.classList.remove('cx-locked');
          body.innerHTML =
            '<div class="cx-name">' + b.name + '</div>' +
            '<div class="cx-title">' + b.title + '</div>' +
            '<p class="cx-att">' + b.attitude + '</p>' +
            '<div class="cx-sec">SCOUTING REPORT</div>' +
            '<p class="cx-txt">' + b.desc + '</p>' +
            '<div class="cx-sec">BACKSTORY</div>' +
            '<p class="cx-txt">' + b.backstory + '</p>' +
            '<div class="cx-sec">SPECIAL MOVE</div>' +
            '<p class="cx-txt"><span class="cx-spec">🔥 ' + b.special + '</span> — ' + b.specialDesc + '</p>' +
            '<div class="cx-stats">' + b.stats + '</div>';
        } else {
          var need = 1, k;
          for(k = 0; k < UNLOCK_DEFS.length; k++) if(UNLOCK_DEFS[k].key === key) need = UNLOCK_DEFS[k].stage;
          card.classList.add('cx-locked');
          body.innerHTML =
            '<div class="cx-name">???</div>' +
            '<div class="cx-title">LOCKED</div>' +
            '<p class="cx-att">"Who could it be..."</p>' +
            '<div class="cx-txt">Reach <b>Stage ' + need + '</b> to unlock this baby and grow your squad blessing.</div>';
        }
      })(CODEX_ORDER[i], cards.children[i]);
    }
    var sub = ov.querySelector('#codexSub');
    if(sub) sub.textContent = 'Every warrior. Every attitude. Squad blessing: +' +
      (2 * (__fb3_unlockedCount() - 1)) + '% damage (' + __fb3_unlockedCount() + '/6 unlocked).';
  }catch(e){}
}

/* locked-card dim style */
(function(){
  try{
    var css = document.createElement('style');
    css.textContent = '.cx-locked{opacity:.75}.cx-locked canvas{filter:brightness(.22) saturate(.6)}';
    document.head.appendChild(css);
  }catch(e){}
})();

/* refresh locks every time the codex opens (stacks with patch 002's handler) */
function __fb3_hookCodexBtn(){
  try{
    var btn = document.getElementById('codexBtn');
    if(btn && !btn.__fb3hooked){
      btn.__fb3hooked = true;
      btn.addEventListener('click', function(){ setTimeout(__fb3_refreshCodex, 30); });
    }
  }catch(e){}
}

/* =====================================================================
   SECTION 3 — THE SPEC (what a custom baby IS)
   A spec is a plain object. Everything the game needs to draw + fight it.
   ===================================================================== */
var __fb3_uid = 1;
function __fb3_freshSpec(){
  return {
    id: 'bb' + Date.now().toString(36) + (__fb3_uid++),
    name: 'Ember',
    body: 'inferno',   // palette id
    eyes: 'classic', brows: 'angryV', mouth: 'grit',
    head: 'none', torso: 'none', weapon: 'none',
    cls: 'knight', special: 'fistflurry',
    pow: 4, spd: 4, tuf: 4,   // 12 attribute points
    created: Date.now()
  };
}

/* =====================================================================
   SECTION 4 — OPTION TABLES  ★ ADD NEW CONTENT HERE ★
   To add a new head/weapon/class/special: add ONE row below + ONE painter
   in section 5 (heads/torsos/weapons) — the UI, preview, saves, and
   battle integration pick it up automatically. That's the whole job.
   ===================================================================== */

/* ---- flame palettes: body / dark spikes / core ---- */
var FB3_PALETTES = [
  { id:'inferno', name:'Inferno', body:'#ff8c2e', dark:'#a33d00', core:'#ffd76a' },
  { id:'crimson', name:'Crimson', body:'#e8352c', dark:'#7c0e04', core:'#ffb347' },
  { id:'azure',   name:'Azure',   body:'#3ca9ff', dark:'#0b3d7c', core:'#d6f1ff' },
  { id:'violet',  name:'Violet',  body:'#9a4dff', dark:'#3d0b7c', core:'#e6ccff' },
  { id:'emerald', name:'Emerald', body:'#2ee86a', dark:'#0b6e2e', core:'#d2ffe0' },
  { id:'golden',  name:'Golden',  body:'#ffc93c', dark:'#8f5a00', core:'#fff7c0' },
  { id:'shadow',  name:'Shadow',  body:'#5a4a6a', dark:'#1c1026', core:'#b48aff' },
  { id:'frost',   name:'Frost',   body:'#aee9ff', dark:'#2e6e8f', core:'#ffffff' },
  { id:'magma',   name:'Magma',   body:'#ff5a1e', dark:'#4d0e00', core:'#ffe08a' },
  { id:'rose',    name:'Rose',    body:'#ff6a9a', dark:'#8f1e44', core:'#ffd6e6' }
];
function __fb3_pal(id){
  for(var i = 0; i < FB3_PALETTES.length; i++) if(FB3_PALETTES[i].id === id) return FB3_PALETTES[i];
  return FB3_PALETTES[0];
}

/* ---- faces ---- */
var FB3_EYES = [
  { id:'classic',  name:'Classic' },
  { id:'narrowed', name:'Narrowed' },
  { id:'wide',     name:'Wide' },
  { id:'sleepy',   name:'Sleepy' }
];
var FB3_BROWS = [
  { id:'angryV', name:'Angry V' },
  { id:'slab',   name:'Slab' },
  { id:'raised', name:'Rebel' }
];
var FB3_MOUTHS = [
  { id:'grit',   name:'Gritted' },
  { id:'smirk',  name:'Smirk' },
  { id:'fangs',  name:'Fangs' },
  { id:'roar',   name:'Roar' },
  { id:'flat',   name:'Flat' }
];

/* ---- gear ---- */
var FB3_HEADS = [
  { id:'none',     name:'None' },
  { id:'headband', name:'Headband' },
  { id:'crown',    name:'Star Crown' },
  { id:'horns',    name:'Horns' },
  { id:'wizhat',   name:'Wizard Hat' },
  { id:'knighthelm', name:'Knight Helm' },
  { id:'mohawk',   name:'Mohawk' },
  { id:'bandana',  name:'Bandana' }
];
var FB3_TORSOS = [
  { id:'none',       name:'None' },
  { id:'rockplates', name:'Rock Plates' },
  { id:'steelarmor', name:'Steel Armor' },
  { id:'cape',       name:'Cape' },
  { id:'spikes',     name:'Spiked Pads' },
  { id:'sash',       name:'Sash' }
];
var FB3_WEAPONS = [
  { id:'none',   name:'None' },
  { id:'bow',    name:'Bow' },
  { id:'sword',  name:'Sword' },
  { id:'staff',  name:'Staff' },
  { id:'hammer', name:'Hammer' },
  { id:'shield', name:'Shield' },
  { id:'daggers',name:'Daggers' }
];

/* ---- classes: who your baby IS in a fight ----
   mods: hp/dmg/range/moveSpeed multipliers, armor/crit adds, atkCd mult, size mult */
var FB3_CLASSES = [
  { id:'archer', name:'Archer',
    desc:'Rain fire from far away. Never misses twice.',
    mods:{ hp:0.85, dmg:1.10, range:1.5, moveSpeed:1.10, crit:0.10 }, special:'sparkvolley' },
  { id:'knight', name:'Knight',
    desc:'Oathbound front-line duelist. Holds the line, takes the hits.',
    mods:{ hp:1.40, dmg:1.10, armor:3 }, special:'magmataunt' },
  { id:'heavy', name:'Heavy',
    desc:'A walking siege engine. Slow, unstoppable.',
    mods:{ hp:1.80, dmg:1.30, moveSpeed:0.80, armor:2 }, special:'cataclysm' },
  { id:'wizard', name:'Wizard',
    desc:'Bends the flame itself. Squishy. Terrifying.',
    mods:{ hp:0.70, dmg:1.40, range:1.3, atkCd:1.15 }, special:'meteordrop' },
  { id:'strongman', name:'Strongman',
    desc:'Lifts castles. Throws castles.',
    mods:{ hp:1.20, dmg:1.60, moveSpeed:0.95 }, special:'fistflurry' },
  { id:'ogre', name:'Ogre',
    desc:'Big. Angry. Bigger angry.',
    mods:{ hp:2.00, dmg:1.20, armor:4, moveSpeed:0.75, size:1.15 }, special:'cataclysm' }
];
function __fb3_cls(id){
  for(var i = 0; i < FB3_CLASSES.length; i++) if(FB3_CLASSES[i].id === id) return FB3_CLASSES[i];
  return FB3_CLASSES[1];
}

/* ---- special moves: kind maps to the game's real skill engine ----
   (firenova is the hero NOVA button — always available, pick the auto-cast skill) */
var FB3_SPECIALS = [
  { id:'firenova',   name:'Fire Nova',     kind:'nova',   desc:'The big ring of starfire. (Your NOVA button — always ready.)' },
  { id:'fistflurry', name:'Fist Flurry',   kind:'flurry', desc:'A blur of burning punches. Classic Ruko energy.' },
  { id:'sparkvolley',name:'Spark Volley',  kind:'volley', desc:'A fan of flaming arrows. Sizzle would be proud.' },
  { id:'magmataunt', name:'Magma Taunt',   kind:'taunt',  desc:'Roar and pull every enemy onto YOU. Boulder-style.' },
  { id:'meteordrop', name:'Meteor Drop',   kind:'meteor', desc:'Point at the sky. A burning rock answers. Cinder-approved.' },
  { id:'cataclysm',  name:'Cataclysm Slam',kind:'slam',   desc:'Hit the ground. Break the ground. Boss move.' },
  { id:'emberdash',  name:'Ember Dash',    kind:'flurry', desc:'A blazing charge straight through the enemy line.' },
  { id:'flameshield',name:'Flame Shield',  kind:'taunt',  desc:'A ring of fire that dares enemies to come closer.' }
];
function __fb3_spc(id){
  for(var i = 0; i < FB3_SPECIALS.length; i++) if(FB3_SPECIALS[i].id === id) return FB3_SPECIALS[i];
  return FB3_SPECIALS[1];
}

/* ---- attributes: 12 points, spend them how you like ---- */
var FB3_ATTRS = [
  { id:'pow', name:'Power', desc:'+8% damage each' },
  { id:'spd', name:'Swift', desc:'+6% move speed each' },
  { id:'tuf', name:'Tough', desc:'+12% health each' }
];
var FB3_ATTR_POINTS = 12;
var FB3_RANDOM_NAMES = ['Ember','Soot','Kindle','Flint','Ash','Scorch','Torch','Spark','Char','Blaze Jr','Cinder Jr','Pyro','Flicker','Coal'];

/* how many combos? (for the brag line in the UI) */
function __fb3_comboCount(){
  return FB3_PALETTES.length * FB3_EYES.length * FB3_BROWS.length * FB3_MOUTHS.length *
         FB3_HEADS.length * FB3_TORSOS.length * FB3_WEAPONS.length *
         FB3_CLASSES.length * FB3_SPECIALS.length;
}

/* =====================================================================
   SECTION 5 — PAINTERS  ★ ADD NEW GEAR PAINTERS HERE ★
   Every painter takes (p, spec, s, t, fx): canvas ctx, baby spec,
   body radius, time, facing (-1/1). Same painter draws the creator
   preview AND the in-battle hero — one source of truth.
   ===================================================================== */
function __fb3_rr(p, x, y, w, h, r){
  p.beginPath();
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r);
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r);
  p.quadraticCurveTo(x, y, x + r, y);
  p.closePath();
}
function __fb3_star(p, cx, cy, r){
  var k, a;
  p.beginPath();
  for(k = 0; k < 10; k++){
    a = -Math.PI / 2 + k * Math.PI / 5;
    var rr = (k % 2 === 0) ? r : r * 0.45;
    var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    if(k === 0) p.moveTo(x, y); else p.lineTo(x, y);
  }
  p.closePath();
}

/* ---------------- FACE ---------------- */
function __fb3_paintFace(p, spec, s, fx){
  var er = s * 0.26, ex = fx * s * 0.06, ey = -s * 0.06, i, cx, k, tx;
  p.lineCap = 'round';
  /* brows */
  p.fillStyle = '#200a02';
  if(spec.brows === 'slab'){
    __fb3_rr(p, ex - s * 0.78, ey - er * 2.35, s * 1.56, er * 0.72, er * 0.36); p.fill();
  } else if(spec.brows === 'raised'){
    p.save(); p.translate(ex - s * 0.32, ey - er * 2.55); p.rotate(-0.12);
    __fb3_rr(p, -er * 1.0, -er * 0.36, er * 2.0, er * 0.72, er * 0.36); p.fill(); p.restore();
    p.save(); p.translate(ex + s * 0.32, ey - er * 1.85); p.rotate(0.38);
    __fb3_rr(p, -er * 1.0, -er * 0.36, er * 2.0, er * 0.72, er * 0.36); p.fill(); p.restore();
  } else { /* angryV */
    for(i = -1; i <= 1; i += 2){
      cx = ex + i * s * 0.30;
      p.save(); p.translate(cx + fx * i * er * 0.35, ey - er * 1.85); p.rotate(i * -0.42 - fx * 0.10);
      __fb3_rr(p, -er * 1.05, -er * 0.38, er * 2.1, er * 0.76, er * 0.38); p.fill(); p.restore();
    }
  }
  /* eyes */
  var eyeH = 0.88, eyeY = ey, eyeW = 1;
  if(spec.eyes === 'narrowed'){ eyeH = 0.5; }
  else if(spec.eyes === 'wide'){ eyeH = 1.05; eyeW = 1.1; eyeY = ey - er * 0.25; }
  else if(spec.eyes === 'sleepy'){ eyeH = 0.55; }
  p.fillStyle = '#ffffff';
  for(i = -1; i <= 1; i += 2){
    cx = ex + i * s * 0.30;
    p.beginPath(); p.ellipse(cx, eyeY, er * eyeW, er * eyeH, 0, 0, 6.2832); p.fill();
  }
  if(spec.eyes === 'narrowed' || spec.eyes === 'sleepy'){
    p.fillStyle = '#200a02'; /* heavy lid */
    for(i = -1; i <= 1; i += 2){
      cx = ex + i * s * 0.30;
      p.fillRect(cx - er * 1.05, eyeY - er * eyeH - er * 0.12, er * 2.1, er * 0.8);
    }
  }
  for(i = -1; i <= 1; i += 2){
    cx = ex + i * s * 0.30;
    var px = cx + fx * er * 0.42, py = eyeY + er * 0.10;
    var pr = er * (spec.eyes === 'wide' ? 0.42 : 0.52);
    p.fillStyle = '#e8120c'; p.beginPath(); p.arc(px, py, pr, 0, 6.2832); p.fill();
    p.fillStyle = '#140402'; p.beginPath(); p.arc(px, py, pr * 0.65, 0, 6.2832); p.fill();
    p.fillStyle = '#ffffff'; p.beginPath(); p.arc(px - pr * 0.23, py - pr * 0.27, pr * 0.21, 0, 6.2832); p.fill();
  }
  /* mouths — never beaks. Fire babys have MOUTHS. */
  var my = ey + er * 2.05, mw = er * 1.25, mh = er * 0.66;
  if(spec.mouth === 'smirk'){
    p.strokeStyle = '#3a0d05'; p.lineWidth = Math.max(2.5, er * 0.34);
    p.beginPath();
    p.moveTo(ex - fx * mw, my + mh * 0.35);
    p.quadraticCurveTo(ex + fx * mw * 0.25, my + mh * 0.15, ex + fx * mw * 1.05, my - mh * 0.55);
    p.stroke();
  } else if(spec.mouth === 'fangs'){
    p.fillStyle = '#3a0d05';
    p.beginPath(); p.ellipse(ex, my, mw * 1.0, mh * 0.9, 0, 0, 6.2832); p.fill();
    p.fillStyle = '#ffffff';
    for(k = -1; k <= 1; k += 2){
      tx = ex + k * mw * 0.5;
      p.beginPath();
      p.moveTo(tx - mw * 0.2, my - mh * 0.7); p.lineTo(tx + mw * 0.2, my - mh * 0.7);
      p.lineTo(tx, my - mh * 0.7 + mh * 0.75); p.closePath(); p.fill();
    }
  } else if(spec.mouth === 'roar'){
    p.fillStyle = '#2a0802';
    p.beginPath(); p.ellipse(ex, my + mh * 0.2, mw * 1.15, mh * 1.1, 0, 0, 6.2832); p.fill();
    p.fillStyle = '#ff7a1e';
    p.beginPath(); p.ellipse(ex, my + mh * 0.45, mw * 0.75, mh * 0.6, 0, 0, 6.2832); p.fill();
  } else if(spec.mouth === 'flat'){
    p.strokeStyle = '#3a0d05'; p.lineWidth = Math.max(2.5, er * 0.3);
    p.beginPath(); p.moveTo(ex - mw * 0.9, my); p.lineTo(ex + mw * 0.9, my); p.stroke();
  } else { /* grit */
    p.fillStyle = '#ffffff';
    __fb3_rr(p, ex - mw, my - mh * 0.55, mw * 2, mh * 1.1, mh * 0.4); p.fill();
    p.strokeStyle = '#3a0d05'; p.lineWidth = Math.max(2, er * 0.24); p.stroke();
    p.lineWidth = Math.max(1.2, er * 0.13);
    for(k = -2; k <= 2; k++){
      tx = ex + k * mw * 0.4;
      p.beginPath(); p.moveTo(tx, my - mh * 0.55); p.lineTo(tx, my + mh * 0.55); p.stroke();
    }
    p.beginPath(); p.moveTo(ex - mw, my); p.lineTo(ex + mw, my); p.stroke();
  }
}

/* ---------------- HEADGEAR ---------------- */
function __fb3_paintHead(p, spec, s, t, fx){
  var k;
  if(spec.head === 'headband'){
    p.fillStyle = '#c81e1e';
    p.fillRect(-s * 0.78, -s * 0.86, s * 1.56, s * 0.26);
    p.strokeStyle = '#7a0d0d'; p.lineWidth = 2;
    p.strokeRect(-s * 0.78, -s * 0.86, s * 1.56, s * 0.26);
    var sway = Math.sin(t * 6) * s * 0.08;
    p.strokeStyle = '#c81e1e'; p.lineWidth = s * 0.12; p.lineCap = 'round';
    p.beginPath();
    p.moveTo(-fx * s * 0.78, -s * 0.73);
    p.quadraticCurveTo(-fx * s * 1.15, -s * 0.55 + sway, -fx * s * 1.05, -s * 0.25 + sway);
    p.stroke();
  } else if(spec.head === 'bandana'){
    p.fillStyle = '#2e4a8f';
    p.fillRect(-s * 0.8, -s * 0.88, s * 1.6, s * 0.3);
    p.fillStyle = '#1c2f5e';
    p.beginPath(); p.arc(fx * s * 0.85, -s * 0.72, s * 0.16, 0, 6.2832); p.fill();
    var sw2 = Math.sin(t * 7 + 1) * s * 0.08;
    p.strokeStyle = '#2e4a8f'; p.lineWidth = s * 0.1; p.lineCap = 'round';
    p.beginPath(); p.moveTo(fx * s * 0.9, -s * 0.65);
    p.quadraticCurveTo(fx * s * 1.2, -s * 0.4 + sw2, fx * s * 1.1, -s * 0.1 + sw2); p.stroke();
  } else if(spec.head === 'crown'){
    p.fillStyle = '#e8a91e';
    p.fillRect(-s * 0.62, -s * 0.98, s * 1.24, s * 0.3);
    p.beginPath();
    p.moveTo(-s * 0.62, -s * 0.98); p.lineTo(-s * 0.45, -s * 1.5); p.lineTo(-s * 0.28, -s * 0.98);
    p.lineTo(0, -s * 1.62); p.lineTo(s * 0.28, -s * 0.98);
    p.lineTo(s * 0.45, -s * 1.5); p.lineTo(s * 0.62, -s * 0.98);
    p.closePath(); p.fill();
    p.strokeStyle = '#8f5a00'; p.lineWidth = 2; p.stroke();
    __fb3_star(p, 0, -s * 1.3, s * 0.24);
    p.fillStyle = '#fff7c0'; p.fill();
    p.strokeStyle = '#ff9d3c'; p.lineWidth = 1.6; p.stroke();
  } else if(spec.head === 'horns'){
    p.strokeStyle = '#3a2410'; p.lineWidth = s * 0.22; p.lineCap = 'round';
    for(k = -1; k <= 1; k += 2){
      p.beginPath();
      p.moveTo(k * s * 0.55, -s * 0.7);
      p.quadraticCurveTo(k * s * 0.95, -s * 1.05, k * s * 0.8, -s * 1.45);
      p.stroke();
    }
    p.fillStyle = '#ffe9c0';
    p.beginPath(); p.arc(-s * 0.8, -s * 1.45, s * 0.09, 0, 6.2832); p.fill();
    p.beginPath(); p.arc(s * 0.8, -s * 1.45, s * 0.09, 0, 6.2832); p.fill();
  } else if(spec.head === 'wizhat'){
    var wob = Math.sin(t * 4) * s * 0.05;
    p.fillStyle = '#4a2e8f';
    p.beginPath();
    p.moveTo(-s * 0.7, -s * 0.75);
    p.quadraticCurveTo(-s * 0.2 + wob, -s * 1.7, s * 0.15 + wob, -s * 2.0);
    p.quadraticCurveTo(s * 0.35 + wob, -s * 1.5, s * 0.7, -s * 0.75);
    p.closePath(); p.fill();
    p.fillStyle = '#2e1a5e';
    p.beginPath(); p.ellipse(0, -s * 0.75, s * 0.85, s * 0.18, 0, 0, 6.2832); p.fill();
    p.fillStyle = '#ffd76a';
    p.beginPath(); p.arc(-s * 0.15 + wob * 0.5, -s * 1.25, s * 0.08, 0, 6.2832); p.fill();
    p.beginPath(); p.arc(s * 0.2 + wob * 0.5, -s * 1.05, s * 0.06, 0, 6.2832); p.fill();
  } else if(spec.head === 'knighthelm'){
    p.fillStyle = '#9aa4b5';
    p.beginPath(); p.arc(0, -s * 0.55, s * 0.78, Math.PI, 0); p.fill();
    p.strokeStyle = '#5e6675'; p.lineWidth = 2; p.stroke();
    p.fillStyle = '#3a3f4a';
    p.fillRect(-s * 0.6, -s * 0.72, s * 1.2, s * 0.14);
    var pw = Math.sin(t * 8) * s * 0.06;
    p.strokeStyle = '#c81e1e'; p.lineWidth = s * 0.16; p.lineCap = 'round';
    p.beginPath(); p.moveTo(0, -s * 1.3);
    p.quadraticCurveTo(pw, -s * 1.7, -pw, -s * 2.0); p.stroke();
  } else if(spec.head === 'mohawk'){
    var fl = 1 + Math.sin(t * 12) * 0.12;
    for(k = -1; k <= 1; k++){
      var bx = k * s * 0.3, hh = s * (1.5 + 0.25 * Math.sin(t * 12 + k)) * fl;
      p.fillStyle = '#e8352c';
      p.beginPath(); p.moveTo(bx - s * 0.2, -s * 0.6); p.lineTo(bx + s * 0.2, -s * 0.6);
      p.lineTo(bx + Math.sin(t * 9 + k * 2) * s * 0.08, -hh); p.closePath(); p.fill();
      p.fillStyle = '#ffd76a';
      p.beginPath(); p.moveTo(bx - s * 0.1, -s * 0.6); p.lineTo(bx + s * 0.1, -s * 0.6);
      p.lineTo(bx, -hh * 0.7); p.closePath(); p.fill();
    }
  }
}

/* ---------------- TORSO (cape goes BEHIND the body) ---------------- */
function __fb3_paintBack(p, spec, s, t, fx){
  if(spec.torso !== 'cape') return;
  var wv = Math.sin(t * 5) * s * 0.12;
  p.fillStyle = '#a31212';
  p.beginPath();
  p.moveTo(-fx * s * 0.7, -s * 0.2);
  p.quadraticCurveTo(-fx * s * 1.6, s * 0.3 + wv, -fx * s * 1.3, s * 1.2 + wv);
  p.quadraticCurveTo(-fx * s * 0.6, s * 0.9, -fx * s * 0.5, s * 0.4);
  p.closePath(); p.fill();
  p.strokeStyle = '#6e0b0b'; p.lineWidth = 2; p.stroke();
}
function __fb3_paintTorso(p, spec, s, t, fx){
  var k, a, j, sx, sy;
  if(spec.torso === 'rockplates'){
    p.fillStyle = '#241408';
    for(k = 0; k < 5; k++){
      a = k * 1.256 + 0.5;
      p.beginPath(); p.arc(Math.cos(a) * s * 0.85, Math.sin(a) * s * 0.85 + s * 0.1, s * 0.28, 0, 6.2832); p.fill();
    }
    p.strokeStyle = '#ffcf5e'; p.lineWidth = 2;
    p.beginPath();
    p.moveTo(-s * 0.3, s * 0.4); p.lineTo(-s * 0.05, s * 0.15); p.lineTo(-s * 0.25, -s * 0.1);
    p.stroke();
  } else if(spec.torso === 'steelarmor'){
    p.fillStyle = '#8f9aa8';
    __fb3_rr(p, -s * 0.55, s * 0.05, s * 1.1, s * 0.62, s * 0.2); p.fill();
    p.strokeStyle = '#5e6675'; p.lineWidth = 2; p.stroke();
    p.fillStyle = '#5e6675';
    for(k = -1; k <= 1; k++){ p.beginPath(); p.arc(k * s * 0.35, s * 0.36, s * 0.05, 0, 6.2832); p.fill(); }
  } else if(spec.torso === 'spikes'){
    p.fillStyle = '#3a3f4a';
    for(k = -1; k <= 1; k += 2){
      for(j = 0; j < 3; j++){
        sx = k * s * (0.75 + j * 0.14); sy = -s * 0.15 + j * s * 0.3;
        p.beginPath();
        p.moveTo(sx - k * s * 0.12, sy + s * 0.14); p.lineTo(sx - k * s * 0.12, sy - s * 0.14);
        p.lineTo(sx + k * s * 0.18, sy); p.closePath(); p.fill();
      }
    }
  } else if(spec.torso === 'sash'){
    p.save(); p.rotate(0.5);
    p.fillStyle = '#c81e1e';
    p.fillRect(-s * 1.0, -s * 0.12, s * 2.0, s * 0.24);
    p.strokeStyle = '#7a0d0d'; p.lineWidth = 1.5;
    p.strokeRect(-s * 1.0, -s * 0.12, s * 2.0, s * 0.24);
    p.restore();
  }
}

/* ---------------- WEAPONS ---------------- */
function __fb3_paintWeapon(p, spec, s, t, fx){
  var wx = fx * s * 1.05, k;
  if(spec.weapon === 'bow'){
    var a1 = fx > 0 ? -1.25 : Math.PI - 1.25, a2 = fx > 0 ? 1.25 : Math.PI + 1.25;
    p.strokeStyle = '#5c2e10'; p.lineWidth = 3.2;
    p.beginPath(); p.arc(wx, 0, s * 0.62, a1, a2); p.stroke();
    p.strokeStyle = 'rgba(255,240,200,0.85)'; p.lineWidth = 1.5;
    p.beginPath();
    p.moveTo(wx + Math.cos(a1) * s * 0.62, Math.sin(a1) * s * 0.62);
    p.lineTo(wx + Math.cos(a2) * s * 0.62, Math.sin(a2) * s * 0.62);
    p.stroke();
  } else if(spec.weapon === 'sword'){
    p.save(); p.translate(wx, s * 0.1); p.rotate(fx * 0.5);
    p.fillStyle = '#cfd6e0'; p.fillRect(-s * 0.07, -s * 1.3, s * 0.14, s * 1.1);
    p.fillStyle = '#8f9aa8'; p.fillRect(-s * 0.28, -s * 0.28, s * 0.56, s * 0.12);
    p.fillStyle = '#5c2e10'; p.fillRect(-s * 0.06, -s * 0.16, s * 0.12, s * 0.4);
    p.restore();
  } else if(spec.weapon === 'staff'){
    p.strokeStyle = '#5c2e10'; p.lineWidth = s * 0.12; p.lineCap = 'round';
    p.beginPath(); p.moveTo(wx, s * 0.9); p.lineTo(wx, -s * 1.3); p.stroke();
    var gl = 0.7 + 0.3 * Math.sin(t * 6);
    p.globalAlpha = 0.4 * gl;
    p.fillStyle = '#9a4dff';
    p.beginPath(); p.arc(wx, -s * 1.45, s * 0.3, 0, 6.2832); p.fill();
    p.globalAlpha = 1;
    p.fillStyle = '#d6b4ff';
    p.beginPath(); p.arc(wx, -s * 1.45, s * 0.16, 0, 6.2832); p.fill();
  } else if(spec.weapon === 'hammer'){
    p.save(); p.translate(wx, 0); p.rotate(fx * -0.4);
    p.strokeStyle = '#5c2e10'; p.lineWidth = s * 0.14; p.lineCap = 'round';
    p.beginPath(); p.moveTo(0, s * 0.7); p.lineTo(0, -s * 0.9); p.stroke();
    p.fillStyle = '#6e7683';
    __fb3_rr(p, -s * 0.42, -s * 1.3, s * 0.84, s * 0.5, s * 0.12); p.fill();
    p.strokeStyle = '#3a3f4a'; p.lineWidth = 2; p.stroke();
    p.restore();
  } else if(spec.weapon === 'shield'){
    p.fillStyle = '#8f9aa8';
    __fb3_rr(p, wx - s * 0.35, -s * 0.4, s * 0.7, s * 0.95, s * 0.25); p.fill();
    p.strokeStyle = '#5e6675'; p.lineWidth = 2.5; p.stroke();
    p.fillStyle = '#c81e1e';
    p.beginPath(); p.arc(wx, s * 0.07, s * 0.16, 0, 6.2832); p.fill();
  } else if(spec.weapon === 'daggers'){
    for(k = -1; k <= 1; k += 2){
      p.save(); p.translate(k * s * 0.95, s * 0.35); p.rotate(k * 0.35);
      p.fillStyle = '#cfd6e0'; p.fillRect(-s * 0.05, -s * 0.7, s * 0.1, s * 0.55);
      p.fillStyle = '#3a2410'; p.fillRect(-s * 0.09, -s * 0.15, s * 0.18, s * 0.3);
      p.restore();
    }
  }
}

/* ---------------- FULL BABY (preview + battle share this) ---------------- */
function paintCustomBaby(p, spec, s, t, faceX){
  var pal = __fb3_pal(spec.body), k, a;
  var fx = faceX || 1;
  __fb3_paintBack(p, spec, s, t, fx);
  p.fillStyle = pal.dark;
  for(k = 0; k < 6; k++){
    a = k * 1.047 + 0.3 + Math.sin(t * 7 + k * 1.7) * 0.05;
    var L = s * 1.25 * (1 + 0.14 * Math.sin(t * 9 + k * 2.3));
    var ca = Math.cos(a), sa = Math.sin(a);
    p.beginPath();
    p.moveTo(ca * s * 0.55, sa * s * 0.55);
    p.lineTo(Math.cos(a + 0.3) * s * 0.78, Math.sin(a + 0.3) * s * 0.78);
    p.lineTo(ca * L, sa * L);
    p.lineTo(Math.cos(a - 0.3) * s * 0.78, Math.sin(a - 0.3) * s * 0.78);
    p.closePath(); p.fill();
  }
  var fl = 1 + Math.sin(t * 10) * 0.05;
  p.fillStyle = pal.body;
  p.beginPath(); p.arc(0, 0, s * fl, 0, 6.2832); p.fill();
  p.fillStyle = pal.core;
  p.beginPath(); p.arc(-fx * s * 0.06, s * 0.06, s * 0.5 * fl, 0, 6.2832); p.fill();
  __fb3_paintTorso(p, spec, s, t, fx);
  __fb3_paintFace(p, spec, s, fx);
  __fb3_paintHead(p, spec, s, t, fx);
  __fb3_paintWeapon(p, spec, s, t, fx);
}
window.paintCustomBaby = paintCustomBaby; /* so future patches/tools can reuse it */

/* =====================================================================
   SECTION 6 — BATTLE INTEGRATION (your custom baby takes the field)
   Equip a baby in the Creator → it becomes the hero you drive with the
   joystick. Class mods + your 12 attribute points reshape its stats,
   its special auto-casts through the game's real skill engine, and the
   painters from section 5 draw it live in battle. Respawn safe: this
   hooks spawnHero, which the castle calls every 8 seconds.
   ===================================================================== */
function __fb3_equippedSpec(){
  if(!__FB3.equipped) return null;
  for(var i = 0; i < __FB3.customs.length; i++)
    if(__FB3.customs[i].id === __FB3.equipped) return __FB3.customs[i];
  return null;
}

/* reshape a fresh hero unit into the equipped custom baby */
function __fb3_applySpecToHero(u, spec){
  var pal = __fb3_pal(spec.body), cls = __fb3_cls(spec.cls),
      spc = __fb3_spc(spec.special), m = cls.mods || {};
  u.customSpec = spec;
  /* paint the hero in the custom palette */
  u.colMain = pal.body; u.colDark = pal.dark; u.colCore = pal.core;
  /* class mods */
  if(m.hp)        u.maxHp = u.hp = Math.round(u.maxHp * m.hp);
  if(m.dmg)       u.dmg *= m.dmg;
  if(m.range)     u.range *= m.range;
  if(m.moveSpeed) u.moveSpeed *= m.moveSpeed;
  if(m.armor)     u.armor += m.armor;
  if(m.crit)      u.crit += m.crit;
  if(m.atkCd)     u.atkCd *= m.atkCd;
  if(m.size)      u.size *= m.size;
  /* attributes: the 12 points the player spent */
  u.dmg *= (1 + 0.08 * (spec.pow || 0));
  u.moveSpeed *= (1 + 0.06 * (spec.spd || 0));
  u.maxHp = u.hp = Math.round(u.maxHp * (1 + 0.12 * (spec.tuf || 0)));
  /* special → the game's real skill engine (auto-cast) */
  var kind = spc.kind || 'flurry';
  u.castKind = (kind === 'nova') ? 'flurry' : kind; /* NOVA lives on the hero button */
  if(u.castKind === 'slam') u.splash = Math.max(u.splash || 0, 100);
  try{ if(typeof UI !== 'undefined' && UI.hint) UI.hint('⚔️ ' + (spec.name || 'Custom') + ' takes the field! (' + cls.name + ')'); }catch(e){}
}

/* hook hero spawn — battle start AND every castle respawn */
if(typeof spawnHero !== 'undefined'){
  var __fb3_origSpawnHero = spawnHero;
  spawnHero = function(){
    var idx = __fb3_origSpawnHero();
    try{
      var spec = __fb3_equippedSpec();
      if(idx >= 0 && spec && typeof units !== 'undefined' && units[idx])
        __fb3_applySpecToHero(units[idx], spec);
    }catch(e){}
    return idx;
  };
}

/* custom taunt: baseline reads taunt radius off UNIT_DEFS, so a custom
   hero gets its own cast path with Boulder's numbers */
if(typeof tryCast !== 'undefined'){
  var __fb3_origTryCast = tryCast;
  tryCast = function(u){
    if(u.customSpec && u.castKind === 'taunt'){
      if(u.skillT > 0) return false;
      if(typeof validTarget === 'undefined' || !validTarget(u, u.target) || u.target === CASTLE_T) return false;
      var r = 130, hitAny = false, i, e;
      for(i = 0; i < CFG.MAX_UNITS; i++){
        e = units[i];
        if(!e.active || e.side === u.side || e.state === ST.DYING) continue;
        if(dist2(u.x, u.y, e.x, e.y) < r * r){ e.tauntBy = u.idx; e.tauntT = 3.0; hitAny = true; }
      }
      if(!hitAny) return false;
      for(var k = 0; k < 3; k++) burst(u.x, u.y, '#ffb347', 6, 130 + k * 60, 0.5, 4, 0);
      addShake(3, 0.2);
      if(window.AudioSys) AudioSys.tauntS();
      if(typeof buzz !== 'undefined') buzz(20);
      u.skillT = u.skillCd;
      return true;
    }
    return __fb3_origTryCast(u);
  };
}

/* draw the custom face instead of the default eyes */
if(typeof drawBabyEyes !== 'undefined'){
  var __fb3_origEyes = drawBabyEyes;
  drawBabyEyes = function(u, s){
    if(u.customSpec && u.customSpec.eyes){
      try{ __fb3_paintFace(ctx, u.customSpec, s, u.faceX || 1); return; }catch(e){}
    }
    __fb3_origEyes(u, s);
  };
}

/* draw custom gear (torso + head + weapon) instead of default extras */
if(typeof drawBabyExtras !== 'undefined'){
  var __fb3_origExtras = drawBabyExtras;
  drawBabyExtras = function(u, s, t){
    if(u.customSpec){
      try{
        var fx = u.faceX || 1;
        __fb3_paintTorso(ctx, u.customSpec, s, t, fx);
        __fb3_paintHead(ctx, u.customSpec, s, t, fx);
        __fb3_paintWeapon(ctx, u.customSpec, s, t, fx);
        return;
      }catch(e){}
    }
    __fb3_origExtras(u, s, t);
  };
}

/* =====================================================================
   SECTION 7 — CREATOR UI (🎨 button → full character creator overlay)
   Tabs: LOOK (palette/eyes/brows/mouth) · GEAR (head/torso/weapon) ·
   CLASS (class cards + special moves) · STATS (12 attribute points) ·
   BABYS (6 save slots). Animated preview, randomize, save/equip/delete.
   Built for thumbs: big tap targets, scrolling body, works on phones.
   ===================================================================== */
var __fb3_draft = __fb3_freshSpec();
var __fb3_editingId = null;
var __fb3_tab = 'look';
var __fb3_prevRAF = 0;
var __fb3_prevT0 = 0;

function __fb3_combosBrag(){
  try{ return __fb3_comboCount().toLocaleString('en-US'); }catch(e){ return '9,676,800'; }
}

/* ---------- CSS ---------- */
function __fb3_injectCSS(){
  if(document.getElementById('fb3css')) return;
  var css = document.createElement('style');
  css.id = 'fb3css';
  css.textContent = [
    '#creatorBtn{pointer-events:auto;background:rgba(12,6,4,.72);border:1px solid rgba(255,150,60,.25);',
    'border-radius:999px;width:42px;height:42px;font-size:20px;color:#ffe9d6;cursor:pointer}',
    '#creatorBtn:active{transform:scale(.92)}',
    '#creatorOv{position:absolute;inset:0;z-index:40;background:rgba(8,3,2,.97);display:flex;flex-direction:column}',
    '#creatorOv.hidden{display:none}',
    '#crHead{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 4px}',
    '#crHead h2{font-size:20px;letter-spacing:1px;color:#ffd76a;margin:0}',
    '#crClose{background:rgba(255,120,40,.15);border:1px solid rgba(255,150,60,.4);color:#ffe9d6;',
    'border-radius:999px;width:38px;height:38px;font-size:18px;cursor:pointer}',
    '#crSub{padding:0 16px 6px;font-size:12px;color:#c98a5a}',
    '#crMain{flex:1;overflow-y:auto;padding:0 16px;-webkit-overflow-scrolling:touch}',
    '#crPrevWrap{display:flex;gap:12px;align-items:center;background:rgba(30,12,6,.85);',
    'border:1px solid rgba(255,150,60,.25);border-radius:16px;padding:10px;margin:4px 0 10px}',
    '#crPreview{width:120px;height:120px;flex:0 0 120px;background:radial-gradient(circle at 50% 40%,#3a1508,#120604);border-radius:12px}',
    '#crNameRow{flex:1;min-width:0}',
    '#crName{width:100%;box-sizing:border-box;background:rgba(0,0,0,.4);border:1px solid rgba(255,150,60,.4);',
    'border-radius:10px;color:#ffd76a;font-size:17px;font-weight:800;padding:9px 10px;letter-spacing:.5px}',
    '#crClassLine{font-size:12px;color:#c98a5a;margin-top:6px;line-height:1.4}',
    '#crClassLine b{color:#ff9d3c}',
    '#crTabs{display:flex;gap:6px;margin:2px 0 10px}',
    '.crTab{flex:1;background:rgba(30,12,6,.85);border:1px solid rgba(255,150,60,.25);color:#c98a5a;',
    'border-radius:10px;padding:10px 0;font-size:12px;font-weight:800;letter-spacing:.5px;cursor:pointer}',
    '.crTab.on{background:rgba(255,120,40,.25);border-color:#ff9d3c;color:#ffd76a}',
    '.crSec{font-size:11px;font-weight:800;color:#c98a5a;letter-spacing:1px;margin:10px 0 6px}',
    '.crGrid{display:flex;flex-wrap:wrap;gap:8px}',
    '.crOpt{background:rgba(30,12,6,.85);border:1px solid rgba(255,150,60,.25);color:#ffe9d6;',
    'border-radius:10px;padding:10px 12px;font-size:13px;font-weight:700;cursor:pointer;min-width:64px;text-align:center}',
    '.crOpt.on{background:rgba(255,120,40,.3);border-color:#ff9d3c;color:#ffd76a}',
    '.crSwatch{width:52px;height:52px;border-radius:999px;border:2px solid rgba(255,150,60,.25);cursor:pointer;flex:0 0 52px}',
    '.crSwatch.on{border-color:#ffd76a;box-shadow:0 0 10px rgba(255,180,80,.7)}',
    '.crCard{background:rgba(30,12,6,.85);border:1px solid rgba(255,150,60,.25);border-radius:12px;',
    'padding:10px 12px;margin:0 0 8px;cursor:pointer}',
    '.crCard.on{border-color:#ff9d3c;background:rgba(255,120,40,.18)}',
    '.crCard b{color:#ffd76a;font-size:14px}',
    '.crCard p{margin:4px 0 0;font-size:12px;color:#c98a5a;line-height:1.4}',
    '.crAttr{display:flex;align-items:center;gap:10px;background:rgba(30,12,6,.85);',
    'border:1px solid rgba(255,150,60,.25);border-radius:12px;padding:10px 12px;margin:0 0 8px}',
    '.crAttr .nm{flex:1}.crAttr .nm b{color:#ffd76a;font-size:14px}.crAttr .nm span{display:block;font-size:11px;color:#c98a5a}',
    '.crAttr button{width:44px;height:44px;border-radius:999px;font-size:20px;font-weight:900;cursor:pointer;',
    'background:rgba(255,120,40,.2);border:1px solid rgba(255,150,60,.5);color:#ffd76a}',
    '.crAttr button:disabled{opacity:.3}',
    '.crAttr .val{font-size:18px;font-weight:900;color:#ffd76a;min-width:28px;text-align:center}',
    '#crPtsLeft{text-align:center;font-size:13px;color:#ffd76a;font-weight:800;margin:6px 0 2px}',
    '.crSlot{display:flex;gap:10px;align-items:center;background:rgba(30,12,6,.85);',
    'border:1px solid rgba(255,150,60,.25);border-radius:12px;padding:8px;margin:0 0 8px;cursor:pointer}',
    '.crSlot.on{border-color:#ff9d3c}',
    '.crSlot canvas{width:56px;height:56px;flex:0 0 56px;background:radial-gradient(circle at 50% 40%,#3a1508,#120604);border-radius:10px}',
    '.crSlot .nm{flex:1}.crSlot .nm b{color:#ffd76a;font-size:14px;display:block}',
    '.crSlot .nm span{font-size:11px;color:#c98a5a}',
    '.crEquipped{font-size:11px;font-weight:900;color:#0e2a12;background:#7dff9a;border-radius:999px;padding:3px 9px}',
    '#crFoot{display:flex;gap:8px;padding:10px 16px 14px;background:rgba(8,3,2,.97);border-top:1px solid rgba(255,150,60,.2)}',
    '.crBtn{flex:1;border-radius:12px;padding:13px 0;font-size:14px;font-weight:900;cursor:pointer;border:1px solid rgba(255,150,60,.5)}',
    '#crRandom{background:rgba(30,12,6,.9);color:#ffd76a}',
    '#crSave{background:rgba(255,120,40,.25);color:#ffd76a}',
    '#crEquip{background:#ff7a1e;border-color:#ffb347;color:#1d0d02}',
    '#crDel{background:rgba(120,20,10,.35);color:#ff9a8a;flex:0 0 52px}'
  ].join('\n');
  document.head.appendChild(css);
}

/* ---------- overlay skeleton ---------- */
function __fb3_buildOverlay(){
  if(document.getElementById('creatorOv')) return;
  __fb3_injectCSS();
  var ov = document.createElement('div');
  ov.id = 'creatorOv';
  ov.className = 'hidden';
  ov.innerHTML =
    '<div id="crHead"><h2>🎨 BUILD-A-BABY</h2><button id="crClose" aria-label="close">✕</button></div>' +
    '<div id="crSub">' + __fb3_combosBrag() + '+ possible babys. Yours is one of a kind.</div>' +
    '<div id="crMain">' +
      '<div id="crPrevWrap"><canvas id="crPreview" width="240" height="240"></canvas>' +
      '<div id="crNameRow"><input id="crName" maxlength="14" placeholder="Name your baby…" />' +
      '<div id="crClassLine"></div></div></div>' +
      '<div id="crTabs"></div>' +
      '<div id="crBody"></div>' +
      '<div style="height:8px"></div>' +
    '</div>' +
    '<div id="crFoot">' +
      '<button class="crBtn" id="crRandom">🎲</button>' +
      '<button class="crBtn" id="crSave">💾 Save</button>' +
      '<button class="crBtn" id="crEquip">⚔️ Equip</button>' +
      '<button class="crBtn" id="crDel">🗑</button>' +
    '</div>';
  var stage = document.getElementById('stage') || document.body;
  stage.appendChild(ov);
  ov.querySelector('#crClose').addEventListener('click', __fb3_closeCreator);
  ov.querySelector('#crName').addEventListener('input', function(e){
    __fb3_draft.name = (e.target.value || '').slice(0, 14) || 'Unnamed';
    __fb3_renderClassLine();
  });
  ov.querySelector('#crRandom').addEventListener('click', function(){ __fb3_randomize(); if(window.AudioSys) AudioSys.ui(); });
  ov.querySelector('#crSave').addEventListener('click', function(){ __fb3_saveDraft(); if(window.AudioSys) AudioSys.ui(); });
  ov.querySelector('#crEquip').addEventListener('click', function(){ __fb3_equipDraft(); if(window.AudioSys) AudioSys.place(); });
  ov.querySelector('#crDel').addEventListener('click', function(){ __fb3_deleteDraft(); if(window.AudioSys) AudioSys.ui(); });
  var tabs = [['look','👁 Look'],['gear','🛡 Gear'],['class','⚔ Class'],['stats','📊 Stats'],['babys','🔥 Babys']];
  var tabBar = ov.querySelector('#crTabs');
  tabs.forEach(function(t){
    var b = document.createElement('button');
    b.className = 'crTab' + (__fb3_tab === t[0] ? ' on' : '');
    b.textContent = t[1];
    b.setAttribute('data-tab', t[0]);
    b.addEventListener('click', function(){ __fb3_tab = t[0]; __fb3_renderTabs(); __fb3_renderTab(); if(window.AudioSys) AudioSys.ui(); });
    tabBar.appendChild(b);
  });
}

function __fb3_renderTabs(){
  var bar = document.querySelector('#crTabs');
  if(!bar) return;
  for(var i = 0; i < bar.children.length; i++)
    bar.children[i].classList.toggle('on', bar.children[i].getAttribute('data-tab') === __fb3_tab);
}

function __fb3_renderClassLine(){
  var el = document.querySelector('#crClassLine');
  if(!el) return;
  var c = __fb3_cls(__fb3_draft.cls), s = __fb3_spc(__fb3_draft.special);
  el.innerHTML = '<b>' + c.name + '</b> · ' + s.name + '<br>POW ' + (__fb3_draft.pow||0) +
    ' · SPD ' + (__fb3_draft.spd||0) + ' · TUF ' + (__fb3_draft.tuf||0);
}

/* ---------- option button helper ---------- */
function __fb3_opt(label, selected, cb){
  var b = document.createElement('button');
  b.className = 'crOpt' + (selected ? ' on' : '');
  b.textContent = label;
  b.addEventListener('click', function(){ cb(); __fb3_renderTab(); __fb3_renderClassLine(); if(window.AudioSys) AudioSys.ui(); });
  return b;
}

/* ---------- tab bodies ---------- */
function __fb3_renderTab(){
  var body = document.querySelector('#crBody');
  if(!body) return;
  body.innerHTML = '';
  var d = __fb3_draft, i, sec, grid;

  function section(title){
    sec = document.createElement('div');
    sec.className = 'crSec';
    sec.textContent = title;
    body.appendChild(sec);
    grid = document.createElement('div');
    grid.className = 'crGrid';
    body.appendChild(grid);
    return grid;
  }

  if(__fb3_tab === 'look'){
    var g = section('FLAME COLOR');
    FB3_PALETTES.forEach(function(p){
      var s = document.createElement('button');
      s.className = 'crSwatch' + (d.body === p.id ? ' on' : '');
      s.title = p.name;
      s.style.background = 'radial-gradient(circle at 50% 40%,' + p.core + ',' + p.body + ' 60%,' + p.dark + ')';
      s.setAttribute('aria-label', p.name);
      (function(id){ s.addEventListener('click', function(){ d.body = id; __fb3_renderTab(); if(window.AudioSys) AudioSys.ui(); }); })(p.id);
      g.appendChild(s);
    });
    g = section('EYES');
    FB3_EYES.forEach(function(o){ (function(id){ g.appendChild(__fb3_opt(o.name, d.eyes === id, function(){ d.eyes = id; })); })(o.id); });
    g = section('BROWS');
    FB3_BROWS.forEach(function(o){ (function(id){ g.appendChild(__fb3_opt(o.name, d.brows === id, function(){ d.brows = id; })); })(o.id); });
    g = section('MOUTH (no beaks — all attitude)');
    FB3_MOUTHS.forEach(function(o){ (function(id){ g.appendChild(__fb3_opt(o.name, d.mouth === id, function(){ d.mouth = id; })); })(o.id); });
  }
  else if(__fb3_tab === 'gear'){
    g = section('HEADGEAR');
    FB3_HEADS.forEach(function(o){ (function(id){ g.appendChild(__fb3_opt(o.name, d.head === id, function(){ d.head = id; })); })(o.id); });
    g = section('TORSO');
    FB3_TORSOS.forEach(function(o){ (function(id){ g.appendChild(__fb3_opt(o.name, d.torso === id, function(){ d.torso = id; })); })(o.id); });
    g = section('WEAPON');
    FB3_WEAPONS.forEach(function(o){ (function(id){ g.appendChild(__fb3_opt(o.name, d.weapon === id, function(){ d.weapon = id; })); })(o.id); });
  }
  else if(__fb3_tab === 'class'){
    sec = document.createElement('div'); sec.className = 'crSec'; sec.textContent = 'CLASS — WHO YOUR BABY IS IN A FIGHT'; body.appendChild(sec);
    FB3_CLASSES.forEach(function(c){
      (function(cc){
        var card = document.createElement('div');
        card.className = 'crCard' + (d.cls === cc.id ? ' on' : '');
        card.innerHTML = '<b>' + cc.name + '</b><p>' + cc.desc + '</p>';
        card.addEventListener('click', function(){
          d.cls = cc.id;
          /* default the special to the class signature move */
          d.special = cc.special;
          __fb3_renderTab(); __fb3_renderClassLine();
          if(window.AudioSys) AudioSys.ui();
        });
        body.appendChild(card);
      })(c);
    });
    sec = document.createElement('div'); sec.className = 'crSec'; sec.textContent = 'SPECIAL MOVE — AUTO-CASTS IN BATTLE'; body.appendChild(sec);
    FB3_SPECIALS.forEach(function(s){
      (function(ss){
        var card = document.createElement('div');
        card.className = 'crCard' + (d.special === ss.id ? ' on' : '');
        card.innerHTML = '<b>🔥 ' + ss.name + '</b><p>' + ss.desc + '</p>';
        card.addEventListener('click', function(){ d.special = ss.id; __fb3_renderTab(); __fb3_renderClassLine(); if(window.AudioSys) AudioSys.ui(); });
        body.appendChild(card);
      })(s);
    });
  }
  else if(__fb3_tab === 'stats'){
    var left = FB3_ATTR_POINTS - ((d.pow||0) + (d.spd||0) + (d.tuf||0));
    var pl = document.createElement('div');
    pl.id = 'crPtsLeft';
    pl.textContent = left > 0 ? (left + ' POINTS LEFT TO SPEND') : 'ALL 12 POINTS SPENT — LOOK AT YOU';
    body.appendChild(pl);
    FB3_ATTRS.forEach(function(a){
      (function(aa){
        var row = document.createElement('div');
        row.className = 'crAttr';
        var nm = document.createElement('div'); nm.className = 'nm';
        nm.innerHTML = '<b>' + aa.name + '</b><span>' + aa.desc + '</span>';
        var minus = document.createElement('button'); minus.textContent = '−';
        minus.disabled = (d[aa.id] || 0) <= 0;
        var val = document.createElement('div'); val.className = 'val'; val.textContent = (d[aa.id] || 0);
        var plus = document.createElement('button'); plus.textContent = '+';
        plus.disabled = left <= 0;
        minus.addEventListener('click', function(){ if((d[aa.id]||0) > 0){ d[aa.id]--; __fb3_renderTab(); __fb3_renderClassLine(); if(window.AudioSys) AudioSys.ui(); } });
        plus.addEventListener('click', function(){
          var l = FB3_ATTR_POINTS - ((d.pow||0) + (d.spd||0) + (d.tuf||0));
          if(l > 0){ d[aa.id] = (d[aa.id]||0) + 1; __fb3_renderTab(); __fb3_renderClassLine(); if(window.AudioSys) AudioSys.ui(); }
        });
        row.appendChild(nm); row.appendChild(minus); row.appendChild(val); row.appendChild(plus);
        body.appendChild(row);
      })(a);
    });
  }
  else if(__fb3_tab === 'babys'){
    sec = document.createElement('div'); sec.className = 'crSec';
    sec.textContent = 'YOUR BABYS (' + __FB3.customs.length + '/6) — TAP ONE TO EDIT';
    body.appendChild(sec);
    if(__FB3.customs.length === 0){
      var empty = document.createElement('p');
      empty.style.cssText = 'color:#c98a5a;font-size:13px;line-height:1.5';
      empty.textContent = 'No custom babys yet. Build one above, hit 💾 Save, then ⚔️ Equip to take it into battle as YOUR hero.';
      body.appendChild(empty);
    }
    __FB3.customs.forEach(function(spec){
      (function(sp){
        var slot = document.createElement('div');
        slot.className = 'crSlot' + (__fb3_editingId === sp.id ? ' on' : '');
        var cv = document.createElement('canvas');
        cv.width = 112; cv.height = 112;
        slot.appendChild(cv);
        var nm = document.createElement('div'); nm.className = 'nm';
        var c = __fb3_cls(sp.cls), s2 = __fb3_spc(sp.special);
        nm.innerHTML = '<b>' + __fb3_esc(sp.name || 'Unnamed') + '</b><span>' + c.name + ' · ' + s2.name + '</span>';
        slot.appendChild(nm);
        if(__FB3.equipped === sp.id){
          var eq = document.createElement('div'); eq.className = 'crEquipped'; eq.textContent = 'EQUIPPED';
          slot.appendChild(eq);
        }
        slot.addEventListener('click', function(){
          __fb3_draft = JSON.parse(JSON.stringify(sp));
          __fb3_editingId = sp.id;
          var ni = document.querySelector('#crName');
          if(ni) ni.value = __fb3_draft.name || '';
          __fb3_renderClassLine(); __fb3_renderTab();
          if(window.AudioSys) AudioSys.ui();
        });
        body.appendChild(slot);
        try{
          var p = cv.getContext('2d');
          p.save(); p.translate(56, 58);
          paintCustomBaby(p, sp, 30, 1.2, 1);
          p.restore();
        }catch(e){}
      })(spec);
    });
    var newB = document.createElement('button');
    newB.className = 'crOpt'; newB.style.marginTop = '4px'; newB.textContent = '＋ New Baby';
    newB.addEventListener('click', function(){
      __fb3_draft = __fb3_freshSpec(); __fb3_editingId = null;
      var ni = document.querySelector('#crName');
      if(ni) ni.value = __fb3_draft.name;
      __fb3_renderClassLine(); __fb3_renderTab();
      if(window.AudioSys) AudioSys.ui();
    });
    body.appendChild(newB);
  }
}

function __fb3_esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ---------- draft ops ---------- */
function __fb3_randomize(){
  function pick(a){ return a[(Math.random() * a.length) | 0].id; }
  __fb3_draft = __fb3_freshSpec();
  __fb3_draft.name = FB3_RANDOM_NAMES[(Math.random() * FB3_RANDOM_NAMES.length) | 0];
  __fb3_draft.body = pick(FB3_PALETTES);
  __fb3_draft.eyes = pick(FB3_EYES);
  __fb3_draft.brows = pick(FB3_BROWS);
  __fb3_draft.mouth = pick(FB3_MOUTHS);
  __fb3_draft.head = pick(FB3_HEADS);
  __fb3_draft.torso = pick(FB3_TORSOS);
  __fb3_draft.weapon = pick(FB3_WEAPONS);
  var c = FB3_CLASSES[(Math.random() * FB3_CLASSES.length) | 0];
  __fb3_draft.cls = c.id;
  __fb3_draft.special = c.special;
  var p = 0, s = 0, t = 0, left = FB3_ATTR_POINTS;
  while(left > 0){ var r = (Math.random() * 3) | 0; if(r === 0) p++; else if(r === 1) s++; else t++; left--; }
  __fb3_draft.pow = p; __fb3_draft.spd = s; __fb3_draft.tuf = t;
  __fb3_editingId = null;
  var ni = document.querySelector('#crName');
  if(ni) ni.value = __fb3_draft.name;
  __fb3_renderClassLine(); __fb3_renderTab();
}

function __fb3_saveDraft(){
  var d = JSON.parse(JSON.stringify(__fb3_draft));
  d.name = (d.name || 'Unnamed').slice(0, 14);
  var i;
  if(__fb3_editingId){
    for(i = 0; i < __FB3.customs.length; i++)
      if(__FB3.customs[i].id === __fb3_editingId){ __FB3.customs[i] = d; break; }
    __fb3_hint('💾 ' + d.name + ' updated!');
  } else {
    if(__FB3.customs.length >= 6){ __fb3_hint('Nursery is full! Delete a baby to make room.'); return; }
    __FB3.customs.push(d);
    __fb3_editingId = d.id;
    __fb3_hint('💾 ' + d.name + ' joined the nursery!');
  }
  __fb3_saveStore();
  __fb3_renderTab();
}

function __fb3_equipDraft(){
  if(!__fb3_editingId){
    if(__FB3.customs.length >= 6){ __fb3_hint('Nursery is full! Delete a baby to make room.'); return; }
    var d = JSON.parse(JSON.stringify(__fb3_draft));
    d.name = (d.name || 'Unnamed').slice(0, 14);
    __FB3.customs.push(d);
    __fb3_editingId = d.id;
  }
  __FB3.equipped = __fb3_editingId;
  __fb3_saveStore();
  var spec = __fb3_equippedSpec();
  __fb3_hint('⚔️ ' + (spec ? spec.name : 'Baby') + ' equipped — takes the field next battle!');
  __fb3_renderTab();
}

function __fb3_deleteDraft(){
  if(!__fb3_editingId){ __fb3_hint('Nothing to delete — pick a baby first.'); return; }
  var nm = '', i;
  for(i = 0; i < __FB3.customs.length; i++)
    if(__FB3.customs[i].id === __fb3_editingId){ nm = __FB3.customs[i].name; __FB3.customs.splice(i, 1); break; }
  if(__FB3.equipped === __fb3_editingId) __FB3.equipped = null;
  __fb3_editingId = null;
  __fb3_draft = __fb3_freshSpec();
  var ni = document.querySelector('#crName');
  if(ni) ni.value = __fb3_draft.name;
  __fb3_saveStore();
  __fb3_hint('🗑 ' + nm + ' went back to the Eternal Flame.');
  __fb3_renderClassLine(); __fb3_renderTab();
}

function __fb3_hint(msg){
  try{ if(typeof UI !== 'undefined' && UI.hint) UI.hint(msg); }catch(e){}
}

/* ---------- preview loop ---------- */
function __fb3_previewFrame(){
  var ov = document.getElementById('creatorOv');
  if(!ov || ov.classList.contains('hidden')){ __fb3_prevRAF = 0; return; }
  try{
    var cv = document.getElementById('crPreview');
    if(cv){
      var p = cv.getContext('2d');
      var t = (performance.now() - __fb3_prevT0) / 1000;
      p.clearRect(0, 0, 240, 240);
      p.save();
      p.translate(120, 124);
      paintCustomBaby(p, __fb3_draft, 58, t, 1);
      p.restore();
    }
  }catch(e){}
  __fb3_prevRAF = requestAnimationFrame(__fb3_previewFrame);
}

/* ---------- open / close ---------- */
function __fb3_openCreator(){
  __fb3_buildOverlay();
  var ov = document.getElementById('creatorOv');
  var ni = document.getElementById('crName');
  if(ni && !__fb3_editingId) ni.value = __fb3_draft.name || '';
  ov.classList.remove('hidden');
  __fb3_renderTabs();
  __fb3_renderTab();
  __fb3_renderClassLine();
  __fb3_prevT0 = performance.now();
  if(!__fb3_prevRAF) __fb3_prevRAF = requestAnimationFrame(__fb3_previewFrame);
}

function __fb3_closeCreator(){
  var ov = document.getElementById('creatorOv');
  if(ov) ov.classList.add('hidden');
  if(__fb3_prevRAF){ cancelAnimationFrame(__fb3_prevRAF); __fb3_prevRAF = 0; }
}

/* =====================================================================
   SECTION 8 — STARTUP (HUD button + codex hook)
   ===================================================================== */
function __fb3_installCreatorBtn(){
  try{
    if(document.getElementById('creatorBtn')) return;
    var hud = document.getElementById('hud');
    if(!hud) return;
    var mute = document.getElementById('muteBtn');
    var btn = document.createElement('button');
    btn.id = 'creatorBtn';
    btn.textContent = '🎨';
    btn.setAttribute('aria-label', 'build-a-baby character creator');
    btn.addEventListener('click', function(){
      __fb3_openCreator();
      if(window.AudioSys) AudioSys.ui();
    });
    if(mute) hud.insertBefore(btn, mute);
    else hud.appendChild(btn);
  }catch(e){}
}

function __fb3_startup(){
  try{ if(typeof __fb3_hookCodexBtn === 'function') __fb3_hookCodexBtn(); }catch(e){}
  try{ __fb3_installCreatorBtn(); }catch(e){}
  try{ if(typeof __fb3_refreshCodex === 'function') __fb3_refreshCodex(); }catch(e){}
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', __fb3_startup);
} else {
  __fb3_startup();
}

/* debug/tooling handle — read-only view for future patches, tests, and tools.
   (Everything else in this file lives inside the IIFE on purpose.) */
window.__FB3_DEBUG = {
  UNLOCK_DEFS: UNLOCK_DEFS, CODEX_ORDER: CODEX_ORDER,
  PALETTES: FB3_PALETTES, EYES: FB3_EYES, BROWS: FB3_BROWS, MOUTHS: FB3_MOUTHS,
  HEADS: FB3_HEADS, TORSOS: FB3_TORSOS, WEAPONS: FB3_WEAPONS,
  CLASSES: FB3_CLASSES, SPECIALS: FB3_SPECIALS, ATTRS: FB3_ATTRS,
  comboCount: __fb3_comboCount, freshSpec: __fb3_freshSpec,
  cls: __fb3_cls, spc: __fb3_spc, pal: __fb3_pal,
  equippedSpec: __fb3_equippedSpec
};

/* ★ ADD NEW CONTENT ABOVE THIS LINE. Sections 4+5 are the growth zones. ★ */
})(); /* end PATCH 003 — fire-baby-creator */
