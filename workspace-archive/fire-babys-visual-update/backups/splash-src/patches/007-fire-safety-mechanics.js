/* =====================================================================
   PATCH 007 — extinguish-matchup-matrix
   Date: 2026-10-01 | For: Jeff (Fire Babys)
   Directive: "Extinguish Matchup Matrix" — teach real-world fire
     extinguisher classes (A/B/C/D) through funny, exaggerated combat.
   What it changes:
     - Every enemy (Wildfire Legion) gets a fire class + villain identity:
         A "Twiggy"/"Cardboard Carl" (trash & wood) — weak to WATER
         B "Slick"/"Fryer Frank"     (grease & oil) — weak to SMOTHER,
                                                     WATER MAKES HIM EXPLODE
         C "Buzz"                    (electrical)   — weak to FOAM,
                                                     water ZAPS BACK at you
         D "Slag"/"Thermite Tim"     (burning metal)— weak to SAND,
                                                     water goes hydrogen-BOOM
       Classes gate by stage: 1-2 = A only, 3-4 = +B, 5-7 = +C, 8+ = +D.
       Boss (Lord Inferno) stays matrix-neutral to preserve boss balance.
     - Each hero wields a signature extinguisher tool on every attack:
         Ruko (brawler)   -> Sand Bucket   (strong vs D)
         Boulder (guardian)-> Smother Blanket(strong vs B)
         Sizzle (archer)  -> Squirt Gun    (strong vs A; BACKFIRES vs B/C/D)
         Cinder (pyro)    -> Suds Foam     (strong vs C)
         Blaze (hero)     -> Fire Nova     (neutral, never backfires)
         Castle towers    -> neutral embers (never backfire)
       Correct counter = 2x (water/A) or 2.5x damage + themed burst.
       Wrong water = exaggerated failure: grease grows up to 2x and
         explodes splash onto YOUR side; Buzz zaps the attacker;
         metal pops a hydrogen flash. First occurrence per fight shows a
         1-line lesson via UI.hint — zero lectures, all slapstick.
     - Villain sprites: class extras drawn in drawBabyExtras (twig/leaf
       bits, frying-pan hat + oil drips, sparking cords, molten cracks)
       plus a floating name label. Round bodies, expressive mouths,
       ZERO bird traits.
     - Safety briefing: rotating 1-line life-saving tips on the deploy
       screen (the game's "loading screen" equivalent).
     - Victory dossier: after-action card listing every class spotted
       this fight with its 1-line counter rule.
   Touches: spawnUnit, doAttack, tryCast, allocProj, fireProj, fireMeteor,
     updateProjs (reassigned — verbatim baseline copy + tool threading),
     dealDamage, drawBabyExtras (chained after 001/003/004),
     Game.toDeploy / Game.startFight / Game.checkEnd (chained after 003).
     Originals kept as __mx_orig* for instant rollback inside this file.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: fight — enemies show villain names; Sizzle vs Slick = BOOM.
   ===================================================================== */
