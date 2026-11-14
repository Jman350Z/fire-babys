/* =====================================================================
   PATCH 008 — elemental-armor-lore
   Date: 2026-10-01 | For: Jeff (Fire Babys)
   Directive: "Rethink" — (1) ALL elements come from ARMOR: every fire
     baby starts as a junior-school kid wearing Sprout training armor;
     when they graduate to high school they test the ELEMENTAL ARMOR
     GENERATOR, which forges their true armor. (2) The Generator is the
     future store: thousands of procedural armor styles, from Holy
     element armor all the way to Devil-Dark armor.
   Design calls (Jeff said "update the game"; defaults disclosed):
     - NEW CHAPTER, not a retcon: the current crew keeps everything they
       have (incl. patch 007's signature tools). Their power is now
       framed as channeled through armor — they've been wearing Sprout
       training armor all along; the Generator unlocks at graduation.
       Nothing in 007 or earlier is rewritten or rebalanced.
     - COSMETIC-FIRST: armor styles change looks + rarity only, never
       stats. Fair for kids, parent-friendly; stat armor can come later
       if Jeff wants it. The store panel is a "coming soon" teaser —
       real purchases need native app-store builds (web can't do IAP).
   What it changes:
     - AR.ELEMENTS: 10-element ladder — Sprout (training), Ember, Flame,
       Aqua, Terra, Storm, Frost, Holy (mythic), Shadow (mythic),
       Devil-Dark (abyssal). Each: rarity, color, 1-line lore.
     - AR.forge(seed): deterministic procedural armor —
       10 elements x 4 palettes x 6 accessories x 4 trims x 5 sigils =
       4,800 styles ("thousands"). Named like
       "Holy Dawn Crest Helm of the Crown Sigil".
     - Hero bios (window.__FB_BIOS): +armor field and one armor sentence
       appended to desc — renders automatically in the 002 codex.
       Boss gets "wears no armor — he IS the wildfire."
     - drawBabyExtras: player-side babies get subtle Sprout-Armor
       shoulder plates (ember trim). Round bodies, expressive mouths,
       ZERO bird traits. Boss untouched.
     - Deploy screen: #arForge teaser panel — the Generator's lore +
       3 rotating preview armors, "coming soon" store note. Hidden
       during fights, like 007's briefing.
     - Victory: one graduation-progress hint per stage via UI.hint.
   Touches: window.__FB_BIOS (mutates desc/armor fields only),
     drawBabyExtras (chained after 007), Game.toDeploy / Game.startFight /
     Game.checkEnd (chained after 007). Originals kept as __ar_orig*.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: deploy screen shows the ARMOR GENERATOR panel; codex bios mention
     Sprout Armor; player babies wear little ember shoulder plates.
   ===================================================================== */
