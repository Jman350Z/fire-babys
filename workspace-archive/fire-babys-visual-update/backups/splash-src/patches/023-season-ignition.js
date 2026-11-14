/* =====================================================================
   PATCH 023 — season-1-ignition (battle pass)
   Date: 2026-10-03 | For: Jeff (Fire Babys)
   Directive: Jeff — "add all that to all areas of the game." Season 1:
     IGNITION comes to the 2D game: 20 tiers, XP from level wins and
     boss kills, auto-claimed rewards identical to the 3D arena.
     Shared localStorage keys (fbSeason1_*) so season progress syncs
     across the 2D game and 3D arena automatically.
   What it changes:
     - 🎫 Season button in the HUD opens the battle-pass panel
       (20 tiers, XP bar, reward list).
     - Level win: +50 XP. Boss (Inferno) kill: +50 XP. (Mirrors the
       3D arena's task/KO XP values.)
     - Tier rewards AUTO-CLAIM when XP crosses the tier, exactly like
       the 3D arena: coins->gold, gems->gems, badges, emotes, boosts,
       and weapons (tiers 8/16/20 unlock via patch 024).
     - Defensive server sync to /profile/season (same endpoint the
       3D arena uses).
     - DOM overlay only. Wraps Game.checkEnd + Game.onKill (chained).
   Touches: Game.checkEnd (chained), Game.onKill (chained),
     DOM (#fbSeasonBtn in #hud, overlay div).
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: beat a level -> +50 XP toast; reach 100 XP -> tier 1 auto-claim.
   ===================================================================== */
