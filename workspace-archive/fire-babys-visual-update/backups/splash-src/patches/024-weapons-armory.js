/* =====================================================================
   PATCH 024 — weapons-armory (6-weapon combat system)
   Date: 2026-10-03 | For: Jeff (Fire Babys)
   Directive: Jeff — "add all that to all areas of the game." Jeff's
     official 6-weapon roster comes to the 2D game: armory panel,
     unlock progression, and damage multipliers wired into 2D combat.
     Shared localStorage keys (fbWeapons_*) so weapons sync across
     the 2D game and 3D arena automatically.
   What it changes:
     - ⚔️ Armory button in the HUD: all 6 weapons, tap to equip.
     - Unlocks: Hose = starter; Fists = full bronze set;
       Bow = Season 1 tier 8; Grenade = Season 1 tier 16;
       Anvil = silver armor; Doom Rod = Season 1 tier 20.
       checkUnlocks() runs on boot, level wins, and panel opens
       (retroactive-safe).
     - Combat: hero-dealt damage (dealDamage with byHero, and the
       hero's castle strikes) is multiplied by the equipped weapon.
     - Silver status is read from the auth server (/profile/get) and
       cached to fbSilver_unlocked for offline reads.
     - Defensive server sync to /profile/weapons.
   Touches: dealDamage (wrapped), castleStrike (wrapped),
     DOM (#fbArmoryBtn in #hud, overlay div). Baseline untouched.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: equip Doom Rod (if unlocked) -> hero hits deal 3.5x damage.
   ===================================================================== */
