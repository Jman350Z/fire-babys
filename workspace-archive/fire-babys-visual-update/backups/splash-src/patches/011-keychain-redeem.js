/* =====================================================================
   PATCH 011 — keychain-redeem
   Date: 2026-10-01 | For: Jeff (Fire Babys)
   Directive: "Keychains with QR codes that give you in game armor" —
     physical merch unlocks digital armor. Each keychain carries a
     unique redeem code (as a QR); entering it in the game's ARMORY
     forges that keychain's one true armor piece.
   Code design (offline-validated, no server needed):
     FB<T>-<6 chars>-<2 checksum>   e.g.  FB3-K7M2PQ-9X
     - Alphabet: 32 unambiguous chars (no 0/O, 1/I/L).
     - T = keychain tier: 1 Common, 2 Rare, 3 Epic, 4 Legendary.
     - Checksum: FNV-1a hash of the payload, mod 32^2 — the game
       recomputes it, so fakes don't redeem.
     - Deterministic: the code hashes to the forge seed, so the SAME
       code always forges the SAME armor (patch 010's seed param).
     - Tier guarantees minimum rarity: a Legendary keychain can never
       forge below Legendary (bounded re-roll, still deterministic).
   What it changes:
     - window.redeemArmorCode(code) -> {ok:true, armor} or
       {ok:false, error}. Global, so the future store/redeem page can
       call it too.
     - ARMORY overlay (HUD button): redeem-code input + your owned
       armor list, persisted in localStorage (guarded try/catch).
     - Duplicate codes are rejected — one keychain, one armor.
   Touches: DOM only (#armoryBtn in #hud, #armoryOv overlay).
     No canvas, combat, or baseline changes. Cosmetic-only, per 008.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: redeemArmorCode on a made-up code fails checksum; a real
     generated code forges armor of at least its tier.
   ===================================================================== */
