/* =====================================================================
   PATCH 018 — audio-engine  (Pillar 1: Audio Signature Architecture)
   Date: 2026-10-02 | For: Jeff (Fire Babys)
   Directive: 6 Pillars of Power, Pillar 1. Vanilla Web Audio API, zero
     external sound files — 100% synthesized so the file stays light.
   What it changes:
     - Extends the baseline AudioSys with 4 signature procedural cues:
         deployPop()        — bouncy pitch-bend when a baby drops in
         attackClash()      — short crisp noise burst (low-passed) for
                              melee impacts
         extinguishSizzle() — white-noise hiss with rapid exponential
                              gain decay when an enemy is doused/smothered
         alarm()            — two-tone emergency siren (used by the
                              castle-evacuation safety mechanic)
     - Hooks: pop on every player-side spawn, clash layered onto
       melee-range (<=70px) non-crit impacts, sizzle when a fire-class
       enemy (patch 007's Wildfire Legion) is extinguished.
     - Guarantees the explicit Mute/Unmute toggle button exists in the
       HUD and stays wired to AudioSys.toggle() (the baseline already
       ships #muteBtn; this patch re-asserts it so it can never go
       missing, and never builds a second one).
   Touches: AudioSys (4 new methods only — no baseline method is
     redefined), spawnUnit, dealDamage, killUnit (all chained),
     DOM (#muteBtn in #hud, verified).
   How to disable: set "enabled": false for this file in
     patches/manifest.json, then run: python3 src/build.py
   Test (node harness): window.__AE_DEBUG.hasCue('deployPop') etc. are
     true and __AE_DEBUG.muteButton() is non-null.
   ===================================================================== */
(function(){
'use strict';

var AE = {};

/* ---------------- 1. the signature cues (all synthesized) ---------------- */
if(typeof AudioSys !== 'undefined'){
  /* Bouncy pitch-bend: baby drops on a tile. Two quick boings. */
  AudioSys.deployPop = function(){
    this.tone(300, 880, 0.10, 'sine', 0.070);
    this.tone(520, 1420, 0.09, 'sine', 0.055, 0.08);
    this.tone(700, 1050, 0.12, 'triangle', 0.050, 0.15);
  };
  /* Short crisp noise burst through a low-pass: melee impact. */
  AudioSys.attackClash = function(){
    this.noise(0.07, 0.085, 1100);
    this.tone(2200, 900, 0.05, 'square', 0.030);
  };
  /* White-noise hiss, rapid exponential decay: enemy doused/smothered. */
  AudioSys.extinguishSizzle = function(){
    this.noise(0.50, 0.075, 5200);
    this.noise(0.28, 0.050, 3400, 0.06);
  };
  /* Two-tone emergency siren: castle evacuation (Pillar 6). */
  AudioSys.alarm = function(){
    for(var i = 0; i < 3; i++){
      this.tone(660, 660, 0.16, 'square', 0.055, i * 0.34);
      this.tone(880, 880, 0.16, 'square', 0.055, i * 0.34 + 0.17);
    }
  };
}

/* ---------------- 2. hooks ---------------- */
/* Pop when a baby drops in on the player's side. Chains after 007. */
var __ae_origSpawnUnit = (typeof spawnUnit !== 'undefined') ? spawnUnit : null;
if(__ae_origSpawnUnit){
  spawnUnit = function(side, key, tier, x, y, hpMult, isHero){
    var i = __ae_origSpawnUnit(side, key, tier, x, y, hpMult, isHero);
    if(i >= 0 && side === 0 && typeof AudioSys !== 'undefined'){
      try{ AudioSys.deployPop(); }catch(e){}
    }
    return i;
  };
}

/* Crisp clash layered onto melee-range, non-crit impacts. Chains after 007. */
var __ae_origDamage = (typeof dealDamage !== 'undefined') ? dealDamage : null;
if(__ae_origDamage){
  dealDamage = function(t, raw, isCrit, sx, sy, byHero){
    if(t && t.active && !isCrit && typeof sx === 'number' && typeof sy === 'number'
       && typeof AudioSys !== 'undefined'){
      var dx = sx - t.x, dy = sy - t.y;
      if(dx * dx + dy * dy < 70 * 70){
        try{ AudioSys.attackClash(); }catch(e){}
      }
    }
    __ae_origDamage(t, raw, isCrit, sx, sy, byHero);
  };
}

/* Sizzle when a fire-class enemy is extinguished. */
var __ae_origKill = (typeof killUnit !== 'undefined') ? killUnit : null;
if(__ae_origKill){
  killUnit = function(t, sx, sy, byHero){
    if(t && t.fireClass && t.side === 1 && typeof AudioSys !== 'undefined'){
      try{ AudioSys.extinguishSizzle(); }catch(e){}
    }
    __ae_origKill(t, sx, sy, byHero);
  };
}

/* ---------------- 3. mute/unmute toggle: guaranteed present ---------------- */
AE.ensureMute = function(){
  if(typeof document === 'undefined') return false;
  var hud = document.getElementById('hud');
  if(!hud) return false;
  var btn = document.getElementById('muteBtn');
  if(btn) return true; /* baseline already ships it — never build a second */
  btn = document.createElement('button');
  btn.id = 'muteBtn';
  btn.textContent = '🔊';
  btn.setAttribute('aria-label', 'mute or unmute game audio');
  btn.style.cssText = 'pointer-events:auto;background:rgba(12,6,4,.72);' +
    'border:1px solid rgba(255,150,60,.25);border-radius:10px;' +
    'font-size:20px;padding:6px 9px;margin-right:6px;cursor:pointer;';
  btn.addEventListener('click', function(){
    var on = true;
    try{
      on = AudioSys.toggle();
      SaveSys.data.muted = !on;
      SaveSys.save();
    }catch(e){}
    btn.textContent = on ? '🔊' : '🔇';
  });
  hud.appendChild(btn);
  return true;
};
AE.ensureMute();

/* debug/test handle for the verifier harness */
if(typeof window !== 'undefined'){
  window.__AE_DEBUG = {
    cues: ['deployPop', 'attackClash', 'extinguishSizzle', 'alarm'],
    hasCue: function(n){
      return !!(typeof AudioSys !== 'undefined' && AudioSys[n]);
    },
    muteButton: function(){
      if(typeof document === 'undefined') return null;
      return document.getElementById('muteBtn');
    }
  };
}

})();