(function () {
  'use strict';

  var FBS = {};
  FBS.AUTH_URL = 'https://fire-babys-auth.jeffpruden288.workers.dev';
  FBS.TIERS = 20;
  FBS.XP_PER_TIER = 100;
  FBS.MAX_XP = 2000;
  FBS.BOOST_TIERS = [5, 14, 20];

  /* Free-track rewards, tiers 1..20 — identical to the 3D arena. */
  FBS.REWARDS = [
    { t: 'coins', n: 50,  e: '🪙', name: '50 Coins' },
    { t: 'badge', id: 'first_spark', e: '🔥', name: 'First Spark Badge' },
    { t: 'emote', id: 'clap', e: '👏', name: 'Clap Emote' },
    { t: 'coins', n: 100, e: '🪙', name: '100 Coins' },
    { t: 'boost', n: 0.01, e: '🌟', name: '+1% Boost' },
    { t: 'badge', id: 'bucket_brigade', e: '🪣', name: 'Bucket Brigade Badge' },
    { t: 'gems',  n: 5,   e: '💎', name: '5 Gems' },
    { t: 'emote', id: 'spin', e: '🌀', name: 'Spin Emote + 🏹 Spitfire Bow', weapon: 'weapon_ember_bow_04' },
    { t: 'coins', n: 150, e: '🪙', name: '150 Coins' },
    { t: 'badge', id: 'smoke_alarm_hero', e: '🚨', name: 'Smoke Alarm Hero Badge' },
    { t: 'gems',  n: 10,  e: '💎', name: '10 Gems' },
    { t: 'emote', id: 'dance', e: '💃', name: 'Dance Emote' },
    { t: 'coins', n: 200, e: '🪙', name: '200 Coins' },
    { t: 'boost', n: 0.01, e: '🌟', name: '+1% Boost' },
    { t: 'badge', id: 'extinguisher_pro', e: '🧯', name: 'Extinguisher Pro Badge' },
    { t: 'gems',  n: 15,  e: '💎', name: '15 Gems + 💥 Spark Grenade', weapon: 'weapon_scatter_bomb_05' },
    { t: 'emote', id: 'fire_spin', e: '🔥', name: 'Fire Spin Emote' },
    { t: 'coins', n: 300, e: '🪙', name: '300 Coins' },
    { t: 'badge', id: 'inferno_legend', e: '🌋', name: 'Inferno Legend Badge' },
    { t: 'crown', e: '👑', name: 'IGNITION CROWN + 🔱 Doom Rod', gems: 25, boost: 0.01, weapon: 'weapon_inferno_staff_06' },
  ];

  /* ---------------- state (same keys as the 3D arena) ---------------- */
  FBS.state = { xp: 0, claimed: {}, badges: [] };

  FBS.load = function () {
    try {
      var xp = parseInt(localStorage.getItem('fbSeason1_xp'), 10);
      if (!isNaN(xp) && xp >= 0) FBS.state.xp = Math.min(FBS.MAX_XP, xp);
      var cl = localStorage.getItem('fbSeason1_claimed');
      if (cl) { var c = JSON.parse(cl); if (c) FBS.state.claimed = c; }
      var bg = localStorage.getItem('fbSeason1_badges');
      if (bg) { var b = JSON.parse(bg); if (b && b.length !== undefined) FBS.state.badges = b; }
    } catch (e1) {}
  };

  FBS.save = function () {
    try {
      localStorage.setItem('fbSeason1_xp', String(FBS.state.xp));
      localStorage.setItem('fbSeason1_claimed', JSON.stringify(FBS.state.claimed));
      localStorage.setItem('fbSeason1_badges', JSON.stringify(FBS.state.badges));
      localStorage.setItem('fbSeason1_boost', String(FBS.boost()));
    } catch (e2) {}
  };

  /* Season boost is derived from claimed tiers — never stored blindly. */
  FBS.boost = function () {
    var n = 0, i;
    for (i = 0; i < FBS.BOOST_TIERS.length; i++) {
      if (FBS.state.claimed[FBS.BOOST_TIERS[i]]) n++;
    }
    return Math.round(n * 0.01 * 10000) / 10000;
  };

  FBS.tier = function () {
    var t = Math.floor(FBS.state.xp / FBS.XP_PER_TIER) + 1;
    if (t < 1) t = 1;
    if (t > FBS.TIERS) t = FBS.TIERS;
    return t;
  };

  /* ---------------- rewards ---------------- */
  FBS.grantEmote = function (id) {
    try {
      var raw = localStorage.getItem('fbSeason1_emotes2d');
      var list = raw ? JSON.parse(raw) : [];
      if (!list || list.length === undefined) list = [];
      if (list.indexOf(id) < 0) list.push(id);
      localStorage.setItem('fbSeason1_emotes2d', JSON.stringify(list));
    } catch (e3) {}
  };

  FBS.grant = function (r) {
    try {
      if (r.t === 'coins') {
        if (typeof SaveSys !== 'undefined' && SaveSys.data) {
          SaveSys.data.gold = (SaveSys.data.gold || 0) + r.n;
          if (typeof SaveSys.save === 'function') SaveSys.save();
          if (typeof UI !== 'undefined' && typeof UI.syncGold === 'function') UI.syncGold();
        }
      } else if (r.t === 'gems') {
        if (typeof SaveSys !== 'undefined' && SaveSys.data) {
          SaveSys.data.gems = (SaveSys.data.gems || 0) + r.n;
          if (typeof SaveSys.save === 'function') SaveSys.save();
        }
      } else if (r.t === 'emote') {
        FBS.grantEmote(r.id);
      } else if (r.t === 'badge') {
        if (FBS.state.badges.indexOf(r.id) < 0) FBS.state.badges.push(r.id);
      } else if (r.t === 'boost') {
        /* boost is derived from claimed tiers in FBS.boost() — nothing to add */
      } else if (r.t === 'crown') {
        if (typeof SaveSys !== 'undefined' && SaveSys.data) {
          SaveSys.data.gems = (SaveSys.data.gems || 0) + (r.gems || 0);
          if (typeof SaveSys.save === 'function') SaveSys.save();
        }
        if (FBS.state.badges.indexOf('ignition_crown') < 0) FBS.state.badges.push('ignition_crown');
      }
      /* a weapon unlock can ride along with any reward type (patch 024) */
      if (r.weapon) {
        try {
          if (window.__FB_WEAPONS_2D && typeof window.__FB_WEAPONS_2D.unlock === 'function') {
            window.__FB_WEAPONS_2D.unlock(r.weapon);
          }
        } catch (e4) {}
      }
    } catch (e5) {}
  };

  FBS.claimTier = function (tier) {
    if (FBS.state.claimed[tier]) return;
    var r = FBS.REWARDS[tier - 1];
    if (!r) return;
    FBS.state.claimed[tier] = true;
    FBS.grant(r);
    FBS.save();
    FBS.toast('🎫 TIER ' + tier + ': ' + r.e + ' ' + r.name + '!');
  };

  /* ---------------- XP ---------------- */
  FBS.addXP = function (n) {
    try {
      n = n || 0;
      if (n <= 0) return;
      var before = Math.floor(FBS.state.xp / FBS.XP_PER_TIER);
      FBS.state.xp = Math.min(FBS.MAX_XP, FBS.state.xp + n);
      var after = Math.floor(FBS.state.xp / FBS.XP_PER_TIER);
      if (after > before) {
        for (var t = before + 1; t <= after && t <= FBS.TIERS; t++) {
          FBS.claimTier(t);
        }
        FBS.sync();
      }
      FBS.save();
    } catch (e6) {}
  };

  /* ---------------- server sync (defensive) ---------------- */
  FBS.token = function () {
    try {
      if (window.FireBabysAuth && window.FireBabysAuth.getToken) {
        return window.FireBabysAuth.getToken();
      }
    } catch (e7) {}
    return null;
  };

  FBS.sync = function () {
    var t = FBS.token();
    if (!t) return;
    try {
      fetch(FBS.AUTH_URL + '/profile/season', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: t, season: 'ignition', xp: FBS.state.xp,
          tier: FBS.tier(), badges: FBS.state.badges, boost: FBS.boost() }),
      }).catch(function () {});
    } catch (e8) {}
  };

  /* ---------------- toast ---------------- */
  FBS.toast = function (msg) {
    try {
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:99995;' +
        'background:rgba(20,10,4,0.94);border:2px solid #ffd76a;border-radius:14px;color:#ffd76a;' +
        'font-size:15px;font-weight:800;padding:12px 18px;max-width:86%;text-align:center;pointer-events:none;';
      d.textContent = msg;
      document.body.appendChild(d);
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 3200);
    } catch (e9) {}
  };

  /* ---------------- hooks ---------------- */
  if (typeof Game !== 'undefined' && Game.checkEnd) {
    var __s23_origCheckEnd = Game.checkEnd;
    Game.checkEnd = function () {
      var wasWon = this.won;
      __s23_origCheckEnd.apply(this, arguments);
      try {
        if (this.won && !wasWon) FBS.addXP(50); /* level win: +50 XP */
      } catch (e10) {}
    };
  }

  if (typeof Game !== 'undefined' && Game.onKill) {
    var __s23_origOnKill = Game.onKill;
    Game.onKill = function (t, byHero) {
      __s23_origOnKill.apply(this, arguments);
      try {
        if (t && t.key === 'boss' && t.side === 1) FBS.addXP(50); /* boss kill: +50 XP */
      } catch (e11) {}
    };
  }

  /* ---------------- HUD button ---------------- */
  FBS.ensureBtn = function () {
    try {
      var hud = document.getElementById('hud');
      if (!hud || document.getElementById('fbSeasonBtn')) return;
      var btn = document.createElement('button');
      btn.id = 'fbSeasonBtn';
      btn.textContent = '🎫';
      btn.setAttribute('aria-label', 'Season 1 Ignition battle pass');
      btn.style.cssText = 'pointer-events:auto;background:rgba(12,6,4,.72);' +
        'border:1px solid rgba(255,150,60,.25);border-radius:10px;' +
        'font-size:20px;padding:6px 9px;margin-right:6px;cursor:pointer;';
      btn.addEventListener('click', function () {
        try { if (window.AudioSys) AudioSys.ui(); } catch (e12) {}
        FBS.openPanel();
      });
      var ref = document.getElementById('fbVaultBtn') || document.getElementById('fb3dBtn') || document.getElementById('trailerBtn');
      if (ref) hud.insertBefore(btn, ref.nextSibling);
      else hud.appendChild(btn);
    } catch (e13) {}
  };

  /* ---------------- panel ---------------- */
  FBS.panel = null;
  FBS.closePanel = function () {
    try { if (FBS.panel && FBS.panel.parentNode) FBS.panel.parentNode.removeChild(FBS.panel); } catch (e14) {}
    FBS.panel = null;
  };

  FBS.openPanel = function () {
    try {
      FBS.closePanel();
      var tier = FBS.tier();
      var pct = Math.min(100, Math.round((FBS.state.xp / FBS.MAX_XP) * 100));
      var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
        '<div style="color:#ffd76a;font-size:20px;font-weight:900;letter-spacing:2px;">🎫 SEASON 1: IGNITION</div>' +
        '<button id="fbSeasonX" style="background:#3a1c0c;color:#ffd76a;border:1px solid #ffd76a;border-radius:10px;font-size:16px;padding:6px 12px;cursor:pointer;">✕</button></div>' +
        '<div style="color:#d8b89a;font-size:12px;margin-bottom:10px;">Win levels (+50 XP) and slay the Inferno boss (+50 XP). Rewards auto-claim!</div>' +
        '<div style="background:#0e0703;border-radius:10px;height:16px;overflow:hidden;margin-bottom:4px;">' +
        '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#ff8c2e,#ffd76a);"></div></div>' +
        '<div style="color:#fff;font-size:13px;font-weight:800;margin-bottom:12px;">Tier ' + tier + ' / 20 — ' + FBS.state.xp + ' XP' +
        (FBS.boost() > 0 ? ' — <span style="color:#ffd76a;">+' + Math.round(FBS.boost() * 100) + '% boost</span>' : '') + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:6px;max-height:46vh;overflow-y:auto;">';
      for (var t = 1; t <= FBS.TIERS; t++) {
        var r = FBS.REWARDS[t - 1];
        var claimed = !!FBS.state.claimed[t];
        var reached = Math.floor(FBS.state.xp / FBS.XP_PER_TIER) >= t;
        var st = claimed ? '✅' : (reached ? '🎁' : '🔒');
        html += '<div style="display:flex;align-items:center;gap:10px;background:#160c06;border:1px solid ' +
          (claimed ? '#ffd76a' : '#3a2a18') + ';border-radius:10px;padding:8px 10px;' + (claimed ? '' : 'opacity:0.75;') + '">' +
          '<div style="color:#ffd76a;font-size:13px;font-weight:900;min-width:58px;">TIER ' + t + '</div>' +
          '<div style="font-size:22px;">' + st + ' ' + r.e + '</div>' +
          '<div style="color:#fff;font-size:12px;font-weight:700;flex:1;">' + r.name + '</div></div>';
      }
      html += '</div>';
      var ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;z-index:99990;display:flex;align-items:flex-start;justify-content:center;background:rgba(8,4,2,0.85);padding:18px;box-sizing:border-box;overflow-y:auto;';
      ov.innerHTML = '<div style="width:100%;max-width:480px;background:linear-gradient(180deg,#241408,#120a05);border:3px solid #ffd76a;border-radius:20px;padding:18px;margin:auto;">' + html + '</div>';
      ov.querySelector('#fbSeasonX').addEventListener('click', FBS.closePanel);
      document.body.appendChild(ov);
      FBS.panel = ov;
    } catch (e15) {}
  };

  /* ---------------- boot ---------------- */
  FBS.load();
  FBS.ensureBtn();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(FBS.ensureBtn, 1200); });
  } else {
    setTimeout(FBS.ensureBtn, 1200);
  }

  window.__FB_SEASON_2D = FBS;

})();