(function(){
'use strict';

/* ---------------- 1. DATA: the real-world science ---------------- */
var MX = {
  atkTool: null, atkUnit: null, resolving: false,
  spawnCount: 0, seenClasses: {}, hinted: {},
  tipIdx: 0, dossierShownFor: -1
};

MX.CLASSES = {
  A: { label: 'CLASS A', fuel: 'trash & wood', villains: ['Twiggy', 'Cardboard Carl'],
       counter: 'water',
       dossier: 'Twiggy — CLASS A (trash & wood). Soak him! Water wins.' },
  B: { label: 'CLASS B', fuel: 'grease & oil', villains: ['Slick', 'Fryer Frank'],
       counter: 'smother',
       dossier: 'Slick — CLASS B (grease). NEVER water, it explodes! Smother him.' },
  C: { label: 'CLASS C', fuel: 'electrical', villains: ['Buzz'],
       counter: 'foam',
       dossier: 'Buzz — CLASS C (electrical). Water zaps back! Foam him.' },
  D: { label: 'CLASS D', fuel: 'burning metal', villains: ['Slag', 'Thermite Tim'],
       counter: 'sand',
       dossier: 'Slag — CLASS D (burning metal). Water goes BOOM! Bury him in sand.' }
};

MX.TIPS = [
  'MATCHUP MATRIX: Water beats Twiggy (A) - Blanket beats Slick (B) - Foam beats Buzz (C) - Sand beats Slag (D). Wrong tool = BACKFIRE!',
  'Never put water on a grease fire — smother it!',
  'Stay low under smoke — crawl to the exit.',
  'Stop, Drop, and Roll if your clothes catch fire.',
  'Call 911 in a real emergency — real fire is never a toy.',
  'Get out, stay out — let grown-ups handle real fires.',
  'Buzz is electrical: cut the power first, never use water.'
];

/* ---------------- 2. hero -> extinguisher tool ---------------- */
MX.toolFor = function(src){
  if(!src || typeof src.idx !== 'number') return 'neutral'; /* castle guns etc. */
  if(src.key === 'boss') return 'neutral';
  if(src.isHero) return 'nova';        /* Blaze — reliable, never backfires */
  switch(src.key){
    case 'brawler':  return 'sand';    /* Ruko — Sand Bucket */
    case 'guardian': return 'smother'; /* Boulder — Smother Blanket */
    case 'archer':   return 'water';   /* Sizzle — Squirt Gun */
    case 'pyro':     return 'foam';     /* Cinder — Suds Foam */
    default: return 'neutral';
  }
};

MX.classesForStage = function(stage){
  if(stage >= 8) return ['A', 'B', 'C', 'D'];
  if(stage >= 5) return ['A', 'B', 'C'];
  if(stage >= 3) return ['A', 'B'];
  return ['A'];
};

/* ---------------- 3. tag enemies with fire class ---------------- */
var __mx_origSpawnUnit = (typeof spawnUnit !== 'undefined') ? spawnUnit : null;
if(__mx_origSpawnUnit){
spawnUnit = function(side, key, tier, x, y, hpMult, isHero){
  var i = __mx_origSpawnUnit(side, key, tier, x, y, hpMult, isHero);
  if(i >= 0 && side === 1 && !isHero && key !== 'boss' && typeof units !== 'undefined'){
    var u = units[i];
    var stage = (typeof Game !== 'undefined' && Game.stage) || 1;
    var pool = MX.classesForStage(stage);
    var cls = pool[MX.spawnCount % pool.length]; MX.spawnCount++;
    var names = MX.CLASSES[cls].villains;
    u.fireClass = cls;
    u.villain = names[MX.spawnCount % names.length];
    u.baseSize = u.size;
    MX.seenClasses[cls] = true;
  }
  return i;
};
}

/* ---------------- 4. thread the attacker's tool ---------------- */
var __mx_origDoAttack = (typeof doAttack !== 'undefined') ? doAttack : null;
if(__mx_origDoAttack){
doAttack = function(u){
  MX.atkTool = MX.toolFor(u); MX.atkUnit = u;
  try{ __mx_origDoAttack(u); }
  finally{ MX.atkTool = null; MX.atkUnit = null; }
};
}

var __mx_origTryCast = (typeof tryCast !== 'undefined') ? tryCast : null;
if(__mx_origTryCast){
tryCast = function(u){
  MX.atkTool = MX.toolFor(u); MX.atkUnit = u;
  try{ return __mx_origTryCast(u); }
  finally{ MX.atkTool = null; MX.atkUnit = null; }
};
}

/* stamp the tool onto projectiles at fire time */
var __mx_origAllocProj = (typeof allocProj !== 'undefined') ? allocProj : null,
    __mx_lastProj = -1;
if(__mx_origAllocProj){
allocProj = function(){ __mx_lastProj = __mx_origAllocProj(); return __mx_lastProj; };
}

var __mx_origFireProj = (typeof fireProj !== 'undefined') ? fireProj : null;
if(__mx_origFireProj){
fireProj = function(src, targetIdx, angle, kind, dmgMult){
  __mx_origFireProj(src, targetIdx, angle, kind, dmgMult);
  if(__mx_lastProj >= 0 && projs[__mx_lastProj] && projs[__mx_lastProj].active)
    projs[__mx_lastProj].toolKind = MX.toolFor(src);
};
}

var __mx_origFireMeteor = (typeof fireMeteor !== 'undefined') ? fireMeteor : null;
if(__mx_origFireMeteor){
fireMeteor = function(u, mx, my){
  __mx_origFireMeteor(u, mx, my);
  if(__mx_lastProj >= 0 && projs[__mx_lastProj] && projs[__mx_lastProj].active)
    projs[__mx_lastProj].toolKind = 'blast'; /* meteor = raw blast, matrix-neutral */
};
}

/* updateProjs: verbatim baseline copy + tool threading at the 2 unit-damage sites.
   (Baseline is frozen, so this copy cannot drift.) */
var __mx_origUpdateProjs = (typeof updateProjs !== 'undefined') ? updateProjs : null;
if(__mx_origUpdateProjs){
updateProjs = function(dt){
  var i, p, t, dx, dy, d, sp, nx, ny, c;
  for(i = 0; i < CFG.MAX_PROJ; i++){
    p = projs[i];
    if(!p.active) continue;
    p.life -= dt;
    if(p.life <= 0){ freeProj(i); continue; }
    if(p.kind === PK.METEOR){
      p.y += p.vy * dt;
      if(Math.random() < 0.6) spawnPart(p.x + rand(-8, 8), p.y + rand(-8, 8), rand(-40, 40), rand(-120, -40), 0.4, 5, '#ff7a3c', 0);
      if(p.y >= p.ty){
        MX.atkTool = 'blast'; MX.atkUnit = null;                       /* MX: thread tool */
        dealSplash(p.tx, p.ty, p.splash, p.dmg, p.crit, p.side, p.tx, p.ty, p.hero);
        MX.atkTool = null;                                            /* MX: clear */
        burst(p.tx, p.ty, '#ff9d3c', 20, 300, 0.7, 6, 480);
        burst(p.tx, p.ty, '#ffd76a', 10, 200, 0.5, 4, 300);
        addShake(8, 0.4);
        AudioSys.boom();
        buzz(40);
        freeProj(i);
      }
      continue;
    }
    if(p.castle >= 0){
      /* homing fire aimed at a castle */
      c = castles[p.castle];
      if(!c || c.hp <= 0){ freeProj(i); continue; }
      dx = c.x - p.x; dy = (c.y - 10) - p.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
      sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
      nx = p.vx / sp; ny = p.vy / sp;
      nx += (dx / d) * 3.4 * dt; ny += (dy / d) * 3.4 * dt;
      var nl = Math.sqrt(nx * nx + ny * ny) || 1;
      p.vx = nx / nl * sp; p.vy = ny / nl * sp;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if(d < CFG.CASTLE_R + 6){
        dealDamageCastle(p.castle, p.dmg, p.crit, p.x, p.y);
        burst(p.x, p.y, p.col, p.kind === PK.FIRE ? 8 : 4, 140, 0.35, 3, 150);
        freeProj(i);
      }
      continue;
    }
    /* gentle homing toward unit target */
    if(p.target >= 0 && projTargetValid(p, p.target)){
      t = units[p.target];
      dx = t.x - p.x; dy = (t.y - 6) - p.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
      sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
      nx = p.vx / sp; ny = p.vy / sp;
      nx += (dx / d) * 3.2 * dt; ny += (dy / d) * 3.2 * dt;
      var nl2 = Math.sqrt(nx * nx + ny * ny) || 1;
      p.vx = nx / nl2 * sp; p.vy = ny / nl2 * sp;
      if(d < t.size + 8){
        MX.atkTool = p.toolKind || null; MX.atkUnit = null;            /* MX: thread tool */
        if(p.splash > 0) dealSplash(t.x, t.y, p.splash, p.dmg, p.crit, p.side, p.x, p.y, p.hero);
        else dealDamage(t, p.dmg, p.crit, p.x, p.y, p.hero);
        MX.atkTool = null;                                            /* MX: clear */
        burst(p.x, p.y, p.col, p.kind === PK.FIRE ? 8 : 4, 140, 0.35, 3, 150);
        freeProj(i);
        continue;
      }
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if(p.x < -30 || p.x > CFG.W + 30 || p.y < -30 || p.y > CFG.H + 30) freeProj(i);
  }
};
} /* end if(__mx_origUpdateProjs) */

/* ---------------- 5. the matchup matrix ---------------- */
MX.hintOnce = function(key, msg){
  if(MX.hinted[key]) return;
  MX.hinted[key] = true;
  if(typeof UI !== 'undefined' && UI.hint) UI.hint(msg);
};

/* returns {mult} or {backfire:'grease'|'zap'|'metal'} */
MX.matchup = function(tool, cls){
  if(tool === 'water'){
    if(cls === 'A') return { mult: 2 };
    if(cls === 'B') return { backfire: 'grease' };
    if(cls === 'C') return { backfire: 'zap' };
    if(cls === 'D') return { backfire: 'metal' };
  }
  if(tool === 'smother' && cls === 'B') return { mult: 2.5 };
  if(tool === 'foam'    && cls === 'C') return { mult: 2.5 };
  if(tool === 'sand'    && cls === 'D') return { mult: 2.5 };
  return { mult: 1 };
};

MX.counterFX = function(t, tool, cls){
  var v = t.villain || 'the baddie';
  if(tool === 'water'){ /* steam sizzle on Class A */
    burst(t.x, t.y - 8, '#ffffff', 12, 150, 0.7, 5, -60);
    burst(t.x, t.y, '#7ec8ff', 8, 130, 0.5, 4, 0);
    try{ AudioSys.noise(0.25, 0.05, 3200); }catch(e){}
    MX.hintOnce('c-water', 'Sizzle! Water beats Class A trash fires like ' + v + '!');
  } else if(tool === 'smother'){
    burst(t.x, t.y, '#cfc8bc', 14, 150, 0.6, 6, 60);
    MX.hintOnce('c-smother', 'SMOTHERED! The blanket beats grease fires like ' + v + '!');
  } else if(tool === 'foam'){
    burst(t.x, t.y, '#fff3b0', 14, 170, 0.6, 5, 0);
    burst(t.x, t.y, '#ffffff', 6, 110, 0.4, 3, 0);
    MX.hintOnce('c-foam', 'SHORTED OUT! Foam beats electrical fires like ' + v + '!');
  } else if(tool === 'sand'){
    burst(t.x, t.y, '#c99a5b', 16, 170, 0.7, 6, 320);
    MX.hintOnce('c-sand', 'BURIED! Sand beats metal fires like ' + v + '!');
  }
};

MX.doBackfire = function(t, tool, raw, sx, sy){
  var v = t.villain || 'the baddie';
  MX.resolving = true;
  try{
    if(tool !== 'water') return;
    var cls = t.fireClass;
    if(cls === 'B'){ /* grease: grows up to 2x, explodes onto YOUR side */
      t.size = Math.min(t.baseSize * 2, t.size * 1.3);
      burst(t.x, t.y, '#ff5d2e', 22, 320, 0.8, 7, 300);
      burst(t.x, t.y, '#ffd76a', 10, 200, 0.5, 5, 200);
      addShake(9, 0.4);
      AudioSys.boom(); buzz(50);
      dealSplash(t.x, t.y, 95, Math.max(12, raw * 0.6), false, 1, t.x, t.y, 0);
      MX.hintOnce('b-grease', 'WATER ON GREASE = BOOM! ' + v + ' got BIGGER! Smother him with the blanket!');
    } else if(cls === 'C'){ /* electrical: zaps the attacker */
      burst(t.x, t.y, '#fff36a', 18, 300, 0.6, 5, 200);
      burst(t.x, t.y, '#ffffff', 8, 180, 0.4, 3, 0);
      addShake(6, 0.3);
      try{ AudioSys.crackle(); }catch(e){}
      var a = MX.atkUnit;
      if(a && a.active && a.state !== ST.DYING){
        __mx_origDamage(a, raw * 0.8, false, t.x, t.y, 0);
      } else {
        dealSplash(t.x, t.y, 80, Math.max(8, raw * 0.5), false, 1, t.x, t.y, 0);
      }
      MX.hintOnce('b-zap', 'ZAP! ' + v + ' shocks water right back! Foam him instead!');
    } else if(cls === 'D'){ /* metal: hydrogen flash */
      burst(t.x, t.y, '#ffffff', 24, 340, 0.7, 6, 260);
      burst(t.x, t.y, '#ffb347', 12, 220, 0.5, 5, 200);
      addShake(10, 0.45);
      AudioSys.boom(); buzz(60);
      dealSplash(t.x, t.y, 85, Math.max(10, raw * 0.55), false, 1, t.x, t.y, 0);
      MX.hintOnce('b-metal', 'HYDROGEN BOOM! Water on burning metal explodes! Bury ' + v + ' in sand!');
    }
  } finally {
    MX.resolving = false;
  }
};

var __mx_origDamage = (typeof dealDamage !== 'undefined') ? dealDamage : null;
if(__mx_origDamage){
dealDamage = function(t, raw, isCrit, sx, sy, byHero){
  var tool = MX.atkTool;
  if(!MX.resolving && t && t.fireClass && tool){
    var fx = MX.matchup(tool, t.fireClass);
    if(fx.backfire){
      MX.doBackfire(t, tool, raw, sx, sy);
      raw = 0; /* laughed off: original clamps to min 1 */
    } else if(fx.mult !== 1){
      raw = raw * fx.mult;
      MX.counterFX(t, tool, t.fireClass);
    }
  }
  __mx_origDamage(t, raw, isCrit, sx, sy, byHero);
};
}

/* ---------------- 6. villain sprites (round, zero bird traits) ---------------- */
var __mx_origExtras = (typeof drawBabyExtras !== 'undefined') ? drawBabyExtras : null;
if(__mx_origExtras){
drawBabyExtras = function(u, s, t){
  __mx_origExtras(u, s, t);
  if(!u.fireClass) return;
  var k;
  ctx.save();
  if(u.fireClass === 'A'){ /* Twiggy: twigs + leaves */
    ctx.strokeStyle = '#6b3d14'; ctx.lineWidth = Math.max(2, s * 0.09);
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, -s * 0.5); ctx.lineTo(-s * 0.2, -s * 1.05);
    ctx.moveTo(s * 0.6, -s * 0.55); ctx.lineTo(s * 0.25, -s * 1.1);
    ctx.moveTo(0, -s * 0.6); ctx.lineTo(s * 0.05, -s * 1.2);
    ctx.stroke();
    ctx.fillStyle = '#4da63d';
    ctx.beginPath(); ctx.ellipse(-s * 0.2, -s * 1.05, s * 0.22, s * 0.14, 0.5, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.28, -s * 1.08, s * 0.2, s * 0.13, -0.5, 0, 6.2832); ctx.fill();
  } else if(u.fireClass === 'B'){ /* Slick: frying-pan hat + oil drips */
    ctx.strokeStyle = '#2b2b30'; ctx.lineWidth = Math.max(3, s * 0.16);
    ctx.beginPath(); ctx.arc(0, -s * 0.15, s * 0.78, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.lineWidth = Math.max(2, s * 0.1);
    ctx.beginPath(); ctx.moveTo(s * 0.55, -s * 0.85); ctx.lineTo(s * 1.25, -s * 1.15); ctx.stroke();
    ctx.fillStyle = 'rgba(120,70,10,0.85)';
    ctx.beginPath(); ctx.arc(-s * 0.5, s * 0.95, s * 0.14, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.45, s * 1.0, s * 0.11, 0, 6.2832); ctx.fill();
  } else if(u.fireClass === 'C'){ /* Buzz: sparking cords */
    var fl = 0.6 + 0.4 * Math.sin(t * 30 + (u.walkPh || 0));
    ctx.strokeStyle = '#e8c33a'; ctx.lineWidth = Math.max(2, s * 0.1);
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, s * 0.1); ctx.lineTo(-s * 0.4, -s * 0.15);
    ctx.lineTo(0, s * 0.12); ctx.lineTo(s * 0.4, -s * 0.18); ctx.lineTo(s * 0.8, s * 0.08);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,220,' + fl.toFixed(2) + ')';
    for(k = 0; k < 3; k++){
      var a = t * 7 + k * 2.1;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.95 - s * 0.2, s * 0.1, 0, 6.2832);
      ctx.fill();
    }
  } else if(u.fireClass === 'D'){ /* Slag: molten cracks + rocky lumps */
    ctx.strokeStyle = '#ffcf5e'; ctx.lineWidth = Math.max(2, s * 0.08);
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.3); ctx.lineTo(-s * 0.15, 0); ctx.lineTo(-s * 0.4, s * 0.35);
    ctx.moveTo(s * 0.45, -s * 0.35); ctx.lineTo(s * 0.1, s * 0.05); ctx.lineTo(s * 0.5, s * 0.3);
    ctx.stroke();
    ctx.fillStyle = '#5a5a60';
    ctx.beginPath(); ctx.arc(-s * 0.85, s * 0.25, s * 0.24, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.82, -s * 0.3, s * 0.2, 0, 6.2832); ctx.fill();
  }
  /* villain name label */
  if(u.villain){
    ctx.font = '900 ' + Math.max(9, Math.round(s * 0.62)) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,8,2,0.9)';
    ctx.strokeText(u.villain, 0, -s * 1.55);
    ctx.fillStyle = '#fff3c0';
    ctx.fillText(u.villain, 0, -s * 1.55);
  }
  ctx.restore();
};
} /* end if(__mx_origExtras) */

