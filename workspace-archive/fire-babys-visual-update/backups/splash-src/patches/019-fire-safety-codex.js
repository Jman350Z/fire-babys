/* =====================================================================
   PATCH 019 — fire-safety-codex  (Pillars 4 + 6)
   Date: 2026-10-02 | For: Jeff (Fire Babys)
   Directive: 6 Pillars of Power.
     Pillar 4 — Institutional Authority & Chemical Matchup Engine: battle
       mechanics stay aligned with the NFPA fire classes (A/B/C/D). The
       matchup matrix itself lives in patch 007; this patch adds the
       in-game NFPA reference (Fire Safety Academy) so the science is
       always one tap away.
     Pillar 6 — Fire Department Safety & American Prevention Curriculum:
       USFA/NFPA lessons as game mechanics + parent/teacher portal.
   What it changes:
     - Fire Safety Academy modal: new HUD button (🎓) opens a reference
       card with the 4 NFPA classes (fuel + correct counter + NEVER rule),
       the 3 safety mechanics, the toyetic tag, and real links to
       https://sparky.org/ , https://sparkyschoolhouse.org/ and
       https://www.usfa.fema.gov/ .
     - Toyetic tag on every digital codex card: 'Real fire is never a
       toy — only grown-ups handle flame!' is appended to each
       character-codex card (patch 002) the moment the codex opens.
     - Mechanic 1 'Get Outside & Stay Outside / Two Ways Out': when the
       PLAYER castle collapses, an emergency alarm sounds (patch 018)
       and every surviving Baby troop comically flees along two
       illuminated green exit lanes. Nobody runs back inside.
     - Mechanic 2 'Stop, Drop, and Roll': heroes can catch a burning
       debuff from enemy attacks (flames drawn on the hero). A fast
       horizontal swipe on the right side of the screen triggers the
       roll: burning is extinguished, armor is restored, dust flies.
     - Mechanic 3 'Safe Charging is a Superpower': Buzz (Class C
       electrical villain, patch 007) sometimes spawns while charging
       on a soft pillow with a frayed charger cable. While overloaded
       he zaps nearby troops. TAP him to unplug the charger and move
       him to a hard, flat surface (brief stun, pillow gone).
   Touches: dealDamageCastle, updateUnit, render, dealDamage,
     spawnUnit, drawBabyExtras (all chained), Game.toDeploy (reset),
     DOM (#fsAcadBtn, #fsAcad overlay in #hud/#stage; .fsc-toyetic
     appended inside #codexOv .cx-card). No baseline file is edited.
   How to disable: set "enabled": false for this file in
     patches/manifest.json, then run: python3 src/build.py
   Test (node harness): window.__FSC_DEBUG.NFPA has A/B/C/D with
     counter+never fields; __FSC_DEBUG.TOYETIC is the exact tag string.
   ===================================================================== */
