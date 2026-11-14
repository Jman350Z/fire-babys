/* =====================================================================
   PATCH 022 — vault (personal armor chest)
   Date: 2026-10-03 | For: Jeff (Fire Babys)
   Directive: Jeff — "a personal armor chest that holds all the loot
     you get" and "add all that to all areas of the game." The Vault
     shows EVERYTHING the player owns: bronze pieces, silver status,
     Season 1 progress, and all 6 weapons. Shared localStorage keys
     with the 3D arena so loot syncs across both games automatically.
   What it changes:
     - 🗝️ Vault button in the HUD opens the trophy-room panel.
     - Reads bronze via window.__FB_BRONZE_ARMOR (patch 020) with a
       localStorage fallback; silver via fbSilver_unlocked cache;
       season via fbSeason1_* keys; weapons via fbWeapons_* keys.
     - Weapons can be EQUIPPED from the Vault (delegates to
       window.__FB_WEAPONS_2D when patch 024 is present).
     - DOM overlay only. No canvas, combat, or baseline changes.
   Touches: DOM (#fbVaultBtn in #hud, overlay div). No game-logic
     function is wrapped or replaced.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: tap 🗝️ — panel shows bronze pieces, season tier, weapons.
   ===================================================================== */
(function () {
  'use strict';

  var FBV = {};
  FBV.AUTH_URL = 'https://fire-babys-auth.jeffpruden288.workers.dev';

  /* Weapon display data mirrors the 3D arena roster (icons/names/mult). */
  FBV.WEAPONS = [
    { id: 'weapon_hose_blaster_01', icon: '🔥', name: 'High-Pressure Magma Hose', mult: 2.5 },
    { id: 'weapon_fist_gauntlets_02', icon: '🥊', name: 'Soot-Crusher Power Fists', mult: 2.2 },
    { id: 'weapon_ember_bow_04', icon: '🏹', name: 'Spitfire Precision Bow', mult: 2.0 },
    { id: 'weapon_scatter_bomb_05', icon: '💥', name: 'Blue-Tip Spark Grenade', mult: 2.4 },
    { id: 'weapon_anvil_drop_03', icon: '⚒️', name: 'Magma Core Anvil', mult: 3.0 },
    { id: 'weapon_inferno_staff_06', icon: '🔱', name: 'Underworld Doom Rod', mult: 3.5 },
  ];
  FBV.BRONZE_PIECES = [
    { key: 'greaves', icon: '🥾', name: 'Bronze Greaves', req: 'Stage 5' },
    { key: 'gauntlets', icon: '🧤', name: 'Bronze Gauntlets', req: 'Stage 10' },
    { key: 'helmet', icon: '🪖', name: 'Bronze Helmet', req: 'Stage 15' },
    { key: 'chestplate', icon: '🛡️', name: 'Bronze Chestplate', req: 'Stage 20' },
  ];

  /* ---------------- readers (shared keys with the 3D arena) ---------------- */
  FBV.getBronze = function () {
    try {
      if (window.__FB_BRONZE_ARMOR && typeof window.__FB_BRONZE_ARMOR.read === 'function') {
        return window.__FB_BRONZE_ARMOR.read();
      }
    } catch (e1) {}
    var pieces = {};
    try {
      var raw = localStorage.getItem('fb_bronze_armor_v1');
      if (raw) { var p = JSON.parse(raw); if (p && p.pieces) pieces = p.pieces; }
    } catch (e2) {}
    var keys = ['greaves', 'gauntlets', 'helmet', 'chestplate'];
    var n = 0, i;
    for (i = 0; i < keys.length; i++) { if (pieces[keys[i]]) n++; }
    return { pieces: pieces, count: n, boost: n * 0.025, fullSet: !!pieces.chestplate, maxStage: 0 };
  };

  FBV.getSilver = function () {
    var unlocked = false;
    try { unlocked = localStorage.getItem('fbSilver_unlocked') === '1'; } catch (e3) {}
    return { unlocked: unlocked };
  };

  FBV.getSeason = function () {
    var xp = 0, claimed = {};
    try { xp = parseInt(localStorage.getItem('fbSeason1_xp'), 10); if (isNaN(xp) || xp < 0) xp = 0; } catch (e4) {}
    try { var c = JSON.parse(localStorage.getItem('fbSeason1_claimed')); if (c) claimed = c; } catch (e5) {}
    var tier = Math.floor(xp / 100) + 1;
    if (tier < 1) tier = 1;
    if (tier > 20) tier = 20;
    return { xp: xp, tier: tier, claimed: claimed };
  };

  FBV.getWeapons = function () {
    var equipped = 'weapon_hose_blaster_01';
    var unlocked = ['weapon_hose_blaster_01'];
    try { var e = localStorage.getItem('fbWeapons_equipped'); if (e) equipped = e; } catch (e6) {}
    try { var u = JSON.parse(localStorage.getItem('fbWeapons_unlocked')); if (u && u.length !== undefined) unlocked = u; } catch (e7) {}
    return { equipped: equipped, unlocked: unlocked };
  };

  FBV.equipWeapon = function (id) {
    try {
      if (window.__FB_WEAPONS_2D && typeof window.__FB_WEAPONS_2D.equip === 'function') {
        return window.__FB_WEAPONS_2D.equip(id);
      }
    } catch (e8) {}
    return false;
  };

  /* ---------------- HUD button ---------------- */
  FBV.ensureBtn = function () {
    try {
      var hud = document.getElementById('hud');
      if (!hud || document.getElementById('fbVaultBtn')) return;
      var btn = document.createElement('button');
      btn.id = 'fbVaultBtn';
      btn.textContent = '🗝️';
      btn.setAttribute('aria-label', 'open your Vault — all your loot');
      btn.style.cssText = 'pointer-events:auto;background:rgba(12,6,4,.72);' +
        'border:1px solid rgba(255,215,106,.35);border-radius:10px;' +
        'font-size:20px;padding:6px 9px;margin-right:6px;cursor:pointer;';
      btn.addEventListener('click', function () {
        try { if (window.AudioSys) AudioSys.ui(); } catch (e9) {}
        FBV.openPanel();
      });
      var ref = document.getElementById('fb3dBtn') || document.getElementById('trailerBtn');
      if (ref) hud.insertBefore(btn, ref.nextSibling);
      else hud.appendChild(btn);
    } catch (e10) {}
  };

  /* ---------------- panel ---------------- */
  FBV.panel = null;
  FBV.closePanel = function () {
    try { if (FBV.panel && FBV.panel.parentNode) FBV.panel.parentNode.removeChild(FBV.panel); } catch (e11) {}
    FBV.panel = null;
  };

  FBV.slotHtml = function (icon, name, sub, locked) {
    var border = locked ? '#4a4a4a' : '#ffd76a';
    var op = locked ? 'opacity:0.55;' : '';
    return '<div style="flex:1 1 40%;min-width:120px;background:#160c06;border:2px solid ' + border +
      ';border-radius:12px;padding:10px 8px;text-align:center;' + op + '">' +
      '<div style="font-size:30px;">' + icon + '</div>' +
      '<div style="color:#fff;font-size:12px;font-weight:800;margin-top:4px;">' + name + '</div>' +
      '<div style="color:#d8b89a;font-size:11px;margin-top:2px;">' + sub + '</div></div>';
  };

  FBV.openPanel = function () {
    try {
      FBV.closePanel();
      var bronze = FBV.getBronze();
      var silver = FBV.getSilver();
      var season = FBV.getSeason();
      var weap = FBV.getWeapons();

      var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
        '<div style="color:#ffd76a;font-size:20px;font-weight:900;letter-spacing:2px;">🗝️ YOUR VAULT</div>' +
        '<button id="fbVaultX" style="background:#3a1c0c;color:#ffd76a;border:1px solid #ffd76a;border-radius:10px;font-size:16px;padding:6px 12px;cursor:pointer;">✕</button></div>' +
        '<div style="color:#d8b89a;font-size:12px;margin-bottom:12px;">Every piece of loot you own — shared with the 3D arena.</div>';

      /* bronze */
      html += '<div style="color:#cfcfcf;font-size:14px;font-weight:900;letter-spacing:1px;margin:8px 0 6px;">🥉 BRONZE KNIGHT' +
        (bronze.fullSet ? ' <span style="color:#ffd76a;">— FULL SET +10% ✨</span>' : ' <span style="color:#8a8a8a;">— ' + bronze.count + '/4</span>') + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
      for (var i = 0; i < FBV.BRONZE_PIECES.length; i++) {
        var bp = FBV.BRONZE_PIECES[i];
        var owned = !!(bronze.pieces && bronze.pieces[bp.key]);
        html += FBV.slotHtml(owned ? bp.icon : '🔒', bp.name, owned ? 'OWNED' : bp.req, !owned);
      }
      html += '</div>';

      /* silver */
      html += '<div style="color:#cfcfcf;font-size:14px;font-weight:900;letter-spacing:1px;margin:12px 0 6px;">🥈 SILVER</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
        FBV.slotHtml(silver.unlocked ? '⚔️' : '🔒', 'Silver Armor Set',
          silver.unlocked ? 'OWNED +20%' : 'Earn in the 3D arena (250 tasks)', !silver.unlocked) +
        '</div>';

      /* season */
      html += '<div style="color:#cfcfcf;font-size:14px;font-weight:900;letter-spacing:1px;margin:12px 0 6px;">🎫 SEASON 1: IGNITION</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
        FBV.slotHtml('🎫', 'Tier ' + season.tier + ' / 20', season.xp + ' XP', false) +
        '</div>';

      /* weapons */
      html += '<div style="color:#cfcfcf;font-size:14px;font-weight:900;letter-spacing:1px;margin:12px 0 6px;">⚔️ WEAPONS <span style="color:#8a8a8a;font-weight:400;">— tap to equip</span></div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
      for (var w = 0; w < FBV.WEAPONS.length; w++) {
        var wp = FBV.WEAPONS[w];
        var has = weap.unlocked.indexOf(wp.id) >= 0;
        var isEq = weap.equipped === wp.id;
        html += '<div data-wid="' + wp.id + '" data-owned="' + (has ? '1' : '0') + '" style="flex:1 1 40%;min-width:120px;background:' +
          (isEq ? '#3a2a10' : '#160c06') + ';border:2px solid ' + (isEq ? '#ff8c2e' : (has ? '#ffd76a' : '#4a4a4a')) +
          ';border-radius:12px;padding:10px 8px;text-align:center;cursor:' + (has ? 'pointer' : 'default') + ';' +
          (has ? '' : 'opacity:0.55;') + '">' +
          '<div style="font-size:30px;">' + (has ? wp.icon : '🔒') + '</div>' +
          '<div style="color:#fff;font-size:12px;font-weight:800;margin-top:4px;">' + wp.name + '</div>' +
          '<div style="color:#d8b89a;font-size:11px;margin-top:2px;">' + wp.mult + 'x damage' + (isEq ? ' — ✅ EQUIPPED' : '') + '</div></div>';
      }
      html += '</div>';

      var ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;z-index:99990;display:flex;align-items:flex-start;justify-content:center;background:rgba(8,4,2,0.85);padding:18px;box-sizing:border-box;overflow-y:auto;';
      ov.innerHTML = '<div style="width:100%;max-width:480px;background:linear-gradient(180deg,#241408,#120a05);border:3px solid #ffd76a;border-radius:20px;padding:18px;box-shadow:0 0 50px rgba(255,215,106,0.25);margin:auto;">' + html + '</div>';
      ov.querySelector('#fbVaultX').addEventListener('click', FBV.closePanel);
      ov.addEventListener('click', function (ev) {
        var cell = ev.target.closest ? ev.target.closest('[data-wid]') : null;
        if (cell && cell.getAttribute('data-owned') === '1') {
          var id = cell.getAttribute('data-wid');
          if (FBV.equipWeapon(id)) { FBV.openPanel(); }
        }
      });
      document.body.appendChild(ov);
      FBV.panel = ov;
    } catch (e12) {}
  };

  FBV.ensureBtn();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(FBV.ensureBtn, 1200); });
  } else {
    setTimeout(FBV.ensureBtn, 1200);
  }

  window.__FB_VAULT_2D = FBV;

})();