/* ---------------- 7. safety briefing + victory dossier (DOM) ---------------- */
MX.ensureDom = function(){
  if(typeof document === 'undefined') return false;
  var stage = document.getElementById('stage');
  if(!stage) return false;
  if(!document.getElementById('mxBrief')){
    var b = document.createElement('div');
    b.id = 'mxBrief';
    b.style.cssText = 'position:absolute;top:52px;left:8px;right:8px;z-index:6;' +
      'pointer-events:none;text-align:center;font:700 11px/1.5 system-ui,sans-serif;' +
      'color:#ffe9d6;background:rgba(40,12,4,0.82);border:1px solid rgba(255,160,80,0.5);' +
      'border-radius:10px;padding:7px 10px;display:none;letter-spacing:0.3px;';
    stage.appendChild(b);
  }
  if(!document.getElementById('mxDossier')){
    var w = document.createElement('div');
    w.id = 'mxDossier';
    w.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:8;' +
      'display:none;pointer-events:none;justify-content:center;align-items:flex-start;padding-top:24%;';
    var card = document.createElement('div');
    card.id = 'mxDossierCard';
    card.style.cssText = 'pointer-events:auto;cursor:pointer;max-width:86%;' +
      'background:rgba(24,8,3,0.96);border:2px solid #ffb347;border-radius:14px;' +
      'padding:14px 16px;color:#ffe9d6;font:600 12.5px/1.65 system-ui,sans-serif;' +
      'box-shadow:0 8px 30px rgba(0,0,0,0.6);text-align:left;';
    card.addEventListener('click', function(){ w.style.display = 'none'; });
    w.appendChild(card);
    stage.appendChild(w);
  }
  return true;
};