(function(){
'use strict';

var AR = { forgeIdx: 0, gradHintFor: -1 };

/* ---------------- 1. DATA: the element ladder ---------------- */
AR.ELEMENTS = [
  { name:'Sprout',     rarity:'Training', color:'#9be15d',
    lore:'Worn by every junior-school baby. No powers of its own — it keeps you safe while you learn.' },
  { name:'Ember',      rarity:'Common',   color:'#ff9d3c',
    lore:'The first true element. Warm, loyal, a little reckless.' },
  { name:'Flame',      rarity:'Common',   color:'#ff5d2e',
    lore:'Ember\'s bigger sibling. Hits hot, burns bright.' },
  { name:'Aqua',       rarity:'Rare',     color:'#3cb9ff',
    lore:'Flows around trouble instead of through it.' },
  { name:'Terra',      rarity:'Rare',     color:'#c98f4e',
    lore:'Stands its ground. Literally. It is the ground.' },
  { name:'Storm',      rarity:'Epic',     color:'#b06eff',
    lore:'Fast, loud, and impossible to schedule.' },
  { name:'Frost',      rarity:'Epic',     color:'#aef1ff',
    lore:'Cool under pressure. The calmest element in the room.' },
  { name:'Holy',       rarity:'Mythic',   color:'#fff3b0',
    lore:'Radiant armor of the dawn guard. Legends are forged in it.' },
  { name:'Shadow',     rarity:'Mythic',   color:'#8f7bd8',
    lore:'Moves between heartbeats. You never see it coming.' },
  { name:'Devil-Dark', rarity:'Abyssal',  color:'#ff4e9a',
    lore:'The deepest forge. Spooky-cool, not spooky-mean — attitude is everything.' }
];
AR.PALETTES = ['Dawn', 'Dusk', 'Emberfall', 'Tidebound'];
AR.ACCESSORIES = ['Crest Helm', 'Shoulder Plates', 'Battle Cape', 'Ember Boots', 'Sigil Belt', 'Star Diadem'];
AR.TRIMS = ['Gold', 'Silver', 'Obsidian', 'Pearl'];
AR.SIGILS = ['Spark', 'Wave', 'Leaf', 'Bolt', 'Crown'];
AR.STYLE_COUNT = AR.ELEMENTS.length * AR.PALETTES.length *
                 AR.ACCESSORIES.length * AR.TRIMS.length * AR.SIGILS.length; /* 4800 */

/* deterministic PRNG so a seed always forges the same armor */
AR.rng = function(seed){
  var s = (seed >>> 0) || 1;
  return function(){
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
};

AR.forge = function(seed){
  var r = AR.rng(seed), pick = function(a){ return a[Math.floor(r() * a.length)]; };
  var el = pick(AR.ELEMENTS);
  var pal = pick(AR.PALETTES), acc = pick(AR.ACCESSORIES),
      trim = pick(AR.TRIMS), sig = pick(AR.SIGILS);
  return {
    element: el.name, rarity: el.rarity, color: el.color,
    palette: pal, accessory: acc, trim: trim, sigil: sig,
    name: el.name + ' ' + pal + ' ' + acc + ' of the ' + sigilName(sig) + ' Sigil',
    trimName: trim
  };
  function sigilName(s){ return s; }
};

AR.elementByName = function(n){
  for(var i = 0; i < AR.ELEMENTS.length; i++)
    if(AR.ELEMENTS[i].name === n) return AR.ELEMENTS[i];
  return AR.ELEMENTS[0];
};

/* ---------------- 2. hero bios: armor becomes canon ---------------- */
AR.ARMOR_NOTES = {
  brawler:  'His Fist Flurry burns through hand-me-down Sprout Armor — training gear every junior-school baby wears until high-school graduation unlocks the Elemental Armor Generator.',
  guardian: 'Her plates are dented Sprout Armor from a hundred playground battles. She can\'t wait to test the Armor Generator at graduation — she has her eye on Terra.',
  archer:   'Her trick shots are pure skill; her Sprout Armor just keeps her safe while she shows off. Graduation can\'t come fast enough — she wants the Armor Generator to forge her Storm armor.',
  pyro:     'Sprout Armor, third-hand, slightly singed (her own fault). The Armor Generator attendants have been warned about her. She wants Devil-Dark.',
  hero:     'Your avatar\'s star crown sits over classic Sprout Armor — the same training gear every baby starts in. What the Armor Generator forges for him at graduation is up to YOU.'
};
if(typeof window !== 'undefined' && window.__FB_BIOS){
  var __ar_bios = window.__FB_BIOS, __ar_k;
  for(__ar_k in AR.ARMOR_NOTES){
    if(__ar_bios[__ar_k]){
      __ar_bios[__ar_k].armor = 'Sprout Armor (Training)';
      __ar_bios[__ar_k].desc += ' ' + AR.ARMOR_NOTES[__ar_k];
    }
  }
  if(__ar_bios.boss){
    __ar_bios.boss.armor = 'None — the Wildfire King wears no armor. He IS the wildfire.';
  }
}

/* ---------------- 3. Sprout-Armor shoulder plates (player babies) ---------------- */
var __ar_origExtras = (typeof drawBabyExtras !== 'undefined') ? drawBabyExtras : null;
if(__ar_origExtras){
drawBabyExtras = function(u, s, t){
  __ar_origExtras(u, s, t);
  /* player-side babies only, never the boss, never villains-with-class-art conflict */
  if(!u || u.side !== 0 || u.key === 'boss' || u.isHero === undefined) return;
  if(u.key !== 'brawler' && u.key !== 'guardian' && u.key !== 'archer' &&
     u.key !== 'pyro' && u.key !== 'hero') return;
  ctx.save();
  /* little ember-trimmed Sprout Armor pauldrons */
  ctx.fillStyle = '#7a5c3a';
  ctx.strokeStyle = '#ff9d3c'; ctx.lineWidth = Math.max(1.5, s * 0.06);
  ctx.beginPath(); ctx.arc(-s * 0.62, -s * 0.28, s * 0.30, Math.PI * 0.9, Math.PI * 1.9); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc( s * 0.62, -s * 0.28, s * 0.30, Math.PI * 1.1, Math.PI * 2.1); ctx.fill(); ctx.stroke();
  /* tiny sprout-leaf badge: this is TRAINING armor */
  ctx.fillStyle = '#9be15d';
  ctx.beginPath(); ctx.ellipse(0, -s * 0.52, s * 0.10, s * 0.16, 0.5, 0, 6.2832); ctx.fill();
  ctx.restore();
};
} /* end if(__ar_origExtras) */

/* ---------------- 4. deploy-screen Generator teaser (DOM) ---------------- */
AR.ensureDom = function(){
  if(typeof document === 'undefined') return false;
  var stage = document.getElementById('stage');
  if(!stage) return false;
  if(!document.getElementById('arForge')){
    var p = document.createElement('div');
    p.id = 'arForge';
    p.style.cssText = 'position:absolute;top:104px;left:8px;right:8px;z-index:6;' +
      'pointer-events:none;text-align:center;font:700 11px/1.55 system-ui,sans-serif;' +
      'color:#ffe9d6;background:rgba(24,10,32,0.85);border:1px solid rgba(176,110,255,0.55);' +
      'border-radius:10px;padding:7px 10px;display:none;letter-spacing:0.3px;';
    stage.appendChild(p);
  }
  return true;
};

AR.showForge = function(){
  if(!AR.ensureDom()) return;
  var el = document.getElementById('arForge');
  if(!el) return;
  var a = AR.forge(1000 + AR.forgeIdx * 77 + 3),
      b = AR.forge(1000 + AR.forgeIdx * 77 + 17),
      c = AR.forge(1000 + AR.forgeIdx * 77 + 42);
  AR.forgeIdx++;
  var chip = function(x){
    return '<span style="color:' + x.color + '">' + x.name +
           ' <span style="opacity:0.7">[' + x.rarity + ']</span></span>';
  };
  el.innerHTML = '<div style="font-weight:900;letter-spacing:1.5px;color:#d9b8ff">' +
    'ELEMENTAL ARMOR GENERATOR</div>' +
    '<div style="opacity:0.85">Every baby starts in Sprout training armor. Graduate junior school, ' +
    'test the Generator in high school — ALL elements come from armor.</div>' +
    '<div style="margin-top:3px">' + chip(a) + ' · ' + chip(b) + ' · ' + chip(c) + '</div>' +
    '<div style="opacity:0.65;font-size:10.5px;margin-top:2px">' + AR.STYLE_COUNT +
    ' styles from Holy to Devil-Dark — armor store coming soon.</div>';
  el.style.display = 'block';
};

AR.hideForge = function(){
  if(typeof document === 'undefined') return;
  var el = document.getElementById('arForge');
  if(el) el.style.display = 'none';
};

if(typeof Game !== 'undefined'){
  if(typeof Game.toDeploy === 'function'){
    var __ar_origToDeploy = Game.toDeploy;
    Game.toDeploy = function(){
      __ar_origToDeploy.call(Game);
      AR.showForge();
    };
  }
  if(typeof Game.startFight === 'function'){
    var __ar_origStartFight = Game.startFight;
    Game.startFight = function(){
      __ar_origStartFight.call(Game);
      if(Game.phase === 'fight') AR.hideForge();
    };
  }
  if(typeof Game.checkEnd === 'function'){
    var __ar_origCheckEnd = Game.checkEnd;
    Game.checkEnd = function(){
      __ar_origCheckEnd.call(Game);
      if(Game.phase === 'over' && Game.won && AR.gradHintFor !== Game.stage){
        AR.gradHintFor = Game.stage;
        if(typeof UI !== 'undefined' && UI.hint)
          UI.hint('Victory! One battle closer to graduation — the Elemental Armor Generator awaits in high school!');
      }
    };
  }
}

/* debug/test handle for the verifier harness */
if(typeof window !== 'undefined'){
  window.__AR_DEBUG = {
    ELEMENTS: AR.ELEMENTS, STYLE_COUNT: AR.STYLE_COUNT,
    forge: AR.forge, elementByName: AR.elementByName,
    PALETTES: AR.PALETTES, ACCESSORIES: AR.ACCESSORIES,
    TRIMS: AR.TRIMS, SIGILS: AR.SIGILS
  };
}

})();
