/* =====================================================================
   PATCH 010 — elemental-armor-forge
   Date: 2026-10-01 | For: Jeff (Fire Babys)
   Directive: Jeff's armor-generator spec —
     generateElementalArmor(characterLevel, targetSlot) -> {
       id, name (e.g. 'Osmium-Plated Slag Carapace of Grounding'),
       slot: 'head'|'body'|'hand'|'aura',
       primaryElement, opposingElement,
       cosmeticPalette: { primaryColor, accentColor, glowColor },
       rarity: 'Common'|'Rare'|'Epic'|'Legendary'|'Elemental Master'
     }
   Notes on the build:
     - Signature honored exactly. One OPTIONAL 3rd param (seed) was added
       for deterministic testing; omit it and the forge uses Math.random.
     - Elements reuse patch 008's 10-element ladder (Sprout -> Devil-Dark).
       Opposing pairs: Sprout<->Shadow, Ember<->Frost, Flame<->Aqua,
       Terra<->Storm, Holy<->Devil-Dark.
     - Rarity is level-gated: higher characterLevel unlocks better odds.
       Elemental Master only appears at high levels.
     - Cosmetic-only (per the 008 decision): the forge returns looks and
       rarity, never stats. No combat function is touched.
   Touches: none — pure additive data + one global function. No baseline
     or earlier-patch function is wrapped.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: generateElementalArmor(20, 'body') returns the full shape.
   ===================================================================== */
(function(){
'use strict';

var FG = {};

/* ---------------- 1. elements (mirrors 008's ladder) ---------------- */
FG.ELEMENTS = [
  { name:'Sprout',     noun:'Seed',   opposing:'Shadow',
    palette:{ primaryColor:'#9be15d', accentColor:'#4a7a2e', glowColor:'#d6ffb0' } },
  { name:'Ember',      noun:'Ember',  opposing:'Frost',
    palette:{ primaryColor:'#ff9d3c', accentColor:'#8a4a12', glowColor:'#ffd9a0' } },
  { name:'Flame',      noun:'Blaze',  opposing:'Aqua',
    palette:{ primaryColor:'#ff5d2e', accentColor:'#7a1e08', glowColor:'#ffb09a' } },
  { name:'Aqua',       noun:'Tide',   opposing:'Flame',
    palette:{ primaryColor:'#3cb9ff', accentColor:'#0f4a7a', glowColor:'#bfe9ff' } },
  { name:'Terra',      noun:'Stone',  opposing:'Storm',
    palette:{ primaryColor:'#c98f4e', accentColor:'#5e3c14', glowColor:'#ecd3a8' } },
  { name:'Storm',      noun:'Tempest',opposing:'Terra',
    palette:{ primaryColor:'#b06eff', accentColor:'#3d1a7a', glowColor:'#ddc2ff' } },
  { name:'Frost',      noun:'Frost',  opposing:'Ember',
    palette:{ primaryColor:'#aef1ff', accentColor:'#2e6a7a', glowColor:'#ffffff' } },
  { name:'Holy',       noun:'Dawn',   opposing:'Devil-Dark',
    palette:{ primaryColor:'#fff3b0', accentColor:'#8a7a2e', glowColor:'#fffbe0' } },
  { name:'Shadow',     noun:'Dusk',   opposing:'Sprout',
    palette:{ primaryColor:'#8f7bd8', accentColor:'#2e245e', glowColor:'#c9bcff' } },
  { name:'Devil-Dark', noun:'Slag',   opposing:'Holy',
    palette:{ primaryColor:'#ff4e9a', accentColor:'#5e0a2e', glowColor:'#ffb3d4' } }
];

FG.SLOTS = ['head', 'body', 'hand', 'aura'];

FG.PIECES = {
  head: ['Helm', 'Crown', 'Crest'],
  body: ['Carapace', 'Plate', 'Mail'],
  hand: ['Gauntlets', 'Grips', 'Claws'],
  aura: ['Halo', 'Shroud', 'Nimbus']
};

FG.MATERIALS = {
  'Common':          ['Iron', 'Bronze', 'Leather', 'Oak'],
  'Rare':            ['Steel', 'Silver', 'Coral', 'Granite'],
  'Epic':            ['Titanium', 'Crystal', 'Obsidian', 'Pearl'],
  'Legendary':       ['Mythril', 'Dragonbone', 'Stormglass', 'Sunsteel'],
  'Elemental Master':['Osmium', 'Starforged', 'Voidweave', 'Dawnforged']
};
FG.FINISHES = ['Plated', 'Etched', 'Woven', 'Infused', 'Bound'];

FG.SUFFIXES = ['Grounding', 'the Dawn', 'Embers', 'the Tides', 'Storms',
  'the Frost', 'Radiance', 'Shadows', 'the Abyss', 'Beginnings'];

/* rarity odds by character level: [Common, Rare, Epic, Legendary, Master] */
FG.ODDS = function(level){
  var l = Math.max(1, Math.floor(level) || 1);
  if(l >= 13) return [0, 0, 30, 45, 25];
  if(l >= 8)  return [0, 40, 35, 20, 5];
  if(l >= 4)  return [45, 35, 15, 5, 0];
  return [70, 25, 5, 0, 0];
};
FG.RARITIES = ['Common', 'Rare', 'Epic', 'Legendary', 'Elemental Master'];

/* ---------------- 2. the forge ---------------- */
FG.rng = function(seed){
  var s = (seed === undefined ? Math.floor(Math.random() * 4294967296) : seed) >>> 0 || 1;
  return function(){
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
};

function generateElementalArmor(characterLevel, targetSlot, seed){
  var r = FG.rng(seed);
  var pick = function(a){ return a[Math.floor(r() * a.length)]; };
  var slot = FG.SLOTS.indexOf(targetSlot) >= 0 ? targetSlot : pick(FG.SLOTS);
  var el = pick(FG.ELEMENTS);

  /* rarity roll, level-gated */
  var odds = FG.ODDS(characterLevel), roll = r() * 100, acc = 0, rarity = 'Common';
  for(var i = 0; i < odds.length; i++){
    acc += odds[i];
    if(roll < acc){ rarity = FG.RARITIES[i]; break; }
  }

  var material = pick(FG.MATERIALS[rarity]);
  var finish = pick(FG.FINISHES);
  var piece = pick(FG.PIECES[slot]);
  var suffix = pick(FG.SUFFIXES);
  var name = material + '-' + finish + ' ' + el.noun + ' ' + piece + ' of ' + suffix;
  var idNum = Math.floor(r() * 46656); /* 36^3 */
  var id = 'ar-' + el.name.toLowerCase().replace(/[^a-z]/g, '') + '-' +
           slot + '-' + idNum.toString(36);

  return {
    id: id,
    name: name,
    slot: slot,
    primaryElement: el.name,
    opposingElement: el.opposing,
    cosmeticPalette: {
      primaryColor: el.palette.primaryColor,
      accentColor: el.palette.accentColor,
      glowColor: el.palette.glowColor
    },
    rarity: rarity
  };
}

/* expose globally: the game (and future store UI) calls this */
if(typeof window !== 'undefined'){
  window.generateElementalArmor = generateElementalArmor;
  window.__ARFORGE_DEBUG = {
    ELEMENTS: FG.ELEMENTS, SLOTS: FG.SLOTS, RARITIES: FG.RARITIES,
    ODDS: FG.ODDS, MATERIALS: FG.MATERIALS,
    generate: generateElementalArmor
  };
} else if(typeof global !== 'undefined'){
  global.generateElementalArmor = generateElementalArmor;
}

})();