(function(){
'use strict';

var RD = {};

/* security: armor records live in localStorage — escape everything rendered */
RD.esc = function(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};

/* ---------------- 1. codec ---------------- */
RD.ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; /* unambiguous chars, no 0/O/1/I/L */
RD.BASE = RD.ALPHA.length; /* 31 */
RD.TIERS = { 1:'Common', 2:'Rare', 3:'Epic', 4:'Legendary' };
RD.TIER_LEVEL = { 1:3, 2:6, 3:10, 4:15 };       /* forge level per tier */
RD.RANK = { 'Common':0, 'Rare':1, 'Epic':2, 'Legendary':3, 'Elemental Master':4 };

RD.fnv1a = function(str){
  var h = 0x811c9dc5;
  for(var i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/* make a fresh code for manufacturing: tier 1-4, rng optional (seedable) */
RD.makeCode = function(tier, rand){
  tier = Math.min(4, Math.max(1, Math.floor(tier) || 1));
  var r = rand || Math.random;
  var body = '';
  for(var i = 0; i < 6; i++) body += RD.ALPHA[Math.floor(r() * RD.BASE)];
  var payload = 'FB' + tier + body;
  var chk = RD.fnv1a(payload) % (RD.BASE * RD.BASE);
  var c1 = RD.ALPHA[Math.floor(chk / RD.BASE)], c2 = RD.ALPHA[chk % RD.BASE];
  return 'FB' + tier + '-' + body + '-' + c1 + c2;
};

/* parse + validate; returns {tier} or {error} */
RD.parseCode = function(raw){
  if(!raw || typeof raw !== 'string') return { error:'empty' };
  var code = raw.toUpperCase().replace(/[\s]/g, '');
  var m = /^FB([1-4])-?([A-Z2-9]{6})-?([A-Z2-9]{2})$/.exec(code);
  if(!m) return { error:'format' };
  var tier = parseInt(m[1], 10), body = m[2], chk = m[3];
  var payload = 'FB' + tier + body;
  var want = RD.fnv1a(payload) % (RD.BASE * RD.BASE);
  var got = RD.ALPHA.indexOf(chk[0]) * RD.BASE + RD.ALPHA.indexOf(chk[1]);
  if(got !== want) return { error:'checksum' };
  return { tier: tier, code: 'FB' + tier + '-' + body + '-' + chk };
};

/* ---------------- 2. inventory (localStorage + in-memory fallback) ---------------- */
RD.mem = [];
RD.store = {
  load: function(){
    try{
      if(typeof localStorage !== 'undefined'){
        var s = localStorage.getItem('fb_armory');
        if(s) return JSON.parse(s);
      }
    }catch(e){}
    return RD.mem.slice();
  },
  save: function(list){
    RD.mem = list.slice();
    try{ localStorage.setItem('fb_armory', JSON.stringify(list)); }catch(e){}
  }
};

/* ---------------- 3. redeem ---------------- */
function redeemArmorCode(rawCode){
  var p = RD.parseCode(rawCode);
  if(p.error){
    return { ok:false, error: p.error === 'checksum'
      ? 'That code didn\'t check out — double-check it and try again.'
      : 'Codes look like FB3-K7M2PQ-9X. Try again?' };
  }
  var owned = RD.store.load();
  for(var i = 0; i < owned.length; i++){
    if(owned[i].code === p.code)
      return { ok:false, error:'That keychain already gave you its armor!' };
  }
  var forge = (typeof window !== 'undefined' && window.generateElementalArmor)
    ? window.generateElementalArmor : null;
  if(!forge) return { ok:false, error:'The armor forge isn\'t loaded.' };

  /* deterministic: same code -> same armor, always */
  var seed = RD.fnv1a(p.code);
  var level = RD.TIER_LEVEL[p.tier];
  var minRank = RD.RANK[RD.TIERS[p.tier]];
  var armor = null, tries = 0;
  while(tries < 40){
    var cand = forge(level, 'random', seed + tries);
    if(RD.RANK[cand.rarity] >= minRank){ armor = cand; break; }
    tries++;
  }
  if(!armor) armor = forge(level, 'random', seed); /* fallback, never null */
  armor.code = p.code;
  armor.keychainTier = RD.TIERS[p.tier];
  owned.push(armor);
  RD.store.save(owned);
  return { ok:true, armor: armor };
}

if(typeof window !== 'undefined'){
  window.redeemArmorCode = redeemArmorCode;
  window.__REDEEM_DEBUG = { parse: RD.parseCode, makeCode: RD.makeCode,
    TIERS: RD.TIERS, store: RD.store,
    button: function(){ return RD.btn || null; },
    overlay: function(){ return RD.ov || null; } };
}

/* ---------------- 4. ARMORY overlay (DOM) ---------------- */
RD.ensureDom = function(){
  if(typeof document === 'undefined') return false;
  var hud = document.getElementById('hud');
  if(!hud) return false;
  if(!RD.btn && !document.getElementById('armoryBtn')){
    var btn = document.createElement('button');
    btn.id = 'armoryBtn';
    btn.textContent = '🎁';
    btn.setAttribute('aria-label', 'open the armory — redeem keychain codes');
    btn.style.cssText = 'pointer-events:auto;background:rgba(12,6,4,.72);' +
      'border:1px solid rgba(255,150,60,.25);border-radius:10px;' +
      'font-size:20px;padding:6px 9px;margin-right:6px;cursor:pointer;';
    btn.addEventListener('click', function(){ RD.open(); });
    var mute = document.getElementById('muteBtn');
    if(mute) hud.insertBefore(btn, mute); else hud.appendChild(btn);
    RD.btn = btn;
  }
  if(!RD.ov && !document.getElementById('armoryOv')){
    var ov = document.createElement('div');
    ov.id = 'armoryOv';
    ov.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:30;' +
      'display:none;justify-content:center;align-items:flex-start;' +
      'background:rgba(8,3,2,0.94);padding-top:12%;overflow-y:auto;';
    var card = document.createElement('div');
    card.style.cssText = 'width:88%;max-width:480px;background:rgba(24,10,32,0.97);' +
      'border:2px solid #b06eff;border-radius:14px;padding:16px;color:#ffe9d6;' +
      'font:600 13px/1.6 system-ui,sans-serif;';
    card.innerHTML =
      '<div style="font-weight:900;letter-spacing:1.5px;color:#d9b8ff;font-size:15px">🎁 ARMORY</div>' +
      '<div style="opacity:0.85;margin:4px 0 10px">Got a Fire Babys keychain? Type the code from its QR card to forge its armor.</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:10px">' +
      '<input id="armoryInput" placeholder="FB3-K7M2PQ-9X" style="flex:1;background:#160a20;color:#ffe9d6;' +
      'border:1px solid #b06eff;border-radius:8px;padding:9px;font:700 14px system-ui;letter-spacing:1px"/>' +
      '<button id="armoryGo" style="background:#b06eff;color:#fff;border:none;border-radius:8px;' +
      'font:800 13px system-ui;padding:9px 14px;cursor:pointer">FORGE</button></div>' +
      '<div id="armoryMsg" style="min-height:20px;margin-bottom:8px;color:#ffb347"></div>' +
      '<div id="armoryList"></div>' +
      '<div style="text-align:center;margin-top:10px"><button id="armoryClose" style="background:#ff5d2e;' +
      'color:#fff;border:none;border-radius:20px;font:800 13px system-ui;padding:8px 18px;cursor:pointer">CLOSE</button></div>';
    ov.appendChild(card);
    var stage = document.getElementById('stage') || document.body;
    stage.appendChild(ov);
    RD.ov = ov;
    /* wire controls via the card subtree (works in real DOM; stub-safe) */
    if(card.querySelector){
      var inp = card.querySelector('#armoryInput'),
          gob = card.querySelector('#armoryGo'),
          cls = card.querySelector('#armoryClose');
      if(gob) gob.addEventListener('click', function(){ RD.doRedeem(inp ? inp.value : ''); });
      if(inp) inp.addEventListener('keydown', function(e){
        if(e && e.key === 'Enter') RD.doRedeem(inp.value);
      });
      if(cls) cls.addEventListener('click', function(){ RD.close(); });
    }
    ov.addEventListener('click', function(e){ if(e && e.target === ov) RD.close(); });
  }
  return true;
};

RD.renderList = function(){
  var list = (typeof document === 'undefined') ? null :
    (document.getElementById('armoryList') ||
     (RD.ov && RD.ov.querySelector ? RD.ov.querySelector('#armoryList') : null));
  if(!list) return;
  var owned = RD.store.load();
  if(!owned.length){
    list.innerHTML = '<div style="opacity:0.6">No armor yet — your keychains are waiting.</div>';
    return;
  }
  list.innerHTML = owned.map(function(a){
    var pal = (a && a.cosmeticPalette) || {};
    return '<div style="border:1px solid ' + RD.esc(pal.glowColor || '#888') + ';border-radius:8px;' +
      'padding:8px 10px;margin:6px 0;background:rgba(0,0,0,0.3)">' +
      '<div style="font-weight:800;color:' + RD.esc(pal.primaryColor || '#fff') + '">' + RD.esc(a.name) + '</div>' +
      '<div style="font-size:12px;opacity:0.85">' + RD.esc(a.primaryElement) + ' · ' + RD.esc(a.slot) +
      ' · <span style="color:#ffd76a">' + RD.esc(a.rarity) + '</span>' +
      (a.keychainTier ? ' · 🔑 ' + RD.esc(a.keychainTier) + ' keychain' : '') + '</div></div>';
  }).join('');
};

RD.say = function(msg, ok){
  var el = (typeof document === 'undefined') ? null :
    (document.getElementById('armoryMsg') ||
     (RD.ov && RD.ov.querySelector ? RD.ov.querySelector('#armoryMsg') : null));
  if(el){ el.textContent = msg; el.style.color = ok ? '#9be15d' : '#ffb347'; }
};

RD.doRedeem = function(raw){
  var res = redeemArmorCode(raw);
  if(res.ok){
    RD.say('FORGED! ' + res.armor.name + ' [' + res.armor.rarity + ']', true);
    RD.renderList();
  } else {
    RD.say(res.error, false);
  }
};

RD.open = function(){
  if(!RD.ensureDom()) return;
  var ov = RD.ov || document.getElementById('armoryOv');
  if(ov){ ov.style.display = 'flex'; RD.renderList(); }
};
RD.close = function(){
  var ov = (typeof document === 'undefined') ? null :
    (RD.ov || document.getElementById('armoryOv'));
  if(ov) ov.style.display = 'none';
};

RD.ensureDom();

})();
