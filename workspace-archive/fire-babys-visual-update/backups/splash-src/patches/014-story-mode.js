/* =====================================================================
   PATCH 014 — story-mode
   Date: 2026-10-02 | For: Jeff (Fire Babys)
   Directive: Jeff — Mario-style world map + "Story mode Bobby!!!!" +
     "Our main team are teenagers training to protect the land."
   Canon: the six heroes are TEENAGE TRAINEES. The world map is their
     training journey — six towns, six trials, graduation at the end.
     (Locks into 008's lore: junior school -> high school graduation.)
   What it changes:
     - WORLD MAP overlay (HUD 🗺️ button, gently pulsing until first
       opened): a winding Mario-3-style path through 6 towns.
       Each town: icon, name, ruling villain, lock state, win progress.
     - Tapping a town shows its TRAINING BRIEF: story intro + the
       fire-safety lesson that town teaches + START.
     - Wins count toward the active town (3 wins liberates it) via a
       Game.checkEnd hook (chains with 003's hook). Liberating a town
       unlocks the next; liberating the volcano = GRADUATION.
     - Progress persists in localStorage (own key, guarded).
   The six towns (each teaches its fire class — the story IS the
   fire-safety curriculum):
     1. Ember Village   — Twiggy (Class A trash)    — match tools to fires
     2. Greaseworks     — Slick   (Class B grease)   — NEVER water on grease
     3. Volt Town       — Buzz    (Class C electric) — kill the power first
     4. Slagheap        — Slag    (Class D metal)    — sand/special agents
     5. Smokestack City — all four villains          — read the fire, all classes
     6. Inferno's Volcano — Lord Inferno             — the final exam
   Touches: DOM only (#storyBtn, #storyOv, #townOv, #storyDoneOv).
     No canvas, combat, or baseline changes.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: 6 towns defined; completing town 1 unlocks town 2; map builds.
   ===================================================================== */
