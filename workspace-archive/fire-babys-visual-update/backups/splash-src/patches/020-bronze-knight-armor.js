/* =====================================================================
   PATCH 020 — bronze-knight-armor
   Date: 2026-10-03 | For: Jeff (Fire Babys)
   Directive: Jeff — beat 2D stages to earn the bronze knight armor set.
     Every 5 stages beaten earns one piece; the chestplate (stage 20)
     completes the set. Pieces are plain flat gray; the full set glows
     light gold. Full set = +10% boost over everything.
   What it changes:
     - Stage-win hook (Game.checkEnd chain): beating stage 5/10/15/20
       awards greaves / gauntlets / helmet / chestplate.
     - Armor saved locally (fb_bronze_armor_v1) AND synced to the
       Fire Babys auth server (/profile/stage) so the 3D arena can
       read it server-authoritatively. No email collected here — the
       existing sign-in token is reused.
     - Retroactive grant: players already past a milestone get the
       piece on next boot.
     - Unlock celebration overlay on each piece earned.
     - window.__FB_BRONZE_ARMOR exposes the set for other readers.
   Touches: Game.checkEnd (chained). DOM overlay only. No canvas,
     combat, or baseline changes.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: beat stage 5 -> greaves unlock overlay; reload -> still owned.
   ===================================================================== */