MX.showBrief = function(){
  if(!MX.ensureDom()) return;
  var el = document.getElementById('mxBrief');
  if(!el) return;
  el.textContent = 'FIRE SAFETY BRIEF: ' + MX.TIPS[MX.tipIdx % MX.TIPS.length];
  MX.tipIdx++;
  el.style.display = 'block';
};

MX.hideBrief = function(){
  if(typeof document === 'undefined') return;
  var el = document.getElementById('mxBrief');
  if(el) el.style.display = 'none';
};

MX.showDossier = function(){
  if(!MX.ensureDom()) return;
  var order = ['A', 'B', 'C', 'D'], rows = [], i, cls;
  for(i = 0; i < order.length; i++){
    cls = order[i];
    if(MX.seenClasses[cls]) rows.push('<div style="margin:5px 0">' + MX.CLASSES[cls].dossier + '</div>');
  }
  if(!rows.length) return;
  var card = document.getElementById('mxDossierCard');
  card.innerHTML = '<div style="font-weight:900;font-size:14px;letter-spacing:1px;margin-bottom:6px">' +
    'AFTER-ACTION DOSSIER</div>' +
    '<div style="opacity:0.85;margin-bottom:6px">Wildfire Legion classes spotted this fight:</div>' +
    rows.join('') +
    '<div style="opacity:0.75;margin-top:8px;font-size:11.5px">Real fire is never a toy — get out, call 911.</div>' +
    '<div style="text-align:center;margin-top:8px;font-weight:800;color:#ffb347">TAP TO CONTINUE</div>';
  document.getElementById('mxDossier').style.display = 'flex';
};