(function(){
'use strict';

var FSC = {
  evacT: 0, evacDone: false, _lastEvac: 0,
  hinted: {}
};

FSC.TOYETIC = 'Real fire is never a toy \u2014 only grown-ups handle flame!';

/* ---------------- 1. NFPA reference data (mirrors patch 007's matrix) ---------------- */
FSC.NFPA = {
  A: { name: 'CLASS A', fuel: 'Ordinary combustibles \u2014 wood, paper, trash (Twiggy)',
       beat: 'WATER cools it down: squirt guns, splash balloons.',
       never: null },
  B: { name: 'CLASS B', fuel: 'Flammable liquids & kitchen grease (Slick)',
       beat: 'SMOTHER it: fire blanket, baking soda, lid on the pan.',
       never: 'NEVER use water \u2014 it explodes into a fireball!' },
  C: { name: 'CLASS C', fuel: 'Electrical hazards \u2014 wires, outlets, chargers (Buzz)',
       beat: 'Cut the power FIRST (trip the breaker), then dry chemical.',
       never: 'NEVER use water \u2014 electricity zaps back through it!' },
  D: { name: 'CLASS D', fuel: 'Combustible metals (Slag)',
       beat: 'Bury it in SAND or dry powder \u2014 nothing else.',
       never: 'NEVER use water \u2014 hydrogen BOOM!' }
};

FSC.MECHANICS = [
  { t: '\uD83D\uDEA8 GET OUTSIDE & STAY OUT \u2014 TWO WAYS OUT',
    d: 'If your castle falls, follow the two glowing green exit lanes. Never run back inside a burning building.' },
  { t: '\uD83D\uDED1 STOP, DROP & ROLL',
    d: 'If a hero catches fire, SWIPE \u2192 fast on the right side of the screen. Rolling smothers the flames and restores armor.' },
  { t: '\uD83D\uDD0C SAFE CHARGING IS A SUPERPOWER',
    d: 'Buzz overloads when he charges on soft pillows. TAP him to unplug the frayed charger and move him somewhere hard and flat.' }
];

FSC.hintOnce = function(key, msg){
  if(FSC.hinted[key]) return;
  FSC.hinted[key] = true;
  if(typeof UI !== 'undefined' && UI.hint) UI.hint(msg);
};

/* ---------------- 2. Fire Safety Academy modal (DOM) ---------------- */
FSC.ensureDom = function(){
  if(typeof document === 'undefined') return false;
  var hud = document.getElementById('hud');
  if(!hud) return false;
  if(!document.getElementById('fsAcadBtn')){
    var btn = document.createElement('button');
    btn.id = 'fsAcadBtn';
    btn.textContent = '\uD83C\uDF93';
    btn.setAttribute('aria-label', 'open the Fire Safety Academy');
    btn.style.cssText = 'pointer-events:auto;background:rgba(12,6,4,.72);' +
      'border:1px solid rgba(255,150,60,.25);border-radius:10px;' +
      'font-size:20px;padding:6px 9px;margin-right:6px;cursor:pointer;';
    btn.addEventListener('click', function(){
      FSC.open();
      try{ if(window.AudioSys) AudioSys.ui(); }catch(e){}
    });
    var mute = document.getElementById('muteBtn');
    if(mute) hud.insertBefore(btn, mute);
    else hud.appendChild(btn);
  }
  if(!document.getElementById('fsAcad')){
    var stage = document.getElementById('stage') || document.body;
    var ov = document.createElement('div');
    ov.id = 'fsAcad';
    ov.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:40;' +
      'display:none;justify-content:center;align-items:center;' +
      'background:rgba(8,3,2,0.94);padding:12px;';
    var card = document.createElement('div');
    card.style.cssText = 'width:94%;max-width:520px;max-height:92%;overflow-y:auto;' +
      '-webkit-overflow-scrolling:touch;background:rgba(24,8,3,0.98);' +
      'border:2px solid #ffb347;border-radius:14px;padding:14px 16px;' +
      'color:#ffe9d6;font:600 12.5px/1.65 system-ui,sans-serif;';
    var html = '<div style="font-weight:900;font-size:16px;letter-spacing:1px;' +
      'text-align:center;margin-bottom:4px">\uD83C\uDF93 FIRE SAFETY ACADEMY</div>' +
      '<div style="text-align:center;font-size:11.5px;color:#ffd9a8;' +
      'border:1px dashed rgba(255,180,90,.6);border-radius:8px;' +
      'padding:6px 8px;margin-bottom:10px">\uD83E\uDDF8 TOYETIC TAG: ' +
      FSC.TOYETIC + '</div>';
    var order = ['A', 'B', 'C', 'D'], i, k;
    for(i = 0; i < order.length; i++){
      k = order[i];
      var c = FSC.NFPA[k];
      html += '<div style="background:rgba(50,20,8,.6);border:1px solid ' +
        'rgba(255,150,60,.3);border-radius:10px;padding:8px 10px;margin:8px 0">' +
        '<div style="font-weight:900;color:#ffb347">' + c.name + '</div>' +
        '<div style="opacity:.9">' + c.fuel + '</div>' +
        '<div style="color:#b6ffce">\u2705 ' + c.beat + '</div>' +
        (c.never ? '<div style="color:#ff9d8a;font-weight:800">\u26D4\uFE0F ' + c.never + '</div>' : '') +
        '</div>';
    }
    html += '<div style="font-weight:900;letter-spacing:1px;margin:10px 0 4px;' +
      'color:#ffb347">FIELD TRAINING</div>';
    for(i = 0; i < FSC.MECHANICS.length; i++){
      html += '<div style="margin:6px 0"><div style="font-weight:800">' +
        FSC.MECHANICS[i].t + '</div><div style="opacity:.88">' +
        FSC.MECHANICS[i].d + '</div></div>';
    }
    html += '<div style="font-weight:900;letter-spacing:1px;margin:10px 0 4px;' +
      'color:#ffb347">GROWN-UP RESOURCES</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">' +
      '<a href="https://sparky.org/" target="_blank" rel="noopener" ' +
      'style="color:#7ec8ff;font-weight:700">\uD83D\uDD25 NFPA Sparky \u2014 sparky.org</a>' +
      '<a href="https://sparkyschoolhouse.org/" target="_blank" rel="noopener" ' +
      'style="color:#7ec8ff;font-weight:700">\uD83C\uDFEB Sparky Schoolhouse \u2014 for teachers</a>' +
      '<a href="https://www.usfa.fema.gov/" target="_blank" rel="noopener" ' +
      'style="color:#7ec8ff;font-weight:700">\uD83C\uDDFA\uD83C\uDDF8 U.S. Fire Administration \u2014 usfa.fema.gov</a>' +
      '</div>' +
      '<div style="text-align:center"><button id="fsAcadClose" ' +
      'style="background:#ff5d2e;color:#fff;border:none;border-radius:20px;' +
      'font:800 13px system-ui,sans-serif;padding:9px 22px;cursor:pointer;">' +
      '\u2715 CLOSE</button></div>';
    card.innerHTML = html;
    ov.appendChild(card);
    ov.addEventListener('click', function(e){ if(e && e.target === ov) FSC.close(); });
    stage.appendChild(ov);
    var closeBtn = card.querySelector ? card.querySelector('#fsAcadClose') : null;
    /* querySelector on the stub returns a fresh el; wire by id after append */
    FSC._ov = ov;
  }
  return true;
};

FSC.open = function(){
  if(!FSC.ensureDom()) return;
  var ov = document.getElementById('fsAcad');
  if(ov){ ov.style.display = 'flex'; FSC.wireClose(); }
};

FSC.wireClose = function(){
  if(typeof document === 'undefined' || FSC._wired) return;
  FSC._wired = true;
  document.addEventListener('click', function(e){
    if(e && e.target && e.target.id === 'fsAcadClose') FSC.close();
  });
};

FSC.close = function(){
  if(typeof document === 'undefined') return;
  var ov = document.getElementById('fsAcad');
  if(ov) ov.style.display = 'none';
};

/* ---------------- 3. toyetic tag on every character-codex card ---------------- */
FSC.tagCodexCards = function(){
  if(typeof document === 'undefined' || !document.querySelectorAll) return;
  var cards = document.querySelectorAll('#codexOv .cx-card');
  for(var i = 0; i < cards.length; i++){
    if(cards[i].querySelector && !cards[i].querySelector('.fsc-toyetic')){
      var d = document.createElement('div');
      d.className = 'fsc-toyetic';
      d.style.cssText = 'margin-top:8px;padding:7px 9px;' +
        'border:1px dashed rgba(255,180,90,.6);border-radius:8px;' +
        'font:700 11px/1.5 system-ui,sans-serif;color:#ffd9a8;' +
        'background:rgba(60,20,6,.5);';
      d.textContent = '\uD83E\uDDF8 TOYETIC TAG: ' + FSC.TOYETIC;
      cards[i].appendChild(d);
    }
  }
};

if(typeof document !== 'undefined' && document.addEventListener){
  document.addEventListener('click', function(e){
    if(e && e.target && e.target.closest && e.target.closest('#codexBtn')){
      setTimeout(FSC.tagCodexCards, 80);
    }
  });
}

FSC.ensureDom();
FSC.tagCodexCards();

/* ---------------- 4. Mechanic 1: castle evacuation ---------------- */
FSC.startEvac = function(){
  FSC.evacT = 5;
  FSC._lastEvac = 0;
  try{ if(typeof AudioSys !== 'undefined') AudioSys.alarm(); }catch(e){}
  FSC.hintOnce('evac', '\uD83D\uDEA8 GET OUT & STAY OUT! Two ways out \u2014 never go back inside!');
};

var __fsc_origDDC = (typeof dealDamageCastle !== 'undefined') ? dealDamageCastle : null;
if(__fsc_origDDC){
  dealDamageCastle = function(side, raw, isCrit, sx, sy){
    __fsc_origDDC(side, raw, isCrit, sx, sy);
    if(side === 0 && typeof castles !== 'undefined' && castles[0] &&
       castles[0].hp <= 0 && !FSC.evacDone){
      FSC.evacDone = true;
      FSC.startEvac();
    }
  };
}

FSC.tickEvac = function(){
  var now = (typeof performance !== 'undefined' && performance.now) ?
    performance.now() : Date.now();
  var dt = FSC._lastEvac ? Math.min(0.1, (now - FSC._lastEvac) / 1000) : 0.016;
  FSC._lastEvac = now;
  FSC.evacT -= dt;
  if(FSC.evacT <= 0){ FSC.evacT = 0; FSC._lastEvac = 0; return; }
  if(typeof units === 'undefined' || typeof CFG === 'undefined') return;
  for(var i = 0; i < CFG.MAX_UNITS; i++){
    var u = units[i];
    if(!u.active || u.side !== 0 || u.state === ST.DYING || u.fled) continue;
    var laneX = (u.x < CFG.W * 0.5) ? CFG.W * 0.22 : CFG.W * 0.78;
    var dx = laneX - u.x, dy = (CFG.H - 36) - u.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    if(d < 30){
      u.fled = true;
      try{ burst(u.x, u.y, '#b6ffce', 8, 120, 0.5, 4, -60); }catch(e){}
      freeUnit(u.idx);
      continue;
    }
    var sp = u.moveSpeed * 1.7;
    u.x += dx / d * sp * dt;
    u.y += dy / d * sp * dt;
    u.faceX = dx >= 0 ? 1 : -1;
    u.walkPh += dt * 16;
    u.x = clamp(u.x, 20, CFG.W - 20);
    u.y = clamp(u.y, 120, CFG.H - 20);
  }
};

FSC.drawLanes = function(){
  if(FSC.evacT <= 0 || typeof CFG === 'undefined') return;
  var alpha = Math.min(1, FSC.evacT);
  var now = (typeof performance !== 'undefined' && performance.now) ?
    performance.now() : Date.now();
  ctx.save();
  ctx.globalAlpha = 0.8 * alpha;
  var lanes = [CFG.W * 0.22, CFG.W * 0.78], k, c;
  for(k = 0; k < 2; k++){
    var lx = lanes[k];
    var g = null;
    try{
      g = ctx.createLinearGradient(0, CFG.H * 0.45, 0, CFG.H - 20);
      g.addColorStop(0, 'rgba(90,220,120,0)');
      g.addColorStop(1, 'rgba(90,220,120,0.55)');
    }catch(e){}
    ctx.fillStyle = g || 'rgba(90,220,120,0.3)';
    ctx.fillRect(lx - 34, CFG.H * 0.45, 68, CFG.H * 0.55 - 20);
    ctx.fillStyle = '#b6ffce';
    for(c = 0; c < 4; c++){
      var cy = CFG.H - 60 - c * 44 - ((now / 180) % 44);
      ctx.beginPath();
      ctx.moveTo(lx - 22, cy); ctx.lineTo(lx, cy + 16); ctx.lineTo(lx + 22, cy);
      ctx.lineTo(lx + 22, cy + 8); ctx.lineTo(lx, cy + 24); ctx.lineTo(lx - 22, cy + 8);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.globalAlpha = alpha;
  ctx.font = '900 17px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,40,16,0.9)';
  var msg = '\uD83D\uDEA8 TWO WAYS OUT \u2014 GET OUT, STAY OUT!';
  try{ ctx.strokeText(msg, CFG.W / 2, 96); }catch(e){}
  ctx.fillStyle = '#c9ffd9';
  try{ ctx.fillText(msg, CFG.W / 2, 96); }catch(e){}
  ctx.restore();
};

var __fsc_origRender = (typeof render !== 'undefined') ? render : null;
if(__fsc_origRender){
  render = function(){
    if(FSC.evacT > 0) FSC.tickEvac();
    __fsc_origRender();
    if(FSC.evacT > 0) FSC.drawLanes();
  };
}

/* ---------------- 5. Mechanic 2: burning + stop, drop & roll ---------------- */
var __fsc_origDamage = (typeof dealDamage !== 'undefined') ? dealDamage : null;
if(__fsc_origDamage){
  dealDamage = function(t, raw, isCrit, sx, sy, byHero){
    __fsc_origDamage(t, raw, isCrit, sx, sy, byHero);
    /* heroes can catch fire from enemy attacks — no re-entry, no lecture */
    if(t && t.active && t.isHero && t.side === 0 && t.state !== ST.DYING &&
       !t.burning && !t.rolling && Math.random() < 0.30){
      t.burning = 3.0; t.burnTick = 0;
      if(t.baseArmor === undefined) t.baseArmor = t.armor;
      FSC.hintOnce('burn-' + (t.idx || 0),
        '\uD83D\uDD25 Blaze is BURNING! SWIPE \u2192 fast to Stop, Drop & Roll!');
    }
  };
}

FSC.tryRoll = function(){
  if(typeof units === 'undefined' || typeof CFG === 'undefined') return false;
  var i, u, hero = null;
  for(i = 0; i < CFG.MAX_UNITS; i++){
    u = units[i];
    if(u.active && u.isHero && u.side === 0 && u.state !== ST.DYING){
      if(u.burning > 0){ hero = u; break; }
      if(!hero) hero = u;
    }
  }
  if(!hero || !(hero.burning > 0)) return false;
  hero.burning = 0;
  if(hero.baseArmor !== undefined) hero.armor = hero.baseArmor;
  hero.rolling = 1.1;
  try{
    burst(hero.x, hero.y, '#cfc8bc', 16, 170, 0.7, 6, 120);
    if(typeof AudioSys !== 'undefined') AudioSys.extinguishSizzle();
  }catch(e){}
  if(typeof UI !== 'undefined' && UI.hint)
    UI.hint('\uD83D\uDED1 STOP, DROP & ROLL! Flames out, armor back!');
  return true;
};

/* ---------------- 6. Mechanic 3: Buzz overloads on the pillow ---------------- */
var __fsc_origSpawn = (typeof spawnUnit !== 'undefined') ? spawnUnit : null;
if(__fsc_origSpawn){
  spawnUnit = function(side, key, tier, x, y, hpMult, isHero){
    var i = __fsc_origSpawn(side, key, tier, x, y, hpMult, isHero);
    if(i >= 0 && side === 1 && !isHero && typeof units !== 'undefined' &&
       units[i].villain === 'Buzz' && Math.random() < 0.6){
      units[i].overload = true;
      units[i].zapT = 1.0;
    }
    return i;
  };
}

FSC.tryUnplug = function(px, py){
  if(typeof units === 'undefined' || typeof CFG === 'undefined') return false;
  for(var i = 0; i < CFG.MAX_UNITS; i++){
    var u = units[i];
    if(u.active && u.overload && u.state !== ST.DYING){
      var r = u.size + 18;
      var dx = px - u.x, dy = py - u.y;
      if(dx * dx + dy * dy < r * r){
        u.overload = false;
        u.stunT = 2.0; /* moved somewhere hard and flat */
        try{ if(typeof AudioSys !== 'undefined') AudioSys.extinguishSizzle(); }catch(e){}
        FSC.hintOnce('unplug',
          '\uD83D\uDD0C Unplugged! Buzz is on a hard, flat surface now.');
        return true;
      }
    }
  }
  return false;
};

/* per-unit tick: burning DoT, roll spin-down, stun, overload zaps.
   Chains after every earlier updateUnit wrapper (none exist yet). */
var __fsc_origUpdateUnit = (typeof updateUnit !== 'undefined') ? updateUnit : null;
if(__fsc_origUpdateUnit){
  updateUnit = function(u, dt){
    if(!u.active) return;
    if(u.stunT > 0){ u.stunT -= dt; return; }
    if(u.rolling > 0){
      u.rolling -= dt;
      u.walkPh += dt * 22;
      if(u.rolling <= 0) u.rolling = 0;
    }
    if(u.burning > 0 && u.state !== ST.DYING){
      u.burning -= dt; u.burnTick += dt;
      if(u.burnTick >= 0.5){
        u.burnTick = 0;
        u.hp -= 3; u.flash = 1;
        try{
          spawnDmgNum(u.x, u.y - u.size - 6, 3, false);
          burst(u.x, u.y, '#ff7a3c', 4, 120, 0.4, 4, -40);
        }catch(e){}
        if(u.hp <= 0 && typeof killUnit !== 'undefined'){ killUnit(u, u.x, u.y, 0); return; }
      }
      if(u.burning <= 0) u.burning = 0;
    }
    if(u.overload && u.state !== ST.DYING){
      u.zapT -= dt;
      if(u.zapT <= 0){
        u.zapT = 1.4;
        var zapped = 0;
        for(var i = 0; i < CFG.MAX_UNITS; i++){
          var o = units[i];
          if(o.active && o.side === 0 && o.state !== ST.DYING &&
             dist2(u.x, u.y, o.x, o.y) < 110 * 110){
            o.hp -= 6; o.flash = 1;
            try{ spawnDmgNum(o.x, o.y - o.size - 6, 6, false); }catch(e){}
            if(o.hp <= 0 && typeof killUnit !== 'undefined') killUnit(o, u.x, u.y, 0);
            if(++zapped >= 3) break;
          }
        }
        try{
          burst(u.x, u.y, '#fff36a', 10, 240, 0.4, 4, 100);
          if(typeof AudioSys !== 'undefined') AudioSys.crackle();
        }catch(e){}
        FSC.hintOnce('buzz-over',
          '\u26A1 Buzz is OVERLOADING on that pillow! TAP him to unplug the charger!');
      }
    }
    __fsc_origUpdateUnit(u, dt);
  };
}

/* draw extras: pillow + frayed charger (overload), flames (burning),
   motion swirl (rolling). Chains after 007's extras. */
var __fsc_origExtras = (typeof drawBabyExtras !== 'undefined') ? drawBabyExtras : null;
if(__fsc_origExtras){
  drawBabyExtras = function(u, s, t){
    __fsc_origExtras(u, s, t);
    ctx.save();
    if(u.overload){
      var pw = s * 1.5, ph = s * 0.5;
      ctx.fillStyle = '#e8e4da';
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(-pw / 2, s * 0.75, pw, ph, ph / 2);
      else ctx.rect(-pw / 2, s * 0.75, pw, ph);
      ctx.fill();
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = Math.max(2, s * 0.08);
      ctx.beginPath();
      ctx.moveTo(s * 0.7, s * 0.9);
      ctx.quadraticCurveTo(s * 1.3, s * 1.2, s * 1.5, s * 0.6);
      ctx.stroke();
      var fl = 0.5 + 0.5 * Math.sin(t * 25);
      ctx.fillStyle = 'rgba(255,240,150,' + fl.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(s * 1.5, s * 0.6, s * 0.12, 0, 6.2832); ctx.fill();
    }
    if(u.burning > 0){
      var bf = 0.6 + 0.4 * Math.sin(t * 30);
      ctx.fillStyle = 'rgba(255,120,30,' + bf.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(-s * 0.4, -s * 0.9, s * 0.22, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.35, -s * 1.0, s * 0.18, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,80,' + bf.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(0, -s * 1.05, s * 0.15, 0, 6.2832); ctx.fill();
    }
    if(u.rolling > 0){
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, s * 1.25, t * 14, t * 14 + 4.2); ctx.stroke();
    }
    ctx.restore();
  };
}

/* swipe (stop-drop-roll) + tap (unplug Buzz) gestures on the canvas */
if(typeof canvas !== 'undefined' && canvas && canvas.addEventListener &&
   typeof canvasPos !== 'undefined'){
  (function(){
    var g = null;
    canvas.addEventListener('pointerdown', function(e){
      if(typeof Game === 'undefined' || Game.phase !== 'fight'){ g = null; return; }
      var p = canvasPos(e);
      g = { x0: p.x, y0: p.y, t0: (performance.now ? performance.now() : Date.now()),
            id: e.pointerId };
    });
    canvas.addEventListener('pointerup', function(e){
      if(!g || e.pointerId !== g.id){ g = null; return; }
      var p = canvasPos(e);
      var dx = p.x - g.x0, dy = p.y - g.y0;
      var dtms = (performance.now ? performance.now() : Date.now()) - g.t0;
      var s = g; g = null;
      if(typeof Game === 'undefined' || Game.phase !== 'fight') return;
      if(typeof CFG === 'undefined') return;
      /* tap: quick + small — try to unplug an overloaded Buzz */
      if(Math.abs(dx) < 16 && Math.abs(dy) < 16 && dtms < 350){
        FSC.tryUnplug(s.x0, s.y0);
        return;
      }
      /* swipe: fast, mostly-horizontal, starts right of the joystick zone */
      if(dx > 90 && Math.abs(dy) < 60 && dtms < 600 && s.x0 > CFG.W * 0.5){
        FSC.tryRoll();
      }
    });
    canvas.addEventListener('pointercancel', function(){ g = null; });
  })();
}

/* reset per-run state on a fresh deploy */
if(typeof Game !== 'undefined' && typeof Game.toDeploy === 'function'){
  var __fsc_origToDeploy = Game.toDeploy;
  Game.toDeploy = function(){
    __fsc_origToDeploy.call(Game);
    FSC.evacT = 0; FSC.evacDone = false; FSC._lastEvac = 0; FSC.hinted = {};
  };
}

/* debug/test handle for the verifier harness */
if(typeof window !== 'undefined'){
  window.__FSC_DEBUG = {
    NFPA: FSC.NFPA,
    MECHANICS: FSC.MECHANICS,
    TOYETIC: FSC.TOYETIC,
    open: FSC.open, close: FSC.close,
    startEvac: FSC.startEvac, tryRoll: FSC.tryRoll, tryUnplug: FSC.tryUnplug,
    tagCodexCards: FSC.tagCodexCards,
    academyButton: function(){
      if(typeof document === 'undefined') return null;
      return document.getElementById('fsAcadBtn');
    }
  };
}

})();
