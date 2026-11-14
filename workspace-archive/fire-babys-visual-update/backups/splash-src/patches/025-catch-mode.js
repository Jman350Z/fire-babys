/* =====================================================================
   PATCH 025 — catch-mode
   Date: 2026-10-04 | For: Jeff (Fire Babys)
   Directive: Jeff — "CATCH" game mode for the 2D game. 2 babys grab
     1 enemy, drag them to YOUR swimming pool, and throw them in —
     POOF! Big cartoon steam cloud, and they're out for the match.
     Rescue rules: 1 rescuer slows carriers 50%, 2+ stop them fully
     and break the victim free after ~1.5s. Elimination wins.
   What it changes:
     - 🏃 CATCH button on the title screen (injected into the title
       grid, same style as the other menu buttons).
     - Self-contained arena mode: 6v6 fire babys vs ember imps, no
       castles, no combat — pure grab / carry / rescue. Player drives
       their captain with the joystick; the other 5 babys + all 6
       imps run catch AI.
     - Swimming pools at each base (blue water, gold/red rims).
       Carriers drag victims to their OWN pool and throw them in:
       steam-burst particles + cartoon "POOF! 💨" + elimination.
     - Win: eliminate all 6 enemy imps. Lose: all 6 of your babys
       steamed. 3-minute timer tiebreak (more units standing wins).
     - HUD scoreboard: units remaining per side + timer + quit ✕.
     - Win/loss recorded via __PROFILE_DEBUG.recordResult (guarded);
       season XP via __FB_SEASON_2D.addXP: 50 win / 10 loss / 10 draw.
   Touches: updateUnit (wrapped), simTick (wrapped), Game.checkEnd
     (wrapped — castles don't exist in catch mode), drawBG (pools),
     drawFireBaby (caught lift + grab progress), render (grab links +
     POOF text), DOM (#titleCatch, #ctScore, #ctEndOv).
     No baseline, combat, or other-mode changes.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: title -> CATCH -> 6v6 arena, joystick drives captain, grabs
     lift victims, pools steam them, scoreboard counts down to a win.
   ===================================================================== */