(function(){
'use strict';

var SM = {};
SM.WINS_PER_TOWN = 3;
SM.KEY = 'fb_story_v1';

/* ---------------- 1. the journey ---------------- */
SM.TOWNS = [
  { id:'ember', name:'Ember Village', icon:'🟤', villain:'Twiggy', vfull:'Twiggy & Cardboard Carl',
    fclass:'Class A — trash & wood',
    intro:'Where every protector starts. Twiggy\'s trash fires are spreading through the village — time for your first trial.',
    lesson:'Match the tool to the fire. Trash and wood fires (Class A) are your training ground — learn what each hero\'s tool does.',
    done:'Ember Village is safe. The land noticed.' },
  { id:'grease', name:'Greaseworks', icon:'🟡', villain:'Slick', vfull:'Slick & Fryer Frank',
    fclass:'Class B — grease',
    intro:'Slick\'s grease kitchens are ablaze, and the whole district smells like bad decisions.',
    lesson:'NEVER water on a grease fire (Class B) — it explodes. Smother it: Sizzle\'s squirt gun stays home, Cinder\'s foam goes to work.',
    done:'Greaseworks is safe. No kitchens exploded today.' },
  { id:'volt', name:'Volt Town', icon:'🔵', villain:'Buzz', vfull:'Buzz',
    fclass:'Class C — electrical',
    intro:'Buzz has electrified the power plant. The lights are out and the hum is angry.',
    lesson:'Water + electricity = disaster (Class C). Kill the power first — find the Main Power Switch before you fight the flames.',
    done:'Volt Town has power again. You did that.' },
  { id:'slag', name:'Slagheap', icon:'⚫', villain:'Slag', vfull:'Slag & Thermite Tim',
    fclass:'Class D — metal',
    intro:'Slag\'s scrapyard burns with metal fires that laugh at water. This is advanced training.',
    lesson:'Metal fires (Class D) need sand and special agents. Ruko\'s sand is your best friend here — water just makes it worse.',
    done:'The Slagheap is cool to the touch. Advanced training: passed.' },
  { id:'smoke', name:'Smokestack City', icon:'🌫️', villain:'All four', vfull:'Twiggy, Slick, Buzz & Slag',
    fclass:'All classes — final review',
    intro:'They\'re all back, and they brought friends. Every fire class at once, no warm-ups.',
    lesson:'Read the fire before you fight it. A is not B, B is not C, C is not D — a true protector picks the right tool every time.',
    done:'Smokestack City breathes clean air. One trial left.' },
  { id:'volcano', name:'Inferno\'s Volcano', icon:'🌋', villain:'Lord Inferno', vfull:'Lord Inferno',
    fclass:'The final exam',
    intro:'The final exam. Lord Inferno himself waits at the crater. Everything you learned — every town, every lesson — comes down to this.',
    lesson:'Protect the land. Trust your training. Graduate.',
    done:'The volcano is quiet. You are no longer trainees.' }
];

/* ---------------- 2. progress store ---------------- */
SM.mem = null;
SM.load = function(){
  if(SM.mem) return SM.mem;
  var d = { unlocked: 1, wins: {}, done: [], seen: false };
  try{
    if(typeof localStorage !== 'undefined'){
      var raw = localStorage.getItem(SM.KEY);
      if(raw){ var p = JSON.parse(raw); if(p && typeof p === 'object') d = p; }
    }
  }catch(e){}
  if(!d.wins) d.wins = {};
  if(!d.done) d.done = [];
  if(!d.unlocked || d.unlocked < 1) d.unlocked = 1;
  SM.mem = d;
  return d;
};
SM.save = function(){
  try{ if(typeof localStorage !== 'undefined') localStorage.setItem(SM.KEY, JSON.stringify(SM.mem)); }catch(e){}
};
SM.town = function(i){ return SM.TOWNS[i]; };
SM.isDone = function(i){ return SM.load().done.indexOf(SM.TOWNS[i].id) >= 0; };
SM.isUnlocked = function(i){ return i < SM.load().unlocked; };
SM.wins = function(i){ return SM.load().wins[SM.TOWNS[i].id] || 0; };
SM.activeTown = function(){
  var d = SM.load();
  for(var i = 0; i < SM.TOWNS.length; i++){
    if(i < d.unlocked && d.done.indexOf(SM.TOWNS[i].id) < 0) return i;
  }
  return -1; /* everything liberated */
};

/* ---------------- 3. win hook ---------------- */
SM.onWin = function(){
  var d = SM.load();
  var ai = SM.activeTown();
  if(ai < 0) return;
  var t = SM.TOWNS[ai];
  var w = (d.wins[t.id] || 0) + 1;
  d.wins[t.id] = w;
  if(w >= SM.WINS_PER_TOWN && d.done.indexOf(t.id) < 0){
    d.done.push(t.id);
    if(ai + 1 < SM.TOWNS.length) d.unlocked = Math.max(d.unlocked, ai + 2);
    SM.save();
    SM.liberated(ai);
  } else {
    SM.save();
    try{ if(typeof UI !== 'undefined' && UI.hint) UI.hint('🗺️ ' + t.name + ': ' + w + '/' + SM.WINS_PER_TOWN + ' wins'); }catch(e){}
  }
};
if(typeof Game !== 'undefined' && Game.checkEnd){
  var __sm_origCheckEnd = Game.checkEnd;
  Game.checkEnd = function(){
    var wasWon = this.won;
    __sm_origCheckEnd.apply(this, arguments);
    try{ if(this.won && !wasWon) SM.onWin(); }catch(e){}
  };
}

/* ---------------- 4. HUD button ---------------- */
SM.ensureBtn = function(){
  try{
    if(typeof document === 'undefined') return false;
    if(document.getElementById('storyBtn')) return true;
    var hud = document.getElementById('hud');
    if(!hud) return false;
    var b = document.createElement('button');
    b.id = 'storyBtn';
    b.textContent = '🗺️';
    b.setAttribute('aria-label', 'story mode world map');
    b.style.cssText = 'pointer-events:auto;background:rgba(12,6,4,.72);' +
      'border:1px solid rgba(255,150,60,.25);border-radius:10px;' +
      'font-size:20px;padding:6px 9px;margin-right:6px;cursor:pointer;';
    if(b.addEventListener) b.addEventListener('click', function(){ SM.openMap(); });
    var mute = document.getElementById('muteBtn');
    if(mute && hud.insertBefore) hud.insertBefore(b, mute); else hud.appendChild(b);
    SM.btn = b;
    if(!SM.load().seen && b.animate){
      try{ b.animate([{transform:'scale(1)'},{transform:'scale(1.18)'},{transform:'scale(1)'}],
        {duration:900, iterations:Infinity}); }catch(e){}
    }
    return true;
  }catch(e){ return false; }
};

/* ---------------- 5. world map ---------------- */
SM.mapCss = function(){
  try{
    if(typeof document === 'undefined' || document.getElementById('smCss')) return;
    var s = document.createElement('style');
    s.id = 'smCss';
    s.textContent =
      '#storyOv{position:absolute;top:0;left:0;right:0;bottom:0;z-index:42;display:none;' +
      'flex-direction:column;background:rgba(8,3,2,.97);}' +
      '.sm-node{display:flex;gap:12px;align-items:center;background:rgba(30,12,6,.9);' +
      'border:2px solid rgba(255,150,60,.3);border-radius:14px;padding:12px;margin:8px 18px;cursor:pointer}' +
      '.sm-node.locked{opacity:.45;cursor:default;border-style:dashed}' +
      '.sm-node.done{border-color:#7dff9a}' +
      '.sm-node.active{border-color:#ffd76a;box-shadow:0 0 18px rgba(255,215,106,.35)}' +
      '.sm-node .ic{font-size:34px}' +
      '.sm-node .nm{flex:1}.sm-node .nm b{color:#ffd76a;font-size:15px;display:block}' +
      '.sm-node .nm span{font-size:11px;color:#c98a5a}' +
      '.sm-pips{font-size:13px;letter-spacing:2px}';
    var h = document.getElementsByTagName && document.getElementsByTagName('head')[0];
    (h || document.body).appendChild(s);
  }catch(e){}
};

SM.buildMap = function(){
  if(typeof document === 'undefined') return false;
  SM.mapCss();
  var old = document.getElementById('storyOv');
  if(old && old.parentNode && old.parentNode.removeChild) old.parentNode.removeChild(old);
  var stage = document.getElementById('stage') || document.body;
  if(!stage || !stage.appendChild) return false;
  var ov = document.createElement('div');
  ov.id = 'storyOv';
  var head = document.createElement('div');
  head.style.cssText = 'padding:16px 18px 4px;text-align:center;';
  head.innerHTML =
    '<div style="color:#ffd76a;font:900 20px system-ui;letter-spacing:2px">🗺️ STORY MODE</div>' +
    '<div style="color:#ffe9d6;opacity:.75;font:600 12px/1.6 system-ui;margin-top:4px">' +
    'You are teenage trainees learning to protect the land.<br>Six towns. Six trials. Graduate.</div>';
  ov.appendChild(head);
  var list = document.createElement('div');
  list.style.cssText = 'flex:1;overflow-y:auto;padding:8px 0 12px;';
  var ai = SM.activeTown();
  for(var i = SM.TOWNS.length - 1; i >= 0; i--){
    (function(idx){
      var t = SM.TOWNS[idx];
      var locked = !SM.isUnlocked(idx), done = SM.isDone(idx);
      var n = document.createElement('div');
      n.className = 'sm-node' + (locked ? ' locked' : '') + (done ? ' done' : '') +
        (idx === ai ? ' active' : '');
      /* winding path: alternate the side margin, Mario-3 style */
      n.style.marginLeft = (idx % 2 === 0) ? '18px' : '70px';
      n.style.marginRight = (idx % 2 === 0) ? '70px' : '18px';
      var pips = '';
      if(!locked && !done){
        var w = SM.wins(idx);
        for(var k = 0; k < SM.WINS_PER_TOWN; k++) pips += (k < w ? '●' : '○');
      }
      n.innerHTML =
        '<div class="ic">' + (locked ? '🔒' : t.icon) + '</div>' +
        '<div class="nm"><b>' + t.name + '</b><span>' +
        (locked ? 'Liberate the previous town' : t.vfull + ' · ' + t.fclass) +
        '</span></div>' +
        '<div class="sm-pips" style="color:#ffd76a">' + pips + '</div>' +
        (done ? '<div style="font-size:20px">✅</div>' : '');
      if(!locked && n.addEventListener) n.addEventListener('click', function(){ SM.brief(idx); });
      list.appendChild(n);
    })(i);
  }
  ov.appendChild(list);
  var foot = document.createElement('div');
  foot.style.cssText = 'padding:10px;text-align:center;';
  var close = document.createElement('button');
  close.textContent = 'CLOSE';
  close.style.cssText = 'background:#ff5d2e;color:#fff;border:none;border-radius:20px;' +
    'font:800 13px system-ui;padding:10px 26px;cursor:pointer;';
  if(close.addEventListener) close.addEventListener('click', function(){ SM.closeMap(); });
  foot.appendChild(close);
  ov.appendChild(foot);
  stage.appendChild(ov);
  SM.ov = ov;
  return true;
};

SM.openMap = function(){
  if(!SM.buildMap()) return;
  var d = SM.load();
  if(!d.seen){ d.seen = true; SM.save(); }
  SM.ov.style.display = 'flex';
};
SM.closeMap = function(){
  var ov = SM.ov || (typeof document !== 'undefined' && document.getElementById('storyOv'));
  if(ov) ov.style.display = 'none';
};

/* ---------------- 6. training brief ---------------- */
SM.brief = function(idx){
  if(typeof document === 'undefined') return false;
  SM.closeMap();
  var old = document.getElementById('townOv');
  if(old && old.parentNode && old.parentNode.removeChild) old.parentNode.removeChild(old);
  var stage = document.getElementById('stage') || document.body;
  if(!stage || !stage.appendChild) return false;
  var t = SM.TOWNS[idx];
  var ov = document.createElement('div');
  ov.id = 'townOv';
  ov.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:43;display:flex;' +
    'flex-direction:column;justify-content:center;align-items:center;' +
    'background:rgba(8,3,2,.96);padding:24px;text-align:center;';
  var box = document.createElement('div');
  box.style.cssText = 'max-width:460px;display:flex;flex-direction:column;align-items:center;';
  box.innerHTML =
    '<div style="font-size:56px;margin-bottom:6px">' + t.icon + '</div>' +
    '<div style="color:#ffd76a;font:900 22px system-ui;letter-spacing:1px">' + t.name.toUpperCase() + '</div>' +
    '<div style="color:#ff9d3c;font:700 12px system-ui;letter-spacing:1.5px;margin:4px 0 10px">RULED BY ' +
    t.vfull.toUpperCase() + '</div>' +
    '<div style="color:#ffe9d6;font:600 14px/1.6 system-ui;margin-bottom:12px">' + t.intro + '</div>' +
    '<div style="background:rgba(255,120,40,.12);border:1px solid rgba(255,150,60,.4);border-radius:12px;' +
    'padding:12px 14px;margin-bottom:18px;text-align:left">' +
    '<div style="color:#ffd76a;font:800 11px system-ui;letter-spacing:1.5px;margin-bottom:4px">🔥 TRAINING LESSON</div>' +
    '<div style="color:#ffe9d6;font:600 13px/1.6 system-ui">' + t.lesson + '</div></div>';
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:10px;';
  var start = document.createElement('button');
  start.textContent = '⚔️ START TRIAL (' + SM.WINS_PER_TOWN + ' WINS)';
  start.style.cssText = 'background:linear-gradient(180deg,#ff7a2e,#e23c0a);color:#fff;border:none;' +
    'border-radius:14px;font:900 15px system-ui;padding:14px 24px;cursor:pointer;';
  var back = document.createElement('button');
  back.textContent = 'MAP';
  back.style.cssText = 'background:transparent;color:#ffb347;border:2px solid #ff5d2e;' +
    'border-radius:14px;font:800 15px system-ui;padding:14px 20px;cursor:pointer;';
  if(start.addEventListener) start.addEventListener('click', function(){
    ov.style.display = 'none';
    try{ if(typeof UI !== 'undefined' && UI.hint) UI.hint('🗺️ Trial started: ' + t.name + ' — win ' + SM.WINS_PER_TOWN + ' battles!'); }catch(e){}
  });
  if(back.addEventListener) back.addEventListener('click', function(){
    ov.style.display = 'none'; SM.openMap();
  });
  row.appendChild(start); row.appendChild(back);
  box.appendChild(row);
  ov.appendChild(box);
  stage.appendChild(ov);
  return true;
};

/* ---------------- 7. liberation + graduation ---------------- */
SM.liberated = function(idx){
  var t = SM.TOWNS[idx];
  var last = (idx === SM.TOWNS.length - 1);
  if(typeof document === 'undefined') return;
  var stage = document.getElementById('stage') || document.body;
  if(!stage || !stage.appendChild) return;
  var old = document.getElementById('storyDoneOv');
  if(old && old.parentNode && old.parentNode.removeChild) old.parentNode.removeChild(old);
  var ov = document.createElement('div');
  ov.id = 'storyDoneOv';
  ov.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:44;display:flex;' +
    'flex-direction:column;justify-content:center;align-items:center;' +
    'background:rgba(8,3,2,.96);padding:24px;text-align:center;';
  var box = document.createElement('div');
  box.style.cssText = 'max-width:440px;display:flex;flex-direction:column;align-items:center;';
  box.innerHTML =
    '<div style="font-size:64px;margin-bottom:8px">' + (last ? '🎓' : '🏆') + '</div>' +
    '<div style="color:#ffd76a;font:900 24px system-ui;letter-spacing:2px;margin-bottom:8px">' +
    (last ? 'GRADUATED!' : t.name.toUpperCase() + ' LIBERATED!') + '</div>' +
    '<div style="color:#ffe9d6;font:600 14px/1.7 system-ui;margin-bottom:8px">' + t.done + '</div>' +
    (last
      ? '<div style="color:#7dff9a;font:700 13px/1.7 system-ui;margin-bottom:18px">You are no longer trainees —<br>you are protectors of the land. The Elemental Armor Generator awaits.</div>'
      : '<div style="color:#ffb347;font:700 13px/system-ui;margin-bottom:18px">Next trial: ' + SM.TOWNS[idx + 1].name + '</div>');
  var go = document.createElement('button');
  go.textContent = last ? '🎓 CONTINUE' : '🗺️ VIEW MAP';
  go.style.cssText = 'background:linear-gradient(180deg,#ff7a2e,#e23c0a);color:#fff;border:none;' +
    'border-radius:14px;font:900 16px system-ui;padding:14px 34px;cursor:pointer;';
  if(go.addEventListener) go.addEventListener('click', function(){
    ov.style.display = 'none';
    if(!last) SM.openMap();
  });
  box.appendChild(go);
  ov.appendChild(box);
  stage.appendChild(ov);
  try{ if(window.AudioSys && AudioSys.place) AudioSys.place(); }catch(e){}
};

SM.ensureBtn();

if(typeof window !== 'undefined'){
  window.__STORY_DEBUG = {
    TOWNS: SM.TOWNS, load: SM.load, isUnlocked: SM.isUnlocked, isDone: SM.isDone,
    wins: SM.wins, activeTown: SM.activeTown, onWin: SM.onWin,
    buildMap: SM.buildMap, brief: SM.brief, liberated: SM.liberated
  };
}

})();
