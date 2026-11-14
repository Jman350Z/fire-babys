/* =====================================================================
   PATCH 002 — character-codex
   Date: 2026-09-30 | For: Jeff (Fire Babys)
   What it changes: Every baby gets a real identity — name, title,
     attitude, description, backstory, and signature special move.
     Adds a "Meet the Babys" codex (🔥 button in the HUD) with a
     portrait gallery drawn by the game's own renderer.
     Also renames the troop bar + skill names to match.
   Touches: UNIT_DEFS names/skills (cosmetic only — no stat changes),
     DOM: injects #codexBtn, #codexOv + CSS. No canvas/game-logic changes.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: tap the 🔥 button (top-right, next to sound) — the codex opens.
   ===================================================================== */
(function(){
'use strict';

/* ---------------- THE ROSTER ---------------- */
var BIOS = {
  brawler: {
    name:'RUKO', title:'The Hothead',
    attitude:'"Outta my way — I\'m already on fire."',
    desc:'A compact fireball of pure temper. His fists ignite before his brain catches up, and he has never — not once — walked away from a fight.',
    backstory:'Expelled from Ember Academy for incinerating the training dummies. And the gym. And the academy flag. The headmaster still twitches when anyone says his name.',
    special:'FIST FLURRY', specialDesc:'A blur of burning punches — Ruko unloads everything he has in seconds.',
    stats:'Brawler · Fast melee · Loves the front line'
  },
  guardian: {
    name:'BOULDER', title:'The Gentle Wall',
    attitude:'"Nobody touches my friends. NOBODY."',
    desc:'A walking hearthstone with a molten core and a loyal heart. Soft-spoken, immovable, and absolutely terrifying when roused.',
    backstory:'Spent a century as a family\'s fireplace stone, soaking up a hundred years of stories. Woke the night enemy torches came over the hill — and has been awake ever since.',
    special:'MAGMA TAUNT', specialDesc:'Boulder roars and draws every enemy blade onto himself. The team hits back untouched.',
    stats:'Guardian · Tank · Soaks damage for the squad'
  },
  archer: {
    name:'SIZZLE', title:'The Showoff',
    attitude:'"That miss? That was on purpose. Style points."',
    desc:'Lean, fast, and allergic to humility. A trick-shot sniper who celebrates every hit like she just won the championship.',
    backstory:'Born a stray campfire spark. Learned to fly straight by racing canyon winds — lost every race, claims she let them win.',
    special:'SPARK VOLLEY', specialDesc:'A fan of flaming arrows, all aimed with total (over)confidence.',
    stats:'Archer · Long range · High crit, low patience'
  },
  pyro: {
    name:'CINDER', title:'The Chaos Gremlin',
    attitude:'"Hehehe... did that explode? GOOD."',
    desc:'Unpredictable, unhinged, unforgettable. Giggles while things detonate. Banned from three armories and one very nice library.',
    backstory:'A wizard tried to bottle lightning. The bottle broke. Cinder didn\'t. Nobody has been able to explain her since — least of all Cinder.',
    special:'METEOR DROP', specialDesc:'Cinder points at the sky and a burning rock answers. Do not stand near the pointing.',
    stats:'Pyro · Splash damage · Chaos, but effective'
  },
  hero: {
    name:'BLAZE', title:'The Star-Crowned',
    attitude:'"Follow me. Try to keep up."',
    desc:'Your avatar — the one YOU drive with the joystick. Born leader, legendary smirk, main-character energy because he is the main character.',
    backstory:'Born from the first spark of the Eternal Flame. At the naming ceremony the star crown flew off its pedestal and chose him. It has never chosen wrong.',
    special:'FIRE NOVA', specialDesc:'The big one — a ring of starfire that melts everything around him. (That\'s your NOVA button.)',
    stats:'Hero · You control him · Respawns at your castle'
  },
  boss: {
    name:'LORD INFERNO', title:'The Wildfire King',
    attitude:'"Little flames. BOW."',
    desc:'Ancient, arrogant, enormous. Believes every small fire in the world answers to him. He is done waiting for them to kneel.',
    backstory:'The wildfire that ate the Old Kingdom three hundred years ago. Sealed in obsidian by the first Fire Babys. The seal just cracked.',
    special:'CATACLYSM SLAM', specialDesc:'He hits the ground and the ground breaks. Bring an army. Bring two.',
    stats:'Boss · Every 5 stages · The final wall'
  }
};
window.__FB_BIOS = BIOS;

/* ---------------- cosmetic renames (no stat changes) ---------------- */
UNIT_DEFS.brawler.name = 'Ruko';     UNIT_DEFS.brawler.skill.name = 'Fist Flurry';
UNIT_DEFS.guardian.name = 'Boulder'; UNIT_DEFS.guardian.skill.name = 'Magma Taunt';
UNIT_DEFS.archer.name = 'Sizzle';    UNIT_DEFS.archer.skill.name = 'Spark Volley';
UNIT_DEFS.pyro.name = 'Cinder';      UNIT_DEFS.pyro.skill.name = 'Meteor Drop';
UNIT_DEFS.boss.name = 'Lord Inferno'; UNIT_DEFS.boss.skill.name = 'Cataclysm Slam';

/* ---------------- codex styles ---------------- */
var css = document.createElement('style');
css.textContent = [
  '#codexBtn{pointer-events:auto;background:rgba(12,6,4,.72);border:1px solid rgba(255,150,60,.25);',
  'border-radius:999px;width:42px;height:42px;font-size:20px;color:#ffe9d6;cursor:pointer}',
  '#codexBtn:active{transform:scale(.92)}',
  '#codexOv{position:absolute;inset:0;z-index:40;background:rgba(8,3,2,.96);display:flex;flex-direction:column}',
  '#codexOv.hidden{display:none}',
  '#codexHead{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 8px}',
  '#codexHead h2{font-size:20px;letter-spacing:1px;color:#ffd76a;margin:0}',
  '#codexClose{background:rgba(255,120,40,.15);border:1px solid rgba(255,150,60,.4);color:#ffe9d6;',
  'border-radius:999px;width:38px;height:38px;font-size:18px;cursor:pointer}',
  '#codexSub{padding:0 16px 8px;font-size:12px;color:#c98a5a}',
  '#codexCards{flex:1;overflow-y:auto;padding:4px 12px 20px;-webkit-overflow-scrolling:touch}',
  '.cx-card{display:flex;gap:12px;background:rgba(30,12,6,.85);border:1px solid rgba(255,150,60,.25);',
  'border-radius:16px;padding:12px;margin:10px 0;align-items:flex-start}',
  '.cx-card canvas{flex:0 0 96px;width:96px;height:112px;background:radial-gradient(circle at 50% 40%,#3a1508,#120604);border-radius:12px}',
  '.cx-body{flex:1;min-width:0}',
  '.cx-name{font-size:17px;font-weight:900;color:#ffd76a;letter-spacing:.5px}',
  '.cx-title{font-size:12px;font-weight:700;color:#ff9d3c;margin:1px 0 6px}',
  '.cx-att{font-size:13px;font-style:italic;color:#ffe9d6;margin:0 0 6px}',
  '.cx-sec{font-size:11px;font-weight:800;color:#c98a5a;letter-spacing:1px;margin:6px 0 2px}',
  '.cx-txt{font-size:13px;line-height:1.45;color:#ffe9d6;margin:0}',
  '.cx-spec{font-size:13px;font-weight:800;color:#ff6a1e}',
  '.cx-stats{font-size:11px;color:#8a6a4a;margin-top:6px}'
].join('\n');
document.head.appendChild(css);

/* ---------------- portrait painter (uses the real game renderer) ---------------- */
function __fb_portrait(cv, key, isHero){
  var def = UNIT_DEFS[key];
  var pctx = cv.getContext('2d');
  var realCtx = ctx;
  ctx = pctx;
  try{
    var s = 30, k, a;
    pctx.clearRect(0, 0, 96, 112);
    pctx.save();
    pctx.translate(48, 60);
    /* flame spikes */
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
    /* body + core */
    pctx.fillStyle = def.body;
    pctx.beginPath(); pctx.arc(0, 0, s, 0, 6.2832); pctx.fill();
    pctx.fillStyle = def.core;
    pctx.beginPath(); pctx.arc(-s * 0.06, s * 0.06, s * 0.5, 0, 6.2832); pctx.fill();
    /* face + extras via the live renderer (patch 001's new look) */
    var fake = { key:key, faceX:1, isHero:!!isHero, colDark:def.dark, colMain:def.body, walkPh:1.3 };
    drawBabyExtras(fake, s, 1.3);
    drawBabyEyes(fake, s);
    /* tier ring */
    pctx.strokeStyle = '#ffd76a'; pctx.lineWidth = 3;
    pctx.beginPath(); pctx.arc(0, 0, s + 4, 0, 6.2832); pctx.stroke();
    pctx.restore();
  } finally {
    ctx = realCtx;
  }
}

/* ---------------- build the codex ---------------- */
function __fb_buildCodex(){
  if(document.getElementById('codexOv')) return;

  /* button in the HUD, next to sound */
  var hud = document.getElementById('hud');
  var mute = document.getElementById('muteBtn');
  var btn = document.createElement('button');
  btn.id = 'codexBtn';
  btn.textContent = '🔥';
  btn.setAttribute('aria-label', 'meet the fire babys');
  btn.addEventListener('click', function(){
    document.getElementById('codexOv').classList.remove('hidden');
    if(window.AudioSys) AudioSys.ui();
  });
  hud.insertBefore(btn, mute);

  /* overlay */
  var ov = document.createElement('div');
  ov.id = 'codexOv';
  ov.className = 'hidden';
  var order = ['hero', 'brawler', 'guardian', 'archer', 'pyro', 'boss'];
  var html = '<div id="codexHead"><h2>🔥 MEET THE BABYS</h2>' +
             '<button id="codexClose" aria-label="close">✕</button></div>' +
             '<div id="codexSub">Every warrior. Every attitude. Pick your favorites.</div>' +
             '<div id="codexCards"></div>';
  ov.innerHTML = html;
  document.getElementById('stage').appendChild(ov);
  ov.querySelector('#codexClose').addEventListener('click', function(){
    ov.classList.add('hidden');
    if(window.AudioSys) AudioSys.ui();
  });

  var cards = ov.querySelector('#codexCards');
  for(var i = 0; i < order.length; i++){
    (function(key){
      var b = BIOS[key];
      var isHero = (key === 'hero');
      var defKey = isHero ? 'brawler' : key;
      var card = document.createElement('div');
      card.className = 'cx-card';
      var cv = document.createElement('canvas');
      cv.width = 96; cv.height = 112;
      var body = document.createElement('div');
      body.className = 'cx-body';
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
      card.appendChild(cv);
      card.appendChild(body);
      cards.appendChild(card);
      __fb_portrait(cv, defKey, isHero);
    })(order[i]);
  }
}

/* build once the game UI exists */
if(document.getElementById('hud')) __fb_buildCodex();
else document.addEventListener('DOMContentLoaded', __fb_buildCodex);

})();