if(typeof Game !== 'undefined'){
  if(typeof Game.toDeploy === 'function'){
    var __mx_origToDeploy = Game.toDeploy;
    Game.toDeploy = function(){
      __mx_origToDeploy.call(Game);
      MX.seenClasses = {}; MX.hinted = {};
      MX.showBrief();
    };
  }
  if(typeof Game.startFight === 'function'){
    var __mx_origStartFight = Game.startFight;
    Game.startFight = function(){
      __mx_origStartFight.call(Game);
      if(Game.phase === 'fight') MX.hideBrief();
    };
  }
  if(typeof Game.checkEnd === 'function'){
    var __mx_origCheckEnd = Game.checkEnd;
    Game.checkEnd = function(){
      __mx_origCheckEnd.call(Game);
      if(Game.phase === 'over' && Game.won && MX.dossierShownFor !== Game.stage){
        MX.dossierShownFor = Game.stage;
        setTimeout(MX.showDossier, 1700);
      }
    };
  }
}

/* debug/test handle for the verifier harness */
if(typeof window !== 'undefined'){
  window.__MX_DEBUG = {
    CLASSES: MX.CLASSES, TIPS: MX.TIPS,
    matchup: MX.matchup, toolFor: MX.toolFor, classesForStage: MX.classesForStage
  };
}

})();