(function () {
  'use strict';

  var BK = {};
  BK.KEY = 'fb_bronze_armor_v1';
  BK.AUTH_URL = 'https://fire-babys-auth.jeffpruden288.workers.dev';
  BK.MILESTONES = [
    { stage: 5,  piece: 'greaves',    name: 'Bronze Greaves',    boost: 0.025, blurb: 'Flat gray. The climb begins.' },
    { stage: 10, piece: 'gauntlets',  name: 'Bronze Gauntlets',  boost: 0.05,  blurb: 'Flat gray. Halfway to knight.' },
    { stage: 15, piece: 'helmet',     name: 'Bronze Helmet',     boost: 0.075, blurb: 'Flat gray. One piece left...' },
    { stage: 20, piece: 'chestplate', name: 'Bronze Chestplate', boost: 0.10,  blurb: 'The diamond chestplate! FULL SET — light gold glow! +10% over everything!' },
  ];

  /* ---------------- store ---------------- */
  BK.load = function () {
    var d = { pieces: {}, maxStage: 0 };
    try {
      var raw = localStorage.getItem(BK.KEY);
      if (raw) { var p = JSON.parse(raw); if (p && typeof p === 'object') d = p; }
    } catch (e) {}
    if (!d.pieces || typeof d.pieces !== 'object') d.pieces = {};
    if (typeof d.maxStage !== 'number') d.maxStage = 0;
    return d;
  };
  BK.save = function (d) {
    try { localStorage.setItem(BK.KEY, JSON.stringify(d)); } catch (e) {}
  };
  BK.count = function (d) {
    var n = 0;
    for (var i = 0; i < BK.MILESTONES.length; i++) {
      if (d.pieces[BK.MILESTONES[i].piece]) n++;
    }
    return n;
  };
  BK.boost = function (d) {
    return BK.count(d) * 0.025;
  };

  /* ---------------- server sync ---------------- */
  BK.token = function () {
    try {
      if (window.FireBabysAuth && window.FireBabysAuth.getToken) {
        return window.FireBabysAuth.getToken();
      }
    } catch (e) {}
    return null;
  };
  BK.syncStage = function (stage) {
    var t = BK.token();
    if (!t) return;
    try {
      fetch(BK.AUTH_URL + '/profile/stage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: t, stage: stage }),
      }).catch(function () {});
    } catch (e) {}
  };

  /* ---------------- milestone check ---------------- */
  // Returns array of newly-earned milestone objects.
  BK.checkMilestones = function (beatenStage) {
    var d = BK.load();
    var fresh = [];
    var changed = false;
    if (beatenStage > d.maxStage) { d.maxStage = beatenStage; changed = true; }
    for (var i = 0; i < BK.MILESTONES.length; i++) {
      var m = BK.MILESTONES[i];
      if (beatenStage >= m.stage && !d.pieces[m.piece]) {
        d.pieces[m.piece] = true;
        fresh.push(m);
        changed = true;
      }
    }
    if (changed) BK.save(d);
    return fresh;
  };

  /* ---------------- celebration overlay ---------------- */
  BK.celebrate = function (m) {
    try {
      var ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;background:rgba(8,4,2,0.82);padding:20px;box-sizing:border-box;';
      var full = (m.piece === 'chestplate');
      ov.innerHTML =
        '<div style="max-width:420px;text-align:center;background:' + (full ? 'linear-gradient(180deg,#3a2a10,#1c1006)' : '#1c1006') + ';border:3px solid ' + (full ? '#ffd76a' : '#8a8a8a') + ';border-radius:20px;padding:30px 26px;box-shadow:0 0 ' + (full ? '60px rgba(255,215,106,0.5)' : '30px rgba(0,0,0,0.6)') + ';">' +
        '<div style="font-size:52px;">' + (full ? '💎' : '🛡️') + '</div>' +
        '<div style="color:' + (full ? '#ffd76a' : '#cfcfcf') + ';font-size:22px;font-weight:900;letter-spacing:2px;margin:10px 0 6px;">ARMOR EARNED</div>' +
        '<div style="color:#fff;font-size:19px;font-weight:800;">' + m.name + '</div>' +
        '<div style="color:#d8b89a;font-size:14px;margin:10px 0 18px;line-height:1.5;">' + m.blurb + '</div>' +
        '<button style="padding:14px 34px;font-size:17px;font-weight:900;letter-spacing:1px;border:none;border-radius:14px;cursor:pointer;color:#2a1206;background:linear-gradient(180deg,#ffd76a,#ff8c2e);">CLAIM</button>' +
        '</div>';
      ov.querySelector('button').addEventListener('click', function () {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
      });
      document.body.appendChild(ov);
      setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 9000);
    } catch (e) {}
  };

  /* ---------------- win hook ---------------- */
  BK.onWin = function (beatenStage) {
    var fresh = BK.checkMilestones(beatenStage);
    BK.syncStage(beatenStage);
    for (var i = 0; i < fresh.length; i++) {
      (function (m, idx) {
        setTimeout(function () { BK.celebrate(m); }, 1600 + idx * 900);
      })(fresh[i], i);
    }
  };

  if (typeof Game !== 'undefined' && Game.checkEnd) {
    var __bk_origCheckEnd = Game.checkEnd;
    Game.checkEnd = function () {
      var wasWon = this.won;
      __bk_origCheckEnd.apply(this, arguments);
      try {
        if (this.won && !wasWon) BK.onWin(this.stage);
      } catch (e) {}
    };
  }

  /* ---------------- retroactive grant on boot ---------------- */
  BK.boot = function () {
    try {
      var cur = 1;
      if (typeof SaveSys !== 'undefined' && SaveSys.data && typeof SaveSys.data.stage === 'number') {
        cur = SaveSys.data.stage;
      } else if (typeof Game !== 'undefined' && typeof Game.stage === 'number') {
        cur = Game.stage;
      }
      var beaten = Math.max(0, cur - 1);
      if (beaten > 0) {
        BK.checkMilestones(beaten); // grants without celebration
        BK.syncStage(beaten);
      }
    } catch (e) {}
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(BK.boot, 1500); });
  } else {
    setTimeout(BK.boot, 1500);
  }

  /* ---------------- public reader ---------------- */
  BK.read = function () {
    var d = BK.load();
    return {
      pieces: d.pieces,
      count: BK.count(d),
      boost: BK.count(d) * 0.025,
      fullSet: !!d.pieces.chestplate,
      maxStage: d.maxStage,
    };
  };
  window.__FB_BRONZE_ARMOR = BK;

})();