(function () {
  'use strict';

  var FBW = {};
  FBW.AUTH_URL = 'https://fire-babys-auth.jeffpruden288.workers.dev';
  FBW.STARTER = 'weapon_hose_blaster_01';

  /* Jeff's official roster — multipliers are his design, never changed here. */
  FBW.WEAPONS = [
    { id: 'weapon_hose_blaster_01', icon: '🔥', name: 'High-Pressure Magma Hose', cls: 'Blaze', mult: 2.5, element: 'Plasma Fire', effect: 'Area-of-Effect Splash', unlock: 'starter', unlockText: 'Starter weapon — yours from the beginning!' },
    { id: 'weapon_fist_gauntlets_02', icon: '🥊', name: 'Soot-Crusher Power Fists', cls: 'Ruko', mult: 2.2, element: 'Kinetic Impact', effect: 'Armor-Piercing Slam', unlock: 'bronze_full', unlockText: 'Full BRONZE set (all 4 pieces)' },
    { id: 'weapon_ember_bow_04', icon: '🏹', name: 'Spitfire Precision Bow', cls: 'Sizzle', mult: 2.0, element: 'Ignition Arrow', effect: 'Long-Range Pierce', unlock: 'season8', unlockText: 'Season 1 — Tier 8' },
    { id: 'weapon_scatter_bomb_05', icon: '💥', name: 'Blue-Tip Spark Grenade', cls: 'Cinder', mult: 2.4, element: 'Wild Chaos', effect: 'Multi-Split Explosion', unlock: 'season16', unlockText: 'Season 1 — Tier 16' },
    { id: 'weapon_anvil_drop_03', icon: '⚒️', name: 'Magma Core Anvil', cls: 'Boulder', mult: 3.0, element: 'Earth-Magma', effect: 'Vertical Crush', unlock: 'silver', unlockText: 'SILVER armor (all 250 tasks)' },
    { id: 'weapon_inferno_staff_06', icon: '🔱', name: 'Underworld Doom Rod', cls: 'Lord Inferno', mult: 3.5, element: 'Dark Slag', effect: 'Boss Terrain Scorcher', unlock: 'season20', unlockText: 'Season 1 — Tier 20 (Ignition Crown)' },
  ];

  /* ---------------- state (same keys as the 3D arena) ---------------- */
  FBW.equipped = FBW.STARTER;
  FBW.unlocked = [FBW.STARTER];

  FBW.load = function () {
    try {
      var eq = localStorage.getItem('fbWeapons_equipped');
      if (eq) FBW.equipped = eq;
      var un = localStorage.getItem('fbWeapons_unlocked');
      if (un) { var u = JSON.parse(un); if (u && u.length !== undefined) FBW.unlocked = u; }
      if (FBW.unlocked.indexOf(FBW.STARTER) < 0) FBW.unlocked.unshift(FBW.STARTER);
      if (FBW.byId(FBW.equipped) && FBW.unlocked.indexOf(FBW.equipped) < 0) {
        FBW.equipped = FBW.STARTER;
      }
    } catch (e1) {}
  };

  FBW.save = function () {
    try {
      localStorage.setItem('fbWeapons_equipped', FBW.equipped);
      localStorage.setItem('fbWeapons_unlocked', JSON.stringify(FBW.unlocked));
    } catch (e2) {}
  };

  FBW.byId = function (id) {
    for (var i = 0; i < FBW.WEAPONS.length; i++) {
      if (FBW.WEAPONS[i].id === id) return FBW.WEAPONS[i];
    }
    return null;
  };

  /* Equipped weapon's damage multiplier (1 = safe fallback). */
  FBW.mult = function () {
    try {
      var w = FBW.byId(FBW.equipped);
      if (w && FBW.unlocked.indexOf(w.id) >= 0 && typeof w.mult === 'number') return w.mult;
    } catch (e3) {}
    return 1;
  };

  /* ---------------- unlock conditions ---------------- */
  FBW.bronzeFull = function () {
    try {
      if (window.__FB_BRONZE_ARMOR && typeof window.__FB_BRONZE_ARMOR.read === 'function') {
        return !!window.__FB_BRONZE_ARMOR.read().fullSet;
      }
    } catch (e4) {}
    try {
      var raw = localStorage.getItem('fb_bronze_armor_v1');
      if (raw) { var p = JSON.parse(raw); return !!(p && p.pieces && p.pieces.chestplate); }
    } catch (e5) {}
    return false;
  };

  FBW.silverUnlocked = function () {
    try { return localStorage.getItem('fbSilver_unlocked') === '1'; } catch (e6) {}
    return false;
  };

  FBW.seasonClaimed = function (t) {
    try {
      var raw = localStorage.getItem('fbSeason1_claimed');
      if (raw) { var c = JSON.parse(raw); return !!(c && c[t]); }
    } catch (e7) {}
    return false;
  };

  FBW.unlockedBy = function (id) {
    var w = FBW.byId(id);
    if (!w) return false;
    switch (w.unlock) {
      case 'starter': return true;
      case 'bronze_full': return FBW.bronzeFull();
      case 'silver': return FBW.silverUnlocked();
      case 'season8': return FBW.seasonClaimed(8);
      case 'season16': return FBW.seasonClaimed(16);
      case 'season20': return FBW.seasonClaimed(20);
      default: return false;
    }
  };

  FBW.unlock = function (id, silent) {
    try {
      if (FBW.unlocked.indexOf(id) >= 0) return false;
      if (!FBW.byId(id)) return false;
      FBW.unlocked.push(id);
      FBW.save();
      FBW.sync();
      if (!silent) {
        var w = FBW.byId(id);
        FBW.toast('⚔️ WEAPON UNLOCKED: ' + w.icon + ' ' + w.name + '!');
      }
      return true;
    } catch (e8) { return false; }
  };

  FBW.checkUnlocks = function () {
    try {
      var changed = false;
      for (var i = 0; i < FBW.WEAPONS.length; i++) {
        var w = FBW.WEAPONS[i];
        if (FBW.unlocked.indexOf(w.id) < 0 && FBW.unlockedBy(w.id)) {
          if (FBW.unlock(w.id)) changed = true;
        }
      }
      return changed;
    } catch (e9) { return false; }
  };

  FBW.equip = function (id) {
    try {
      if (FBW.unlocked.indexOf(id) < 0) return false;
      if (!FBW.byId(id)) return false;
      FBW.equipped = id;
      FBW.save();
      FBW.sync();
      var w = FBW.byId(id);
      FBW.toast('⚔️ WIELDING: ' + w.icon + ' ' + w.name + ' (' + w.mult + 'x)');
      return true;
    } catch (e10) { return false; }
  };

  /* ---------------- toast ---------------- */
  FBW.toast = function (msg) {
    try {
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:99995;' +
        'background:rgba(20,10,4,0.94);border:2px solid #ff8c2e;border-radius:14px;color:#ffb347;' +
        'font-size:15px;font-weight:800;padding:12px 18px;max-width:86%;text-align:center;pointer-events:none;';
      d.textContent = msg;
      document.body.appendChild(d);
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 3200);
    } catch (e11) {}
  };

  /* ---------------- server: silver status + weapon sync (defensive) ---------------- */
  FBW.token = function () {
    try {
      if (window.FireBabysAuth && window.FireBabysAuth.getToken) {
        return window.FireBabysAuth.getToken();
      }
    } catch (e12) {}
    return null;
  };

  FBW.fetchSilver = function () {
    var t = FBW.token();
    if (!t) return;
    try {
      fetch(FBW.AUTH_URL + '/profile/get', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: t }),
      }).then(function (r) { return r.json(); }).then(function (j) {
        try {
          if (j && j.ok && j.profile && j.profile.silverUnlocked) {
            localStorage.setItem('fbSilver_unlocked', '1');
            FBW.checkUnlocks();
          }
        } catch (e13) {}
      }).catch(function () {});
    } catch (e14) {}
  };

  FBW.sync = function () {
    var t = FBW.token();
    if (!t) return;
    try {
      fetch(FBW.AUTH_URL + '/profile/weapons', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: t, unlocked: FBW.unlocked, equipped: FBW.equipped }),
      }).catch(function () {});
    } catch (e15) {}
  };

  /* ---------------- combat wraps ---------------- */
  /* Hero-dealt unit damage: multiply by the equipped weapon. */
  if (typeof dealDamage !== 'undefined') {
    var __w24_origDealDamage = dealDamage;
    dealDamage = function (t, raw, isCrit, sx, sy, byHero) {
      try {
        if (byHero) raw = raw * FBW.mult();
      } catch (e16) {}
      return __w24_origDealDamage(t, raw, isCrit, sx, sy, byHero);
    };
  }

  /* Hero's castle strikes: scale the unit's damage for the strike only. */
  if (typeof castleStrike !== 'undefined') {
    var __w24_origCastleStrike = castleStrike;
    castleStrike = function (u) {
      if (u && u.isHero) {
        var od = u.dmg, m = 1;
        try { m = FBW.mult(); } catch (e17) {}
        u.dmg = od * m;
        try {
          __w24_origCastleStrike(u);
        } finally {
          u.dmg = od;
        }
        return;
      }
      return __w24_origCastleStrike(u);
    };
  }

  /* Re-check unlocks after level wins (season tiers may have unlocked). */
  if (typeof Game !== 'undefined' && Game.checkEnd) {
    var __w24_origCheckEnd = Game.checkEnd;
    Game.checkEnd = function () {
      __w24_origCheckEnd.apply(this, arguments);
      try { FBW.checkUnlocks(); } catch (e18) {}
    };
  }

  /* ---------------- HUD button ---------------- */
  FBW.ensureBtn = function () {
    try {
      var hud = document.getElementById('hud');
      if (!hud || document.getElementById('fbArmoryBtn')) return;
      var btn = document.createElement('button');
      btn.id = 'fbArmoryBtn';
      btn.textContent = '⚔️';
      btn.setAttribute('aria-label', 'open the armory — choose your weapon');
      btn.style.cssText = 'pointer-events:auto;background:rgba(12,6,4,.72);' +
        'border:1px solid rgba(255,150,60,.25);border-radius:10px;' +
        'font-size:20px;padding:6px 9px;margin-right:6px;cursor:pointer;';
      btn.addEventListener('click', function () {
        try { if (window.AudioSys) AudioSys.ui(); } catch (e19) {}
        FBW.checkUnlocks();
        FBW.openPanel();
      });
      var ref = document.getElementById('fbSeasonBtn') || document.getElementById('fbVaultBtn') || document.getElementById('fb3dBtn') || document.getElementById('trailerBtn');
      if (ref) hud.insertBefore(btn, ref.nextSibling);
      else hud.appendChild(btn);
    } catch (e20) {}
  };

  /* ---------------- armory panel ---------------- */
  FBW.panel = null;
  FBW.closePanel = function () {
    try { if (FBW.panel && FBW.panel.parentNode) FBW.panel.parentNode.removeChild(FBW.panel); } catch (e21) {}
    FBW.panel = null;
  };

  FBW.openPanel = function () {
    try {
      FBW.closePanel();
      var w = FBW.byId(FBW.equipped);
      var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
        '<div style="color:#ff8c2e;font-size:20px;font-weight:900;letter-spacing:2px;">⚔️ ARMORY</div>' +
        '<button id="fbArmoryX" style="background:#3a1c0c;color:#ff8c2e;border:1px solid #ff8c2e;border-radius:10px;font-size:16px;padding:6px 12px;cursor:pointer;">✕</button></div>' +
        '<div style="color:#d8b89a;font-size:12px;margin-bottom:4px;">WIELDING: <span style="color:#ffb347;font-weight:800;">' +
        (w ? w.icon + ' ' + w.name + ' (' + w.mult + 'x)' : '—') + '</span></div>' +
        '<div style="color:#8a8a8a;font-size:11px;margin-bottom:12px;">Tap an unlocked weapon to equip it. Multipliers are Jeff\'s design.</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px;max-height:52vh;overflow-y:auto;">';
      for (var i = 0; i < FBW.WEAPONS.length; i++) {
        var wp = FBW.WEAPONS[i];
        var has = FBW.unlocked.indexOf(wp.id) >= 0;
        var isEq = FBW.equipped === wp.id;
        html += '<div data-wid="' + wp.id + '" data-owned="' + (has ? '1' : '0') + '" style="background:' +
          (isEq ? '#3a2410' : '#160c06') + ';border:2px solid ' + (isEq ? '#ff8c2e' : (has ? '#ffd76a' : '#4a4a4a')) +
          ';border-radius:12px;padding:10px 12px;cursor:' + (has ? 'pointer' : 'default') + ';' +
          (has ? '' : 'opacity:0.6;') + '">' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
          '<div style="font-size:32px;">' + (has ? wp.icon : '🔒') + '</div>' +
          '<div style="flex:1;"><div style="color:#fff;font-size:14px;font-weight:800;">' + wp.name +
          (isEq ? ' <span style="color:#ff8c2e;">✅</span>' : '') + '</div>' +
          '<div style="color:#d8b89a;font-size:11px;">' + wp.cls + ' · ' + wp.element + ' · ' + wp.effect + '</div>' +
          '<div style="color:#8a8a8a;font-size:11px;margin-top:2px;">' + (has ? wp.mult + 'x damage' : wp.unlockText) + '</div></div></div></div>';
      }
      html += '</div>';
      var ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;z-index:99990;display:flex;align-items:flex-start;justify-content:center;background:rgba(8,4,2,0.85);padding:18px;box-sizing:border-box;overflow-y:auto;';
      ov.innerHTML = '<div style="width:100%;max-width:480px;background:linear-gradient(180deg,#241408,#120a05);border:3px solid #ff8c2e;border-radius:20px;padding:18px;margin:auto;">' + html + '</div>';
      ov.querySelector('#fbArmoryX').addEventListener('click', FBW.closePanel);
      ov.addEventListener('click', function (ev) {
        var cell = ev.target.closest ? ev.target.closest('[data-wid]') : null;
        if (cell && cell.getAttribute('data-owned') === '1') {
          if (FBW.equip(cell.getAttribute('data-wid'))) { FBW.openPanel(); }
        }
      });
      document.body.appendChild(ov);
      FBW.panel = ov;
    } catch (e22) {}
  };

  /* ---------------- boot ---------------- */
  FBW.load();
  FBW.ensureBtn();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () { FBW.ensureBtn(); FBW.fetchSilver(); FBW.checkUnlocks(); }, 1500);
    });
  } else {
    setTimeout(function () { FBW.ensureBtn(); FBW.fetchSilver(); FBW.checkUnlocks(); }, 1500);
  }

  window.__FB_WEAPONS_2D = FBW;

})();