(function(){
'use strict';

var CT = {};
CT.SQUAD = ['brawler', 'guardian', 'archer', 'pyro', 'brawler', 'guardian'];
CT.GRAB_R = 46;          /* grab radius around a victim (px) */
CT.GRAB_TIME = 1.0;      /* seconds of 2v1 contact to catch */
CT.RESCUE_R = 46;        /* rescuer touch radius */
CT.RESCUE_BREAK = 1.5;   /* seconds of 2+ rescuers to break free */
CT.CARRY_MULT = 0.55;    /* carrier speed multiplier */
CT.IMMUNE = 2.0;         /* grab immunity after freed/thrown (s) */
CT.TOSS_TIME = 0.45;     /* throw-into-pool animation (s) */
CT.MATCH_TIME = 180;     /* 3-minute tiebreak timer */
CT.POOLS = [             /* 0 = player's pool (left), 1 = AI pool (right) */
  { x: 80,  y: 415, r: 62 },
  { x: 400, y: 415, r: 62 }
];
CT.active = false;
CT.over = false;
CT.time = 0;
CT.poofs = [];           /* {x,y,t} cartoon POOF! texts */
CT.sbT = 0;              /* scoreboard throttle */
CT.hintCd = 0;

/* ---------------- unit helpers ---------------- */
CT.live = function(){
  var out = [], i, u;
  for(i = 0; i < CFG.MAX_UNITS; i++){
    u = units[i];
    if(u.active && u.ctCatch) out.push(u);
  }
  return out;
};
CT.count = function(side){
  var n = 0, i, u;
  for(i = 0; i < CFG.MAX_UNITS; i++){
    u = units[i];
    if(u.active && u.ctCatch && u.side === side) n++;
  }
  return n;
};
CT.dist = function(ax, ay, bx, by){
  var dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
};
CT.moveToward = function(u, tx, ty, sp, dt){
  var dx = tx - u.x, dy = ty - u.y;
  var d = Math.sqrt(dx * dx + dy * dy);
  if(d < 2) return;
  if(dx !== 0) u.faceX = dx >= 0 ? 1 : -1;
  u.x += (dx / d) * sp * dt;
  u.y += (dy / d) * sp * dt;
  u.x = clamp(u.x, 20, CFG.W - 20);
  u.y = clamp(u.y, 120, CFG.H - 90);
};

/* ---------------- per-unit tick (replaces combat AI) ---------------- */
CT.unitTick = function(u, dt){
  if(u.ctImmuneT > 0) u.ctImmuneT -= dt;
  if(u.flash > 0) u.flash = Math.max(0, u.flash - dt * 5);
  u.walkPh += dt * 11;
  if(u.ctCaught) return;                       /* positioned by CT.tick */
  if(u.ctCarrying >= 0){
    var z = CT.POOLS[u.side];                  /* drag to OWN pool */
    CT.moveToward(u, z.x, z.y, u.moveSpeed * CT.CARRY_MULT * u.ctSlow, dt);
    return;
  }
  if(u.ctCaptain && u.side === 0 && typeof joy !== 'undefined' && joy.active){
    u.x += joy.dx * 178 * dt;
    u.y += joy.dy * 178 * dt;
    u.x = clamp(u.x, 20, CFG.W - 20);
    u.y = clamp(u.y, 120, CFG.H - 90);
    if(Math.abs(joy.dx) > 0.05) u.faceX = joy.dx >= 0 ? 1 : -1;
    return;
  }
  CT.aiMove(u, dt);
};

/* Simple catch AI: rescue caught allies (max 2 per victim), else hunt. */
CT.aiMove = function(u, dt){
  var i, v, dx, dy, d2, bd, best;
  /* 1. rescue: nearest caught ally that has fewer than 2 rescuers on it */
  best = -1; bd = 1e18;
  var allies = CT.live();
  for(i = 0; i < allies.length; i++){
    v = allies[i];
    if(v.side !== u.side || !v.ctCaught || v.ctTossing) continue;
    var rc = 0, j, w;
    for(j = 0; j < allies.length; j++){
      w = allies[j];
      if(w.side === u.side && !w.ctCaught && w.ctCarrying < 0 && w.ctRescueTarget === v.idx) rc++;
    }
    if(rc >= 2) continue;
    dx = u.x - v.x; dy = u.y - v.y; d2 = dx * dx + dy * dy;
    if(d2 < bd){ bd = d2; best = v.idx; }
  }
  if(best >= 0){
    u.ctRescueTarget = best;
    v = units[best];
    CT.moveToward(u, v.x, v.y, u.moveSpeed, dt);
    return;
  }
  u.ctRescueTarget = -1;
  /* 2. hunt: nearest grabbable enemy */
  best = -1; bd = 1e18;
  for(i = 0; i < allies.length; i++){
    v = allies[i];
    if(v.side === u.side || v.ctCaught || v.ctImmuneT > 0 || v.ctTossing) continue;
    dx = u.x - v.x; dy = u.y - v.y; d2 = dx * dx + dy * dy;
    if(d2 < bd){ bd = d2; best = v.idx; }
  }
  if(best >= 0){
    v = units[best];
    CT.moveToward(u, v.x, v.y, u.moveSpeed, dt);
    return;
  }
  /* 3. nothing to hunt: push toward the enemy pool */
  var px = u.side === 0 ? CT.POOLS[1].x : CT.POOLS[0].x;
  CT.moveToward(u, px, 415, u.moveSpeed * 0.7, dt);
};

/* ---------------- grab / catch ---------------- */
CT.grabbersNear = function(victim, side){
  /* free units of `side` within GRAB_R of victim */
  var out = [], i, u;
  for(i = 0; i < CFG.MAX_UNITS; i++){
    u = units[i];
    if(!u.active || !u.ctCatch || u.side !== side) continue;
    if(u.ctCaught || u.ctCarrying >= 0) continue;
    if(CT.dist(u.x, u.y, victim.x, victim.y) <= CT.GRAB_R) out.push(u.idx);
  }
  /* nearest two first */
  out.sort(function(a, b){
    var da = CT.dist(units[a].x, units[a].y, victim.x, victim.y);
    var db = CT.dist(units[b].x, units[b].y, victim.x, victim.y);
    return da - db;
  });
  return out;
};

CT.catchUnit = function(e){
  /* if the victim was carrying someone, that someone gets dropped */
  if(e.ctCarrying >= 0){
    var old = units[e.ctCarrying];
    if(old && old.active) CT.freeVictim(old, true);
    e.ctCarrying = -1;
  }
  var g = CT.grabbersNear(e, 1 - e.side);
  if(g.length < 2) return;
  e.ctCaught = true;
  e.ctTossing = false;
  e.ctGrabT = 0;
  e.ctRescueT = 0;
  e.ctCarriers = [g[0], g[1]];
  units[g[0]].ctCarrying = e.idx; units[g[0]].ctSlow = 1;
  units[g[1]].ctCarrying = e.idx; units[g[1]].ctSlow = 1;
  try{ if(typeof AudioSys !== 'undefined' && AudioSys.ui) AudioSys.ui(); }catch(e1){}
  if(CT.hintCd <= 0){
    try{
      if(typeof UI !== 'undefined' && UI.hint){
        UI.hint(e.side === 1 ? '🎯 CAUGHT! Drag them to YOUR pool!' :
                               '⚠️ One of yours is caught! Grab them back!');
      }
    }catch(e2){}
    CT.hintCd = 2.5;
  }
};

CT.freeVictim = function(v, silent){
  var i, c;
  for(i = 0; i < v.ctCarriers.length; i++){
    c = units[v.ctCarriers[i]];
    if(c && c.active){ c.ctCarrying = -1; c.ctSlow = 1; }
  }
  v.ctCarriers = [];
  v.ctCaught = false;
  v.ctTossing = false;
  v.ctGrabT = 0;
  v.ctRescueT = 0;
  v.ctImmuneT = CT.IMMUNE;
  if(!silent && CT.hintCd <= 0){
    try{
      if(typeof UI !== 'undefined' && UI.hint){
        UI.hint(v.side === 0 ? '💪 SAVED! Nice rescue!' : '😤 They saved their imp!');
      }
    }catch(e){}
    CT.hintCd = 2.5;
  }
};

/* ---------------- throw in the pool + POOF ---------------- */
CT.startToss = function(v){
  var ps = 1 - v.side;                       /* carriers' side = own pool */
  var z = CT.POOLS[ps];
  var i, c;
  for(i = 0; i < v.ctCarriers.length; i++){
    c = units[v.ctCarriers[i]];
    if(c && c.active){ c.ctCarrying = -1; c.ctSlow = 1; }
  }
  v.ctCarriers = [];
  v.ctTossing = true;
  v.ctToss = CT.TOSS_TIME;
  v.ctTossX0 = v.x; v.ctTossY0 = v.y;
  v.ctTossZX = z.x; v.ctTossZY = z.y;
};

CT.poof = function(v){
  var x = v.ctTossZX, y = v.ctTossZY;
  try{
    if(typeof burst === 'function'){
      burst(x, y - 10, '#ffffff', 22, 260, 0.9, 7, -60);   /* steam cloud */
      burst(x, y - 10, '#cfd8dc', 14, 180, 1.1, 9, -40);   /* gray steam */
      burst(x, y, '#7cc9ff', 10, 200, 0.6, 5, 200);        /* splash */
    }
  }catch(e){}
  CT.poofs.push({ x: x, y: y - 30, t: 1.2 });
  try{ if(typeof AudioSys !== 'undefined' && AudioSys.boom) AudioSys.boom(); }catch(e2){}
  try{
    if(typeof UI !== 'undefined' && UI.hint && CT.hintCd <= 0){
      UI.hint(v.side === 1 ? '💨 POOF! Imp steamed!' : '💨 POOF! One of yours got steamed!');
      CT.hintCd = 2.5;
    }
  }catch(e3){}
  try{ if(typeof freeUnit === 'function') freeUnit(v.idx); }catch(e4){}
};

/* ---------------- main catch tick (runs after unit movement) ---------------- */
CT.tick = function(dt){
  if(!CT.active || CT.over) return;
  CT.time -= dt;
  if(CT.hintCd > 0) CT.hintCd -= dt;
  var i, j, u, v, c;

  /* 1. grab detection */
  for(i = 0; i < CFG.MAX_UNITS; i++){
    u = units[i];
    if(!u.active || !u.ctCatch || u.ctCaught || u.ctTossing) continue;
    if(u.ctImmuneT > 0) continue;
    var g = CT.grabbersNear(u, 1 - u.side);
    if(g.length >= 2){
      u.ctGrabT += dt;
      if(u.ctGrabT >= CT.GRAB_TIME) CT.catchUnit(u);
    } else {
      u.ctGrabT = 0;
    }
  }

  /* 2. carries: validate carriers, rescues, victim follows, pool check */
  for(i = 0; i < CFG.MAX_UNITS; i++){
    v = units[i];
    if(!v.active || !v.ctCatch || !v.ctCaught) continue;
    if(v.ctTossing){
      /* mid-air throw: arc toward pool center */
      v.ctToss -= dt;
      var p = 1 - Math.max(0, v.ctToss) / CT.TOSS_TIME;
      v.x = v.ctTossX0 + (v.ctTossZX - v.ctTossX0) * p;
      v.y = v.ctTossY0 + (v.ctTossZY - v.ctTossY0) * p - Math.sin(p * 3.1416) * 50;
      if(v.ctToss <= 0) CT.poof(v);
      continue;
    }
    /* validate the two carriers */
    var cars = [];
    for(j = 0; j < v.ctCarriers.length; j++){
      c = units[v.ctCarriers[j]];
      if(c && c.active && c.ctCatch && !c.ctCaught && c.ctCarrying === v.idx) cars.push(c.idx);
    }
    v.ctCarriers = cars;
    if(cars.length < 2){ CT.freeVictim(v, true); continue; }
    /* rescuers: victim's teammates touching them */
    var resc = 0;
    for(j = 0; j < CFG.MAX_UNITS; j++){
      u = units[j];
      if(!u.active || !u.ctCatch || u.side !== v.side || u.idx === v.idx) continue;
      if(u.ctCaught) continue;
      if(cars.indexOf(u.idx) >= 0) continue;
      if(CT.dist(u.x, u.y, v.x, v.y) <= CT.RESCUE_R) resc++;
    }
    var slow;
    if(resc >= 2){
      slow = 0;
      v.ctRescueT += dt;
      if(v.ctRescueT >= CT.RESCUE_BREAK){ CT.freeVictim(v, false); continue; }
    } else {
      v.ctRescueT = 0;
      slow = (resc === 1) ? 0.5 : 1;
    }
    for(j = 0; j < cars.length; j++) units[cars[j]].ctSlow = slow;
    /* victim rides at the carriers' midpoint */
    var c0 = units[cars[0]], c1 = units[cars[1]];
    v.x = (c0.x + c1.x) / 2;
    v.y = (c0.y + c1.y) / 2;
    /* reached OWN pool? (carriers' side) -> throw them in */
    var z = CT.POOLS[1 - v.side];
    if(CT.dist(v.x, v.y, z.x, z.y) <= z.r) CT.startToss(v);
  }

  /* 3. poof text decay */
  for(i = CT.poofs.length - 1; i >= 0; i--){
    CT.poofs[i].t -= dt;
    if(CT.poofs[i].t <= 0) CT.poofs.splice(i, 1);
  }

  /* 4. win / lose / timer */
  var mine = CT.count(0), foes = CT.count(1);
  if(foes <= 0 && mine > 0){ CT.endMatch('win'); return; }
  if(mine <= 0 && foes > 0){ CT.endMatch('lose'); return; }
  if(mine <= 0 && foes <= 0){ CT.endMatch('draw'); return; }
  if(CT.time <= 0){
    if(mine > foes) CT.endMatch('win');
    else if(foes > mine) CT.endMatch('lose');
    else CT.endMatch('draw');
    return;
  }

  /* 5. scoreboard */
  CT.sbT -= dt;
  if(CT.sbT <= 0){ CT.sbT = 0.25; CT.scoreboard(false); }
};

CT.fmtTime = function(){
  var s = Math.max(0, Math.ceil(CT.time));
  var m = Math.floor(s / 60);
  return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
};

/* ---------------- scoreboard ---------------- */
CT.scoreboard = function(create){
  try{
    var el = document.getElementById('ctScore');
    if(create && !el){
      el = document.createElement('div');
      el.id = 'ctScore';
      el.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:99980;' +
        'background:rgba(12,6,4,.85);border:2px solid #ffd76a;border-radius:14px;' +
        'color:#fff;font:800 15px system-ui;padding:8px 14px;display:flex;gap:10px;align-items:center;';
      document.body.appendChild(el);
      var q = document.createElement('button');
      q.textContent = '✕';
      q.setAttribute('aria-label', 'Quit splash mode');
      q.style.cssText = 'background:#3a1c0c;color:#ffd76a;border:1px solid #ffd76a;' +
        'border-radius:8px;font-size:13px;padding:3px 9px;cursor:pointer;';
      q.addEventListener('click', function(){ CT.stop(true); });
      el.appendChild(q);
      el.insertBefore(document.createElement('span'), q).id = 'ctScoreTxt';
    }
    if(!el && !create) return;
    el = el || document.getElementById('ctScore');
    if(!el) return;
    el.style.display = '';
    var t = document.getElementById('ctScoreTxt');
    if(t) t.textContent = '🔵 YOU ' + CT.count(0) + '  ·  🔴 IMPS ' + CT.count(1) + '  ·  ⏱ ' + CT.fmtTime();
  }catch(e){}
};
CT.hideScoreboard = function(){
  try{
    var el = document.getElementById('ctScore');
    if(el) el.style.display = 'none';
  }catch(e){}
};

/* ---------------- match end ---------------- */
CT.endMatch = function(result){
  CT.over = true;
  /* NOTE: CT.active stays true so the Game.checkEnd wrapper keeps
     skipping the castle-based end check (there are no castles in
     catch mode) and frozen units don't fall back into combat AI. */
  CT.hideScoreboard();
  var won = result === 'win';
  try{
    if(result !== 'draw' && window.__PROFILE_DEBUG &&
       typeof window.__PROFILE_DEBUG.recordResult === 'function'){
      window.__PROFILE_DEBUG.recordResult(won);
    }
  }catch(e){}
  try{
    if(window.__FB_SEASON_2D && typeof window.__FB_SEASON_2D.addXP === 'function'){
      window.__FB_SEASON_2D.addXP(won ? 50 : 10);
    }
  }catch(e2){}
  try{ if(typeof AudioSys !== 'undefined'){ if(won && AudioSys.victory) AudioSys.victory(); else if(!won && result !== 'draw' && AudioSys.defeat) AudioSys.defeat(); } }catch(e3){}
  CT.showEnd(result);
};

CT.showEnd = function(result){
  try{
    CT.closeEnd();
    var title, sub, col;
    if(result === 'win'){ title = '🏆 YOU WIN!'; sub = 'Every last imp got POOFED into steam!'; col = '#ffd76a'; }
    else if(result === 'lose'){ title = '💨 STEAMED!'; sub = 'The imps dunked your whole crew. Rematch?'; col = '#ff6a6a'; }
    else { title = '🤝 DRAW!'; sub = 'Nobody got fully steamed. Run it back!'; col = '#7cc9ff'; }
    var ov = document.createElement('div');
    ov.id = 'ctEndOv';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(8,4,2,.88);padding:20px;box-sizing:border-box;';
    ov.innerHTML =
      '<div style="width:100%;max-width:420px;background:linear-gradient(180deg,#241408,#120a05);' +
      'border:3px solid #ffd76a;border-radius:20px;padding:26px;text-align:center;">' +
      '<div style="font:900 30px system-ui;color:' + col + ';margin-bottom:8px;">' + title + '</div>' +
      '<div style="font:600 14px system-ui;color:#ffe9d6;margin-bottom:6px;">' + sub + '</div>' +
      '<div style="font:700 12px system-ui;color:#d8b89a;margin-bottom:18px;">Splash the ember imps! 💨</div>' +
      '<div style="display:flex;gap:10px;justify-content:center;">' +
      '<button id="ctAgain" style="background:linear-gradient(180deg,#ff7a2e,#e23c0a);color:#fff;border:none;' +
      'border-radius:12px;font:900 16px system-ui;padding:12px 26px;cursor:pointer;">🔁 PLAY AGAIN</button>' +
      '<button id="ctTitle" style="background:rgba(12,6,4,.72);color:#ffe9d6;border:1px solid rgba(255,150,60,.4);' +
      'border-radius:12px;font:800 16px system-ui;padding:12px 22px;cursor:pointer;">TITLE</button>' +
      '</div></div>';
    document.body.appendChild(ov);
    ov.querySelector('#ctAgain').addEventListener('click', function(){ CT.closeEnd(); CT.start(); });
    ov.querySelector('#ctTitle').addEventListener('click', function(){ CT.closeEnd(); CT.stop(true); });
  }catch(e){}
};
CT.closeEnd = function(){
  try{
    var ov = document.getElementById('ctEndOv');
    if(ov && ov.parentNode) ov.parentNode.removeChild(ov);
  }catch(e){}
};

/* ---------------- start / stop ---------------- */
CT.start = function(){
  try{
    CT.closeEnd();
    if(typeof Game !== 'undefined' && Game.clearField) Game.clearField();
    Game.phase = 'fight';
    CT.active = true;
    CT.over = false;
    CT.time = CT.MATCH_TIME;
    CT.poofs = [];
    CT.sbT = 0;
    CT.hintCd = 0;
    var i, a, b, u, v;
    for(i = 0; i < CT.SQUAD.length; i++){
      var y = 200 + i * 92;
      a = spawnUnit(0, CT.SQUAD[i], 1, 120, y, 1, false);
      if(a >= 0){
        u = units[a];
        u.ctCatch = true; u.ctCaught = false; u.ctTossing = false;
        u.ctCarrying = -1; u.ctCarriers = []; u.ctSlow = 1;
        u.ctGrabT = 0; u.ctRescueT = 0; u.ctImmuneT = 1.5;
        u.ctRescueTarget = -1; u.ctCaptain = (i === 0);
        u.faceX = 1;
      }
      b = spawnUnit(1, CT.SQUAD[i], 1, CFG.W - 120, y, 1, false);
      if(b >= 0){
        v = units[b];
        v.ctCatch = true; v.ctCaught = false; v.ctTossing = false;
        v.ctCarrying = -1; v.ctCarriers = []; v.ctSlow = 1;
        v.ctGrabT = 0; v.ctRescueT = 0; v.ctImmuneT = 1.5;
        v.ctRescueTarget = -1; v.ctCaptain = false;
        v.faceX = -1;
      }
    }
    try{ if(typeof UI !== 'undefined'){ UI.setBigBtn(false); UI.showTroops(false); UI.showNova(false); } }catch(e1){}
    try{ if(typeof UI !== 'undefined' && UI.hint) UI.hint('🏃 SPLASH! 2 babys grab 1 imp — throw them in YOUR pool! 💨'); }catch(e2){}
    try{ if(typeof joy !== 'undefined'){ joy.active = false; joy.id = -1; joy.dx = 0; joy.dy = 0; } }catch(e3){}
    CT.scoreboard(true);
  }catch(e){}
};

CT.stop = function(toTitle){
  CT.active = false;
  CT.over = false;
  CT.poofs = [];
  CT.closeEnd();
  CT.hideScoreboard();
  try{
    var i, u;
    for(i = 0; i < CFG.MAX_UNITS; i++){
      u = units[i];
      if(u.active) u.ctCatch = false;
    }
    if(typeof Game !== 'undefined' && Game.clearField) Game.clearField();
  }catch(e){}
  if(toTitle){
    try{ if(typeof Game !== 'undefined' && Game.toDeploy) Game.toDeploy(); }catch(e2){}
    try{
      if(window.__TITLE_DEBUG && typeof window.__TITLE_DEBUG.show === 'function'){
        window.__TITLE_DEBUG.show();
      }
    }catch(e3){}
  }
};

/* ---------------- title screen button ---------------- */
CT.injectBtn = function(){
  try{
    if(typeof document === 'undefined') return true;
    if(document.getElementById('titleCatch')) return true;
    var play = document.getElementById('titlePlay');
    var grid = play && play.parentNode;
    if(!grid || !grid.appendChild) return false;
    var b = document.createElement('button');
    b.id = 'titleCatch';
    b.textContent = '🏃 SPLASH';
    b.style.cssText = 'background:rgba(12,6,4,.72);color:#ffe9d6;border:1px solid rgba(255,150,60,.4);' +
      'border-radius:12px;font:800 14px system-ui;padding:12px;cursor:pointer;letter-spacing:.5px;';
    b.addEventListener('click', function(){
      try{
        if(window.__TITLE_DEBUG && typeof window.__TITLE_DEBUG.play === 'function'){
          window.__TITLE_DEBUG.play();
        }
      }catch(e){}
      CT.start();
    });
    grid.appendChild(b);
    return true;
  }catch(e){ return false; }
};

/* ---------------- baseline wrappers ---------------- */
if(typeof updateUnit === 'function'){
  var __ct_origUpdateUnit = updateUnit;
  updateUnit = function(u, dt){
    if(CT.active && u.ctCatch){
      if(!CT.over) CT.unitTick(u, dt);   /* over: freeze units in place */
      return;
    }
    __ct_origUpdateUnit(u, dt);
  };
}
if(typeof simTick === 'function'){
  var __ct_origSimTick = simTick;
  simTick = function(dt){
    __ct_origSimTick(dt);
    try{ CT.tick(dt); }catch(e){}
  };
}
if(typeof Game !== 'undefined' && Game.checkEnd){
  var __ct_origCheckEnd = Game.checkEnd;
  Game.checkEnd = function(){
    if(CT.active) return;   /* no castles in catch mode — CT.tick decides the end */
    __ct_origCheckEnd.apply(this, arguments);
  };
}
if(typeof drawBG === 'function'){
  var __ct_origDrawBG = drawBG;
  drawBG = function(){
    __ct_origDrawBG();
    if(!CT.active) return;
    try{
      var t = (typeof simTime !== 'undefined') ? simTime : 0;
      var s, z;
      for(s = 0; s < 2; s++){
        z = CT.POOLS[s];
        /* water */
        ctx.fillStyle = '#2f9df0';
        ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.72, 0, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#7cc9ff';
        ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r * 0.78, z.r * 0.55, 0, 0, 6.2832); ctx.fill();
        /* animated wave lines */
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 2.5;
        var k;
        for(k = 0; k < 3; k++){
          var wy = z.y - 18 + k * 16 + Math.sin(t * 2.5 + k * 2 + s) * 3;
          ctx.beginPath();
          ctx.ellipse(z.x, wy, z.r * 0.55, 7, 0, 0.3, 3.1416 - 0.3);
          ctx.stroke();
        }
        /* rim */
        ctx.strokeStyle = s === 0 ? '#ffd76a' : '#ff5d5d';
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.72, 0, 0, 6.2832); ctx.stroke();
        /* label */
        ctx.fillStyle = s === 0 ? '#ffd76a' : '#ff8a8a';
        ctx.font = 'bold 13px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(s === 0 ? 'YOUR POOL' : 'IMP POOL', z.x, z.y - z.r * 0.72 - 10);
      }
    }catch(e){}
  };
}
if(typeof drawFireBaby === 'function'){
  var __ct_origDrawFireBaby = drawFireBaby;
  drawFireBaby = function(u){
    if(CT.active && u.ctCatch && u.active){
      try{
        if(u.ctCaught){
          /* gold grab ring + lifted, bobbing body */
          ctx.strokeStyle = '#ffd76a';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(u.x, u.y, u.size + 9, 0, 6.2832); ctx.stroke();
          var t = (typeof simTime !== 'undefined') ? simTime : 0;
          var oy = u.y;
          u.y = oy - 18 - Math.sin(t * 7) * 3;
          __ct_origDrawFireBaby(u);
          u.y = oy;
          return;
        }
        if(u.ctGrabT > 0.05){
          /* grab progress arc overhead */
          var p = Math.min(1, u.ctGrabT / CT.GRAB_TIME);
          ctx.strokeStyle = '#ff5d2e';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(u.x, u.y - u.size - 14, 10, -1.5708, -1.5708 + p * 6.2832);
          ctx.stroke();
        }
      }catch(e){}
    }
    __ct_origDrawFireBaby(u);
  };
}
if(typeof render === 'function'){
  var __ct_origRender = render;
  render = function(){
    __ct_origRender();
    if(!CT.active) return;
    try{
      var i, j, u, c;
      /* grab links: carrier -> victim */
      ctx.save();
      ctx.strokeStyle = 'rgba(255,215,106,0.55)';
      ctx.lineWidth = 3;
      for(i = 0; i < CFG.MAX_UNITS; i++){
        u = units[i];
        if(!u.active || !u.ctCatch || !u.ctCaught || u.ctTossing) continue;
        for(j = 0; j < u.ctCarriers.length; j++){
          c = units[u.ctCarriers[j]];
          if(c && c.active){
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(u.x, u.y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
      /* cartoon POOF! texts */
      for(i = 0; i < CT.poofs.length; i++){
        var pf = CT.poofs[i];
        var a = Math.max(0, Math.min(1, pf.t / 1.2));
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = '900 30px system-ui';
        ctx.textAlign = 'center';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#2f9df0';
        var py = pf.y - (1.2 - pf.t) * 45;
        ctx.strokeText('POOF! 💨', pf.x, py);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('POOF! 💨', pf.x, py);
        ctx.restore();
      }
    }catch(e){}
  };
}

/* ---------------- boot ---------------- */
CT.injectBtn();
if(typeof window !== 'undefined'){
  var __ct_tries = 0;
  var __ct_iv = setInterval(function(){
    __ct_tries++;
    try{ if(CT.injectBtn() || __ct_tries > 40) clearInterval(__ct_iv); }catch(e){}
  }, 500);
  window.__CATCH_DEBUG = {
    active: function(){ return CT.active; },
    start: CT.start, stop: CT.stop,
    counts: function(){ return { you: CT.count(0), imps: CT.count(1) }; }
  };
}

})();
