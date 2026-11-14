/* ============================================================
   Fire Babys Rebellion — Mission 1 "Operation First Ember"
   Top-down stealth-action engine. Vanilla JS, canvas 2D.
   External file only (A+ law): no inline code anywhere.
   Mounts inside #game-root on rebellion.html.
   ============================================================ */
(function () {
  'use strict';

  var root = document.getElementById('game-root');
  if (!root) return;

  /* ---------------- Hero table (internal tuning only — never displayed as stats) ---------------- */
  var HEROES = [
    { id: 'blaze',   name: 'Blaze',        element: 'fire',  role: 'Strike Leader',      look: 'Star crown',               line: 'First in, last out — Blaze opens every breach in the Caldera wall.',        cls: 'balanced', c1: '#ff7a26', c2: '#ffc23a', accent: '#ffe9a8' },
    { id: 'ruko',    name: 'Ruko',         element: 'fire',  role: 'Shadow Scout',       look: 'Black bandana',            line: 'If a patrol never saw him, Ruko already passed it an hour ago.',            cls: 'swift',    c1: '#e83a1e', c2: '#ff8a3a', accent: '#1b1b22' },
    { id: 'boulder', name: 'Boulder',      element: 'fire',  role: 'Rampart',            look: 'Rock plates',              line: 'A living wall of rock and flame standing between the team and trouble.',    cls: 'heavy',    c1: '#c8541e', c2: '#ff9a3a', accent: '#8d99ae' },
    { id: 'sizzle',  name: 'Sizzle',       element: 'fire',  role: 'Sky Marksman',       look: 'Archer of the rooftops',   line: 'Watches from above and ends every ambush before it can start.',             cls: 'archer',   c1: '#ff9a1e', c2: '#ffe23a', accent: '#7a4a12' },
    { id: 'cinder',  name: 'Cinder',       element: 'fire',  role: 'Saboteur',           look: 'Blue and purple flame tips', line: 'Creeps inside Underworld machines and melts their cores to slag.',       cls: 'ghost',    c1: '#ff5a3a', c2: '#b46ae0', accent: '#4a6ae0' },
    { id: 'inferno', name: 'Lord Inferno', element: 'fire',  role: 'Supreme Commander',  look: 'Commander of the Rebellion', line: 'Reads the whole battlefield like a map he has already won.',             cls: 'lord',     c1: '#ff4a1e', c2: '#ffb23a', accent: '#ffd23a' },
    { id: 'aqua',    name: 'Aqua',         element: 'water', role: 'Strike Leader',      look: 'Star crown',               line: 'Rides the flood channels straight into the enemy\u2019s blind side.',      cls: 'balanced', c1: '#1e9ae8', c2: '#5ae0e8', accent: '#ffe9a8' },
    { id: 'splash',  name: 'Splash',       element: 'water', role: 'Shadow Scout',       look: 'Bandana and droplet',      line: 'Quiet as rain on a roof — and gone before the drip lands.',                 cls: 'swift',    c1: '#1e7ae8', c2: '#5ac8e8', accent: '#2a5aa8' },
    { id: 'pebble',  name: 'Pebble',       element: 'water', role: 'Rampart',            look: 'Ice-rock armor',           line: 'Raises bulwarks of ice that stop a Bonehead charge cold.',                  cls: 'heavy',    c1: '#3a9ad8', c2: '#a8e8f0', accent: '#9ab8c8' },
    { id: 'drift',   name: 'Drift',        element: 'water', role: 'Mist Marksman',      look: 'Archer of the mist',       line: 'Looses arrows out of the fog that find every single mark.',                 cls: 'archer',   c1: '#2ab8d8', c2: '#a8f0e0', accent: '#3a6a5a' },
    { id: 'bubble',  name: 'Bubble',       element: 'water', role: 'Rescue Specialist',  look: 'Splash crown',             line: 'Floats captured homelanders home inside unbreakable rescue bubbles.',       cls: 'ghost',    c1: '#4ac8e8', c2: '#b8f0ff', accent: '#ff9ad5' },
    { id: 'tidal',   name: 'Lord Tidal',   element: 'water', role: 'Supreme Commander',  look: 'Commander of the deep',    line: 'Commands the tides and the rescue fleet from the deep war room.',           cls: 'lord',     c1: '#1e6ae8', c2: '#5ae0c8', accent: '#ffd23a' }
  ];

  /* Class tuning (internal numbers only) */
  var CLASS_TUNE = {
    balanced: { speed: 1.0,  crouch: 1.0,  dart: false, anySide: false, wide: false },
    swift:    { speed: 1.12, crouch: 1.0,  dart: false, anySide: false, wide: false },
    heavy:    { speed: 0.9,  crouch: 1.0,  dart: false, anySide: true,  wide: false },
    archer:   { speed: 1.0,  crouch: 1.0,  dart: true,  anySide: false, wide: false },
    ghost:    { speed: 1.0,  crouch: 1.25, dart: false, anySide: false, wide: false },
    lord:     { speed: 1.0,  crouch: 1.0,  dart: false, anySide: false, wide: true }
  };

  /* ---------------- Map ----------------
     Legend: # wall · C crate (solid, blocks sight) · L lava (solid)
             S steam/shadow (walkable, hides a still hero) · . floor   */
  var TILE = 40, COLS = 36, ROWS = 26;
  var MAP = [
    '####################################',
    '#....SS....#.....C.....#...C...LLL.#',
    '#.C.....C..#....C......#.....C..LL.#',
    '#....SS....#...C....C..#..C.....CC.#',
    '#..C.......#.....##....#....C......#',
    '#......C...#....C........C.....SS..#',
    '#..C....C.........##...#....C......#',
    '#.....SS...#..C....C...#..C........#',
    '#.C...SS.C.#.....##....#....C...C..#',
    '#..........#..C........#.C......SS.#',
    '#....C.....#......C....#..#####....#',
    '#..C.......#.C.....C...#..#.......##',
    '#..........#....C......#..#.......##',
    '#..................................#',
    '#....SS....#..C....C...#..#.......##',
    '#.C..SS..C.#......##...#..##########',
    '#..........#######.#####....C......#',
    '#....C.....#....C......#.C......C..#',
    '#..C....C..#......C....#.....SS....#',
    '#......C...#..C..........C.....C...#',
    '#....C.......C.....C...#....C......#',
    '#.C........#.....##....#..C....C...#',
    '#.....SS...#..C........#......C....#',
    '#..C..SS...#....C...C..#.C.........#',
    '#..........#......C....#....C......#',
    '####################################'
  ];
  /* Fix-ups: rows built with helpers above must be exact; validate at boot. */

  function tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
    return MAP[ty].charAt(tx);
  }
  function isSolidTile(tx, ty) {
    var t = tileAt(tx, ty);
    return t === '#' || t === 'C' || t === 'L';
  }
  function blocksSight(tx, ty) {
    var t = tileAt(tx, ty);
    return t === '#' || t === 'C';
  }

  /* Extra solid tiles: the Slime Pump body */
  var PUMP_TILES = { '30,12': true, '31,12': true };
  function solidAtPx(x, y) {
    var tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (PUMP_TILES[tx + ',' + ty]) return true;
    return isSolidTile(tx, ty);
  }
  function losBlocked(x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.max(2, Math.ceil(dist / 10));
    for (var i = 1; i < steps; i++) {
      var t = i / steps;
      var tx = Math.floor((x0 + dx * t) / TILE), ty = Math.floor((y0 + dy * t) / TILE);
      if (blocksSight(tx, ty)) return true;
    }
    return false;
  }

  /* Key points (tile coords) */
  var SPAWN = { x: 2, y: 13 };
  var GEAR_PAD = { x: 5, y: 13 };
  var EXTRACTION = { x: 34, y: 2 };
  var PUMP = { x: 30.5, y: 12.5 };
  var ZONE_DOORS = [ { x: 2, y: 13 }, { x: 13, y: 13 }, { x: 25, y: 13 } ];
  function zoneOf(x) {
    var tx = x / TILE;
    if (tx < 11.5) return 0;
    if (tx < 23.5) return 1;
    return 2;
  }

  var CAGE_DEFS = [
    { x: 3,  y: 3,  tint: '#3ec6e8' },
    { x: 15, y: 8,  tint: '#57e0c8' },
    { x: 33, y: 20, tint: '#7ab8ff' }
  ];
  var PATROL_DEFS = [
    { pts: [[4, 1], [10, 1], [10, 3], [4, 3]] },
    { pts: [[6, 17], [10, 17], [10, 21], [6, 21]] },
    { pts: [[19, 2], [22, 2], [22, 5], [19, 5]] },
    { pts: [[20, 19], [22, 19], [22, 22], [20, 22]] },
    { pts: [[30, 4], [34, 4], [34, 7], [30, 7]] },
    { pts: [[27, 17], [30, 17], [30, 21], [27, 21]] }
  ];
  var SLIMER_DEFS = [
    { x: 16, y: 13 }, { x: 21, y: 20 }, { x: 28, y: 13 }, { x: 33, y: 9 }
  ];

  /* ---------------- DOM ---------------- */
  var stage = document.getElementById('fbr-stage');
  var canvas = document.getElementById('fbr-canvas');
  var ctx = canvas.getContext('2d');
  var objEl = document.getElementById('fbr-obj');
  var statusEl = document.getElementById('fbr-status');
  var alarmFill = document.getElementById('fbr-alarm-fill');
  var rescuedEl = document.getElementById('fbr-rescued');
  var timerEl = document.getElementById('fbr-timer');
  var shieldsEl = document.getElementById('fbr-shields');
  var selectEl = document.getElementById('fbr-select');
  var heroGrid = document.getElementById('fbr-hero-grid');
  var heroNameEl = document.getElementById('fbr-hero-name');
  var codecEl = document.getElementById('fbr-codec');
  var codecOrb = document.getElementById('fbr-codec-orb');
  var codecName = document.getElementById('fbr-codec-name');
  var codecText = document.getElementById('fbr-codec-text');
  var pauseEl = document.getElementById('fbr-pause');
  var helpEl = document.getElementById('fbr-help');
  var soundBtn = document.getElementById('fbr-sound-btn');
  var completeEl = document.getElementById('fbr-complete');
  var completeStats = document.getElementById('fbr-complete-stats');
  var completeBest = document.getElementById('fbr-complete-best');

  /* ---------------- Audio (WebAudio synth, no files) ---------------- */
  var AC = null, muted = false;
  try { muted = localStorage.getItem('fbr-muted') === '1'; } catch (e) {}
  function ac() {
    if (!AC) {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) AC = new Ctor();
    }
    if (AC && AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(freq, dur, type, vol, when, slideTo) {
    if (muted) return;
    var a = ac(); if (!a) return;
    var t = a.currentTime + (when || 0);
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  var SFX = {
    ui:      function () { tone(660, 0.06, 'square', 0.05); },
    alert:   function () { tone(880, 0.12, 'sawtooth', 0.09); tone(622, 0.18, 'sawtooth', 0.09, 0.1); },
    suspect: function () { tone(520, 0.08, 'square', 0.06); },
    bonk:    function () { tone(220, 0.16, 'sine', 0.16, 0, 55); },
    chime:   function () { tone(784, 0.12, 'triangle', 0.1); tone(988, 0.12, 'triangle', 0.1, 0.09); tone(1319, 0.22, 'triangle', 0.1, 0.18); },
    gear:    function () { tone(392, 0.3, 'triangle', 0.08, 0, 784); tone(523, 0.34, 'triangle', 0.07, 0.08, 1047); },
    burst:   function () { tone(160, 0.28, 'sine', 0.15, 0, 48); tone(90, 0.3, 'triangle', 0.1, 0.02, 40); },
    beep:    function () { tone(1175, 0.07, 'square', 0.07); },
    plant:   function () { tone(587, 0.1, 'square', 0.08); tone(880, 0.16, 'square', 0.08, 0.1); },
    caught:  function () { tone(330, 0.2, 'sawtooth', 0.1, 0, 110); },
    win:     function () { tone(523, 0.14, 'triangle', 0.1); tone(659, 0.14, 'triangle', 0.1, 0.1); tone(784, 0.14, 'triangle', 0.1, 0.2); tone(1047, 0.3, 'triangle', 0.11, 0.3); }
  };
  function updateSoundBtn() { soundBtn.textContent = muted ? 'Sound: Off' : 'Sound: On'; }

  /* ---------------- Game state ---------------- */
  var G = null;
  function newGame(hero) {
    return {
      hero: hero,
      tune: CLASS_TUNE[hero.cls],
      phase: 'codec',            // codec | play | pause | complete
      stage: 0,                  // 0 gear up, 1 rescue+sabotage route, 2 escape, 3 done
      formed: false,             // transformed?
      transformT: 0,
      px: (SPAWN.x + 0.5) * TILE, py: (SPAWN.y + 0.5) * TILE,
      facing: 0, moving: false, crouch: false,
      shields: 3,
      rescued: 0,
      spotted: 0,
      alarm: 0,
      time: 0,
      escapeT: -1,
      lastBeep: -1,
      burst: 1,                  // ember-burst meter 0..1
      darts: hero.cls === 'archer' ? 3 : 0,
      bonkCd: 0,
      hold: null,                // {kind, target, t, need}
      checkpoint: 0,
      furthestZone: 0,
      codecQueue: [],
      codecCur: null,
      codecChars: 0,
      particles: [],
      floaters: [],
      dartProj: null,
      shake: 0,
      finished: false
    };
  }

  function makePatrols() {
    return PATROL_DEFS.map(function (d) {
      var pts = d.pts.map(function (p) { return { x: (p[0] + 0.5) * TILE, y: (p[1] + 0.5) * TILE }; });
      return {
        pts: pts, i: 1, x: pts[0].x, y: pts[0].y,
        angle: Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x),
        state: 'calm', suspicion: 0, loseT: 0, sleepT: 0, stunPop: 0, wob: Math.random() * 6
      };
    });
  }
  function makeSlimers() {
    return SLIMER_DEFS.map(function (d) {
      return {
        hx: (d.x + 0.5) * TILE, hy: (d.y + 0.5) * TILE,
        x: (d.x + 0.5) * TILE, y: (d.y + 0.5) * TILE,
        ang: Math.random() * Math.PI * 2, t: Math.random() * 4, dead: false, trail: []
      };
    });
  }
  function makeCages() {
    return CAGE_DEFS.map(function (d) {
      return { x: (d.x + 0.5) * TILE, y: (d.y + 0.5) * TILE, tx: d.x, ty: d.y, tint: d.tint, freed: false, anim: 0 };
    });
  }
  var patrols = [], slimers = [], cages = [];

  /* ---------------- Codec ---------------- */
  var CODEC_LINES = {
    intro: [
      { who: 'inferno', text: 'Hero, the Underworld holds our streets. Gear up on the pad beside you, free our captured Water Babys, and shut down their Slime Pump. Quiet feet, hero.' },
      { who: 'aqua', text: 'Three of my people are caged in there. Bring them home — and remember the first rule: smother the Slimers. Never spray them.' }
    ],
    rescue2: [
      { who: 'aqua', text: 'Two home safe. One more is still in there — I can feel them nearby. You\u2019ve got this.' }
    ],
    planted: [
      { who: 'inferno', text: 'Charge set! Twenty seconds — run for the extraction gate, north-east corner. GO!' }
    ]
  };
  var SPEAKERS = {
    inferno: { name: 'Lord Inferno', c1: '#ff4a1e', c2: '#ffb23a' },
    aqua: { name: 'Aqua', c1: '#1e9ae8', c2: '#5ae0e8' }
  };
  function queueCodec(lines) {
    if (!G) return;
    for (var i = 0; i < lines.length; i++) G.codecQueue.push(lines[i]);
    if (G.phase === 'play' && !G.codecCur) nextCodec();
  }
  function nextCodec() {
    if (!G || !G.codecQueue.length) {
      if (G) { G.codecCur = null; codecEl.classList.add('hidden'); if (G.phase === 'codec') G.phase = 'play'; }
      return;
    }
    G.phase = 'codec';
    G.codecCur = G.codecQueue.shift();
    G.codecChars = 0;
    var sp = SPEAKERS[G.codecCur.who];
    codecName.textContent = sp.name;
    codecText.textContent = '';
    codecOrb.textContent = sp.name.charAt(0);
    codecEl.classList.remove('hidden');
  }
  function advanceCodec() {
    if (!G || !G.codecCur) return;
    if (G.codecChars < G.codecCur.text.length) { G.codecChars = G.codecCur.text.length; codecText.textContent = G.codecCur.text; return; }
    SFX.ui();
    nextCodec();
  }

  /* ---------------- Input ---------------- */
  var keys = {};
  var joyVec = { x: 0, y: 0 };
  var touchHold = { act: false };
  window.addEventListener('keydown', function (e) {
    if (!G) return;
    var k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) >= 0) e.preventDefault();
    keys[k] = true;
    if (k === 'escape') { if (G.phase === 'play') openPause(); else if (G.phase === 'pause') closePause(); }
    if ((k === 'e' || k === ' ' || k === 'enter') && G.phase === 'codec') advanceCodec();
  });
  window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  function moveInput() {
    var x = 0, y = 0;
    if (keys['a'] || keys['arrowleft']) x -= 1;
    if (keys['d'] || keys['arrowright']) x += 1;
    if (keys['w'] || keys['arrowup']) y -= 1;
    if (keys['s'] || keys['arrowdown']) y += 1;
    if (x === 0 && y === 0 && (joyVec.x || joyVec.y)) { x = joyVec.x; y = joyVec.y; }
    var m = Math.sqrt(x * x + y * y);
    if (m > 1) { x /= m; y /= m; }
    return { x: x, y: y };
  }
  function actHeld() { return !!(keys['e'] || touchHold.act); }


  /* ---------------- Collision helpers ---------------- */
  var cageSolid = {};
  function rebuildCageSolid() {
    cageSolid = {};
    cages.forEach(function (c) { if (!c.freed) cageSolid[c.tx + ',' + c.ty] = true; });
  }
  function collide(x, y, r) {
    var x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
    var y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
      if (PUMP_TILES[tx + ',' + ty] || cageSolid[tx + ',' + ty] || isSolidTile(tx, ty)) return true;
    }
    return false;
  }
  function moveEntity(e, dx, dy, r) {
    if (!collide(e.x + dx, e.y, r)) e.x += dx; else if (dx !== 0) e.x += 0;
    if (!collide(e.x, e.y + dy, r)) e.y += dy;
  }

  /* ---------------- Particles & floaters ---------------- */
  function spawnParticles(x, y, color, n, spd) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = (0.3 + Math.random() * 0.7) * (spd || 90);
      G.particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 0, max: 0.5 + Math.random() * 0.5, color: color, size: 2 + Math.random() * 3 });
    }
  }
  function floater(x, y, text, color) {
    G.floaters.push({ x: x, y: y, text: text, color: color || '#ffe9a8', t: 0 });
  }

  /* ---------------- Detection ---------------- */
  var CONE_RANGE = 152, CONE_HALF = 0.58;
  function angDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  function heroHidden() {
    var t = tileAt(Math.floor(G.px / TILE), Math.floor(G.py / TILE));
    return t === 'S' && !G.moving;
  }
  function seeStrength(p) {
    var dx = G.px - p.x, dy = G.py - p.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > CONE_RANGE) return 0;
    if (heroHidden()) return 0;
    var ad = Math.abs(angDiff(Math.atan2(dy, dx), p.angle));
    if (ad > CONE_HALF && dist > 30) return 0;
    if (losBlocked(p.x, p.y, G.px, G.py)) return 0;
    var rate = 1.2 * (1 - (dist / CONE_RANGE) * 0.45);
    if (G.crouch) rate *= 0.55;
    if (tileAt(Math.floor(G.px / TILE), Math.floor(G.py / TILE)) === 'S') rate *= 0.4;
    if (dist <= 30) rate *= 1.5;
    return rate;
  }

  /* ---------------- Caught / checkpoints ---------------- */
  function caught() {
    G.shields--;
    SFX.caught();
    G.shake = 0.35;
    patrols.forEach(function (p) { p.state = 'calm'; p.suspicion = 0; p.loseT = 0; });
    G.alarm = Math.max(0, G.alarm - 25);
    if (G.shields <= 0) {
      var d = ZONE_DOORS[G.checkpoint];
      G.px = (d.x + 0.5) * TILE; G.py = (d.y + 0.5) * TILE;
      G.shields = 3;
      floater(G.px, G.py - 30, 'Shields restored — back in at the checkpoint', '#ff9a8a');
    } else {
      var dz = ZONE_DOORS[zoneOf(G.px)];
      G.px = (dz.x + 0.5) * TILE; G.py = (dz.y + 0.5) * TILE;
      floater(G.px, G.py - 30, 'Spotted! Ember shield down', '#ff9a8a');
    }
    G.hold = null;
  }

  /* ---------------- Actions (F / BNK) ---------------- */
  var prevF = false;
  function doAction() {
    if (!G || G.phase !== 'play') return;
    if (!G.formed) { setStatus('Gear up first — step on the glowing pad.'); return; }
    if (G.bonkCd > 0) return;
    var i, d;
    /* Smother a Slimer (ember-burst) */
    for (i = 0; i < slimers.length; i++) {
      var s = slimers[i];
      if (s.dead) continue;
      d = Math.hypot(s.x - G.px, s.y - G.py);
      if (d < 52) {
        if (G.burst >= 1) {
          s.dead = true; G.burst = 0; G.bonkCd = 0.5;
          SFX.burst();
          spawnParticles(s.x, s.y, '#9a8f7a', 16, 70);
          spawnParticles(s.x, s.y, G.hero.c1, 8, 90);
          floater(s.x, s.y - 24, 'Smothered!', '#ffe9a8');
        } else {
          setStatus('Ember burst still recharging…');
        }
        return;
      }
    }
    /* Bonk a patrol */
    for (i = 0; i < patrols.length; i++) {
      var p = patrols[i];
      if (p.sleepT > 0) continue;
      d = Math.hypot(p.x - G.px, p.y - G.py);
      if (d < 40) {
        var behind = Math.abs(angDiff(Math.atan2(G.py - p.y, G.px - p.x), p.angle)) > 1.75;
        if (behind || G.tune.anySide) {
          p.sleepT = 20; p.state = 'calm'; p.suspicion = 0; p.stunPop = 0;
          G.bonkCd = 0.6;
          SFX.bonk();
          spawnParticles(p.x, p.y - 10, '#fff6c8', 8, 60);
          floater(p.x, p.y - 30, 'Bonk! Nap time.', '#fff6c8');
        } else {
          setStatus('Too risky from the front — sneak up behind, or use a sleep-dart.');
        }
        return;
      }
    }
    /* Archer sleep-dart */
    if (G.tune.dart && G.darts > 0 && !G.dartProj) {
      G.dartProj = { x: G.px, y: G.py, ang: G.facing, life: 0 };
      G.darts--; G.bonkCd = 0.5;
      tone(980, 0.08, 'square', 0.05, 0, 1400);
    }
  }

  /* ---------------- Hold interactions ---------------- */
  function currentHoldTarget() {
    if (!G.formed) return null;
    var i, d;
    for (i = 0; i < cages.length; i++) {
      var c = cages[i];
      if (c.freed) continue;
      d = Math.hypot(c.x - G.px, c.y - G.py);
      if (d < 56) return { kind: 'cage', ref: c, need: 1.6, label: 'Picking the lock…' };
    }
    if (G.rescued >= 3 && G.stage < 2) {
      d = Math.hypot(PUMP.x * TILE - G.px, PUMP.y * TILE - G.py);
      if (d < 62) return { kind: 'pump', ref: null, need: 2.0, label: 'Planting the ember charge…' };
    }
    return null;
  }
  function completeHold(h) {
    if (h.kind === 'cage') {
      var c = h.ref;
      c.freed = true; c.anim = 0.0001;
      rebuildCageSolid();
      G.rescued++;
      SFX.chime();
      spawnParticles(c.x, c.y, '#7ae0ff', 14, 80);
      floater(c.x, c.y - 30, 'Rescued!', '#aef3ff');
      if (G.rescued === 2) queueCodec(CODEC_LINES.rescue2);
      if (G.rescued >= 3) setStatus('All three home free — now the Slime Pump, at the heart of the outpost.');
    } else if (h.kind === 'pump') {
      G.stage = 2;
      G.escapeT = 20; G.lastBeep = -1;
      SFX.plant();
      spawnParticles(PUMP.x * TILE, PUMP.y * TILE, '#ffb23a', 20, 110);
      floater(PUMP.x * TILE, PUMP.y * TILE - 40, 'Charge planted!', '#ffb23a');
      queueCodec(CODEC_LINES.planted);
    }
  }

  /* ---------------- Objectives / HUD ---------------- */
  var lastObj = '', lastStatus = '', statusTimer = 0;
  function setStatus(t) { lastStatus = t; statusTimer = 4; }
  function objectiveText() {
    if (G.stage === 0) return 'Gear Up — step on the glowing pad';
    if (G.stage === 1) {
      if (G.rescued < 3) return 'Rescue the Water Babys (' + G.rescued + '/3)';
      return 'Sabotage — plant the charge on the Pump';
    }
    if (G.stage === 2) return 'Extraction — reach the NE gate!';
    return 'Mission complete';
  }
  function refreshHUD() {
    var o = objectiveText();
    if (o !== lastObj) { objEl.textContent = o; lastObj = o; }
    rescuedEl.textContent = 'Rescued ' + G.rescued + '/3';
    alarmFill.style.width = Math.round(G.alarm) + '%';
    alarmFill.className = 'fbr-alarm-fill' + (G.alarm > 66 ? ' hot' : G.alarm > 33 ? ' warm' : '');
    var sh = '';
    for (var i = 0; i < 3; i++) sh += '<span class="fbr-shield' + (i < G.shields ? ' on' : '') + '"></span>';
    if (shieldsEl.innerHTML !== sh) shieldsEl.innerHTML = sh;
    if (G.stage === 2 && G.escapeT >= 0) {
      timerEl.classList.remove('hidden');
      timerEl.textContent = '0:' + String(Math.max(0, Math.ceil(G.escapeT))).padStart(2, '0');
    } else {
      timerEl.classList.add('hidden');
    }
    /* status line */
    var st = null;
    var anyAlert = patrols.some(function (p) { return p.state === 'alert' && p.sleepT <= 0; });
    var anySus = patrols.some(function (p) { return p.state === 'suspicious' && p.sleepT <= 0; });
    if (statusTimer > 0) st = lastStatus;
    else if (anyAlert) st = 'SPOTTED — break line of sight!';
    else if (anySus) st = 'A patrol is suspicious… freeze or slip away.';
    else if (G.hold) st = G.hold.label;
    else if (heroHidden()) st = 'Hidden in the steam.';
    else if (!G.formed) st = 'Ball form — the gear pad is just east of you.';
    else st = 'Stay unseen. Bonk from behind (F). Smother Slimers up close (F).';
    if (st !== statusEl.textContent) statusEl.textContent = st;
  }

  /* ---------------- Update: hero ---------------- */
  function updateHero(dt) {
    /* transformation */
    if (G.transformT > 0 && G.transformT < 1) {
      G.transformT = Math.min(1, G.transformT + dt / 0.9);
      if (Math.random() < 0.5) spawnParticles(G.px, G.py, Math.random() < 0.5 ? G.hero.c1 : G.hero.c2, 2, 70);
      if (G.transformT >= 1) {
        G.formed = true; G.stage = 1;
        SFX.gear();
        spawnParticles(G.px, G.py, G.hero.c2, 22, 120);
        floater(G.px, G.py - 34, G.hero.name + ' — geared up!', G.hero.c2);
        setStatus('Stealth kit online. The cages are scattered across the outpost.');
      }
      return;
    }
    var mv = moveInput();
    G.crouch = !!(keys['shift'] || touchCrouch);
    var onTrail = false;
    slimers.forEach(function (s) {
      if (s.dead) return;
      if (Math.hypot(s.x - G.px, s.y - G.py) < 22) onTrail = true;
      for (var i = 0; i < s.trail.length; i++) {
        if (Math.hypot(s.trail[i].x - G.px, s.trail[i].y - G.py) < 16) { onTrail = true; break; }
      }
    });
    var spd = 118 * G.tune.speed;
    if (G.crouch) spd = 62 * G.tune.crouch;
    if (onTrail) spd *= 0.55;
    G.moving = (mv.x !== 0 || mv.y !== 0);
    if (G.moving) {
      G.facing = Math.atan2(mv.y, mv.x);
      var ent = { x: G.px, y: G.py };
      moveEntity(ent, mv.x * spd * dt, mv.y * spd * dt, 13);
      G.px = ent.x; G.py = ent.y;
      G.walkT = (G.walkT || 0) + dt * (G.crouch ? 6 : 10);
    }
    /* gear pad */
    if (!G.formed && G.transformT === 0) {
      var gx = (GEAR_PAD.x + 0.5) * TILE, gy = (GEAR_PAD.y + 0.5) * TILE;
      if (Math.hypot(gx - G.px, gy - G.py) < 24) { G.transformT = 0.0001; SFX.gear(); }
    }
    /* zone / checkpoint */
    var z = zoneOf(G.px);
    if (z > G.furthestZone) { G.furthestZone = z; G.checkpoint = z; }
    /* meters */
    if (G.burst < 1) G.burst = Math.min(1, G.burst + dt / 6);
    if (G.bonkCd > 0) G.bonkCd -= dt;
    /* F action (edge) */
    var fNow = !!keys['f'];
    if (fNow && !prevF) doAction();
    prevF = fNow;
    /* hold interactions */
    var target = currentHoldTarget();
    if (target && actHeld()) {
      if (!G.hold || G.hold.kind !== target.kind || G.hold.ref !== target.ref) {
        G.hold = { kind: target.kind, ref: target.ref, label: target.label, need: target.need, t: 0 };
      }
      G.hold.t += dt;
      if (G.hold.t >= G.hold.need) { var h = G.hold; G.hold = null; completeHold(h); }
    } else if (G.hold) {
      G.hold.t -= dt * 2;
      if (G.hold.t <= 0) G.hold = null;
    }
    /* extraction */
    if (G.stage === 2 && G.escapeT > 0) {
      var ex = (EXTRACTION.x + 0.5) * TILE, ey = (EXTRACTION.y + 0.5) * TILE;
      if (Math.hypot(ex - G.px, ey - G.py) < 27) completeMission();
    }
  }

  /* ---------------- Update: patrols ---------------- */
  function moveToward(e, tx, ty, speed, dt, r) {
    var dx = tx - e.x, dy = ty - e.y;
    var d = Math.hypot(dx, dy);
    if (d < 3) return true;
    var vx = dx / d * speed * dt, vy = dy / d * speed * dt;
    var ox = e.x, oy = e.y;
    moveEntity(e, vx, vy, r);
    if (Math.hypot(e.x - ox, e.y - oy) < speed * dt * 0.25) {
      /* stuck on geometry — slide attempt */
      moveEntity(e, 0, vy * 1.4, r);
      if (Math.hypot(e.x - ox, e.y - oy) < speed * dt * 0.1) moveEntity(e, vx * 1.4, 0, r);
    }
    e.angle = Math.atan2(e.y - oy === 0 && dy !== 0 ? dy : e.y - oy, e.x - ox === 0 && dx !== 0 ? dx : e.x - ox);
    if (Math.abs(e.x - ox) < 0.01 && Math.abs(e.y - oy) < 0.01) e.angle = Math.atan2(dy, dx);
    return d < 8;
  }
  function updatePatrol(p, dt) {
    p.wob += dt * 7;
    if (p.stunPop > 0) p.stunPop -= dt;
    if (p.sleepT > 0) {
      p.sleepT -= dt;
      p.suspicion = 0; p.state = 'calm';
      if (Math.random() < dt * 0.7) G.floaters.push({ x: p.x + 10, y: p.y - 18, text: 'Zzz', color: '#cfe8ff', t: -Math.random() * 0.5 });
      return;
    }
    var vis = seeStrength(p);
    var wasState = p.state;
    if (vis > 0) {
      p.suspicion += vis * dt;
      p.lastSeenX = G.px; p.lastSeenY = G.py;
      p.loseT = 0;
      if (p.suspicion > 0.35 && p.suspicion < 1 && wasState === 'calm') { SFX.suspect(); p.stunPop = 0.7; p.popChar = '?'; }
    } else {
      p.suspicion = Math.max(0, p.suspicion - 0.45 * dt);
      if (p.state === 'alert') {
        p.loseT += dt;
        if (p.loseT > 3.5) { p.state = 'calm'; p.suspicion = 0; }
      }
    }
    if (p.suspicion >= 1 && p.state !== 'alert') {
      p.state = 'alert'; p.stunPop = 0.8; p.popChar = '!';
      G.spotted++;
      SFX.alert();
    } else if (p.suspicion >= 0.35 && p.state === 'calm') {
      p.state = 'suspicious';
    } else if (p.suspicion < 0.2 && p.state === 'suspicious') {
      p.state = 'calm';
    }
    if (p.state === 'alert') {
      if (vis > 0) { G.alarm = Math.min(100, G.alarm + 16 * dt); }
      var tx = (p.lastSeenX !== undefined ? p.lastSeenX : G.px);
      var ty = (p.lastSeenY !== undefined ? p.lastSeenY : G.py);
      moveToward(p, tx, ty, 106, dt, 13);
      if (Math.hypot(p.x - G.px, p.y - G.py) < 27 && G.phase === 'play') caught();
    } else if (p.state === 'suspicious') {
      var want = Math.atan2(G.py - p.y, G.px - p.x);
      p.angle += angDiff(want, p.angle) * Math.min(1, dt * 6);
    } else {
      var wp = p.pts[p.i];
      if (moveToward(p, wp.x, wp.y, 56, dt, 13)) {
        p.i = (p.i + 1) % p.pts.length;
      }
    }
  }

  /* ---------------- Update: slimers, dart, fx ---------------- */
  function updateSlimer(s, dt) {
    if (s.dead) return;
    s.t += dt;
    if (s.t > 2.2) {
      s.t = 0;
      s.ang = Math.atan2(s.hy + (Math.random() - 0.5) * 130 - s.y, s.hx + (Math.random() - 0.5) * 130 - s.x);
    }
    var nx = s.x + Math.cos(s.ang) * 16 * dt, ny = s.y + Math.sin(s.ang) * 16 * dt;
    if (!collide(nx, ny, 12)) { s.x = nx; s.y = ny; }
    else s.ang += 2.4 * dt;
    s.trailT = (s.trailT || 0) + dt;
    if (s.trailT > 0.14) {
      s.trailT = 0;
      s.trail.push({ x: s.x, y: s.y, age: 0 });
      if (s.trail.length > 240) s.trail.shift();
    }
    for (var i = s.trail.length - 1; i >= 0; i--) {
      s.trail[i].age += dt;
      if (s.trail[i].age > 11) s.trail.splice(i, 1);
    }
  }
  function updateFx(dt) {
    for (var i = G.particles.length - 1; i >= 0; i--) {
      var pt = G.particles[i];
      pt.life += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 60 * dt;
      if (pt.life >= pt.max) G.particles.splice(i, 1);
    }
    for (var j = G.floaters.length - 1; j >= 0; j--) {
      var f = G.floaters[j];
      f.t += dt; f.y -= 22 * dt;
      if (f.t > 1.6) G.floaters.splice(j, 1);
    }
    cages.forEach(function (c) {
      if (c.freed && c.anim > 0 && c.anim < 3) {
        c.anim += dt;
        if (c.anim > 0.8 && c.anim < 2.4) {
          var dx = (SPAWN.x + 0.5) * TILE - c.x, dy = (SPAWN.y + 0.5) * TILE - c.y;
          var d = Math.hypot(dx, dy) || 1;
          c['fx'] = (c['fx'] || 0) + 70 * dt * dx / d;
          c['fy'] = (c['fy'] || 0) + 70 * dt * dy / d;
        }
      }
    });
    if (G.dartProj) {
      var dp = G.dartProj;
      dp.life += dt;
      dp.x += Math.cos(dp.ang) * 380 * dt;
      dp.y += Math.sin(dp.ang) * 380 * dt;
      var hit = solidAtPx(dp.x, dp.y);
      if (!hit) {
        for (var k = 0; k < patrols.length; k++) {
          var p = patrols[k];
          if (p.sleepT <= 0 && Math.hypot(p.x - dp.x, p.y - dp.y) < 17) {
            p.sleepT = 20; p.state = 'calm'; p.suspicion = 0;
            SFX.bonk();
            floater(p.x, p.y - 30, 'Sleep-dart hit!', '#fff6c8');
            hit = true; break;
          }
        }
      }
      if (hit || dp.life > 0.6) G.dartProj = null;
    }
  }

  /* ---------------- Mission flow ---------------- */
  function completeMission() {
    if (G.finished) return;
    G.finished = true;
    G.phase = 'complete';
    G.stage = 3;
    SFX.win();
    var rank = G.spotted === 0 ? 'Silent Flame' : G.spotted <= 2 ? 'Ember Shadow' : G.spotted <= 5 ? 'Spark Runner' : 'Loud & Proud';
    var mins = Math.floor(G.time / 60), secs = Math.floor(G.time % 60);
    var timeStr = mins + ':' + String(secs).padStart(2, '0');
    var best = null;
    try {
      best = JSON.parse(localStorage.getItem('fbr-best') || 'null');
      if (!best || G.spotted < best.spotted || (G.spotted === best.spotted && G.time < best.time)) {
        best = { time: G.time, spotted: G.spotted, rank: rank, hero: G.hero.name };
        localStorage.setItem('fbr-best', JSON.stringify(best));
      }
    } catch (e) {}
    completeStats.innerHTML =
      '<p class="fbr-stat"><span>Hero</span><strong>' + G.hero.name + '</strong></p>' +
      '<p class="fbr-stat"><span>Clear time</span><strong>' + timeStr + '</strong></p>' +
      '<p class="fbr-stat"><span>Times spotted</span><strong>' + G.spotted + '</strong></p>' +
      '<p class="fbr-stat"><span>Water Babys rescued</span><strong>3/3</strong></p>' +
      '<p class="fbr-stat fbr-rank"><span>Rank</span><strong>' + rank + '</strong></p>';
    completeBest.textContent = best ? 'Best on record: ' + best.rank + ' — ' + Math.floor(best.time / 60) + ':' + String(Math.floor(best.time % 60)).padStart(2, '0') + ', spotted ' + best.spotted + '× (' + best.hero + ')' : '';
    completeEl.classList.remove('hidden');
  }

  function update(dt) {
    if (!G) return;
    if (G.phase === 'codec') {
      if (G.codecCur && G.codecChars < G.codecCur.text.length) {
        G.codecChars = Math.min(G.codecCur.text.length, G.codecChars + dt * 46);
        codecText.textContent = G.codecCur.text.slice(0, Math.floor(G.codecChars));
      }
      return;
    }
    if (G.phase !== 'play') return;
    G.time += dt;
    if (statusTimer > 0) statusTimer -= dt;
    updateHero(dt);
    patrols.forEach(function (p) { updatePatrol(p, dt); });
    slimers.forEach(function (s) { updateSlimer(s, dt); });
    updateFx(dt);
    /* alarm decay when nobody is actively watching */
    var watched = patrols.some(function (p) { return p.state === 'alert' && seeStrength(p) > 0; });
    if (!watched) G.alarm = Math.max(0, G.alarm - 3.5 * dt);
    /* escape timer */
    if (G.stage === 2 && G.escapeT > 0) {
      G.escapeT -= dt;
      var c = Math.ceil(G.escapeT);
      if (c <= 5 && c >= 1 && c !== G.lastBeep) { G.lastBeep = c; SFX.beep(); }
      if (G.escapeT <= 0) {
        G.stage = 1; G.escapeT = -1;
        G.alarm = Math.min(100, G.alarm + 20);
        floater(PUMP.x * TILE, PUMP.y * TILE - 40, 'The charge fizzled!', '#ff9a8a');
        setStatus('The charge fizzled before you got out — plant it again!');
      }
    }
    if (G.shake > 0) G.shake -= dt;
    refreshHUD();
  }

  /* ---------------- Rendering ---------------- */
  var WORLD_W = COLS * TILE, WORLD_H = ROWS * TILE;
  var cam = { x: 0, y: 0 };
  var viewW = 480, viewH = 620;
  var T = 0; // visual clock (seconds)

  var staticLayer = document.createElement('canvas');
  staticLayer.width = WORLD_W; staticLayer.height = WORLD_H;
  (function buildStatic() {
    var c = staticLayer.getContext('2d');
    var tx, ty, i;
    for (ty = 0; ty < ROWS; ty++) for (tx = 0; tx < COLS; tx++) {
      var x = tx * TILE, y = ty * TILE, t = tileAt(tx, ty);
      var v = ((tx * 73 + ty * 149) % 17) / 17; // deterministic variation
      if (t === '#') {
        c.fillStyle = '#232c4e'; c.fillRect(x, y, TILE, TILE);
        c.fillStyle = '#2e3a63'; c.fillRect(x, y, TILE, 7);
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, y + TILE - 6, TILE, 6);
        c.fillStyle = 'rgba(140,170,255,0.10)';
        c.fillRect(x + 4 + v * 20, y + 14, 9, 4);
      } else {
        c.fillStyle = v < 0.5 ? '#141b36' : '#131a33';
        c.fillRect(x, y, TILE, TILE);
        c.strokeStyle = 'rgba(90,120,200,0.055)';
        c.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        if (v > 0.86) { c.fillStyle = 'rgba(160,190,255,0.06)'; c.fillRect(x + 8, y + 22, 12, 3); }
        if (t === 'C') {
          c.fillStyle = '#54432a';
          c.fillRect(x + 3, y + 5, TILE - 6, TILE - 7);
          c.fillStyle = '#6b5636'; c.fillRect(x + 3, y + 5, TILE - 6, 8);
          c.strokeStyle = '#2e2317'; c.lineWidth = 2;
          c.strokeRect(x + 4, y + 6, TILE - 8, TILE - 9);
          c.beginPath(); c.moveTo(x + 4, y + 6); c.lineTo(x + TILE - 4, y + TILE - 3);
          c.moveTo(x + TILE - 4, y + 6); c.lineTo(x + 4, y + TILE - 3); c.stroke();
          c.lineWidth = 1;
        } else if (t === 'L') {
          var lg = c.createLinearGradient(x, y, x, y + TILE);
          lg.addColorStop(0, '#5a1408'); lg.addColorStop(0.5, '#8f2408'); lg.addColorStop(1, '#5a1408');
          c.fillStyle = lg; c.fillRect(x, y, TILE, TILE);
          c.fillStyle = 'rgba(255,120,40,0.5)';
          c.beginPath(); c.ellipse(x + 12 + v * 14, y + 14, 6, 3.4, 0, 0, 7); c.fill();
          c.beginPath(); c.ellipse(x + 26 - v * 8, y + 27, 5, 3, 0, 0, 7); c.fill();
        } else if (t === 'S') {
          c.fillStyle = '#10172c'; c.fillRect(x, y, TILE, TILE);
          c.fillStyle = '#1d2947';
          for (i = 0; i < 3; i++) c.fillRect(x + 6, y + 9 + i * 9, TILE - 12, 3);
        }
      }
    }
    /* gear pad base */
    var gx = (GEAR_PAD.x + 0.5) * TILE, gy = (GEAR_PAD.y + 0.5) * TILE;
    c.strokeStyle = '#ffa53a'; c.lineWidth = 3;
    c.beginPath(); c.arc(gx, gy, 17, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(255,165,58,0.4)'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(gx, gy, 12, 0, 7); c.stroke();
    /* extraction frame */
    var ex = EXTRACTION.x * TILE, ey = EXTRACTION.y * TILE;
    c.fillStyle = '#2a3a66'; c.fillRect(ex + 1, ey + 1, TILE - 2, 6);
    c.fillRect(ex + 1, ey + 1, 6, TILE - 2); c.fillRect(ex + TILE - 7, ey + 1, 6, TILE - 2);
    c.fillStyle = '#47e0c8'; c.fillRect(ex + 4, ey + 3, TILE - 8, 2);
    /* pump body */
    var px0 = 30 * TILE, py0 = 12 * TILE;
    c.fillStyle = '#1d2438'; c.fillRect(px0 - 4, py0 - 2, TILE * 2 + 8, TILE + 6);
    c.fillStyle = '#2c3854'; c.fillRect(px0 - 4, py0 - 2, TILE * 2 + 8, 10);
    c.fillStyle = '#31435f';
    c.beginPath(); c.arc(px0 + 26, py0 + 24, 13, 0, 7); c.fill();
    c.fillStyle = '#69d84f';
    c.beginPath(); c.arc(px0 + 26, py0 + 24, 9, 0, 7); c.fill();
    c.fillStyle = '#22304a'; c.fillRect(px0 + 48, py0 + 8, 26, 26);
    c.fillStyle = '#8fd84f';
    c.fillRect(px0 + 51, py0 + 20, 20, 11);
    c.fillStyle = '#ffb23a';
    for (i = 0; i < 4; i++) c.fillRect(px0 + 2 + i * 21, py0 + TILE - 4, 11, 4);
  })();

  var steamTiles = [];
  (function () {
    for (var ty = 0; ty < ROWS; ty++) for (var tx = 0; tx < COLS; tx++)
      if (tileAt(tx, ty) === 'S') steamTiles.push({ x: tx * TILE, y: ty * TILE, ph: (tx * 31 + ty * 57) % 10 });
  })();

  function drawOrb(c, x, y, r, h, ghost) {
    var g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r);
    g.addColorStop(0, h.c2); g.addColorStop(1, h.c1);
    c.globalAlpha = ghost ? 0.9 : 1;
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.globalAlpha = 1;
    /* face */
    c.fillStyle = 'rgba(255,255,255,0.95)';
    var fx = Math.cos(h._face || 0) * r * 0.22, fy = Math.sin(h._face || 0) * r * 0.14;
    c.beginPath(); c.arc(x - r * 0.34 + fx, y - r * 0.05 + fy, r * 0.13, 0, 7); c.fill();
    c.beginPath(); c.arc(x + r * 0.34 + fx, y - r * 0.05 + fy, r * 0.13, 0, 7); c.fill();
    c.strokeStyle = 'rgba(20,20,40,0.55)'; c.lineWidth = Math.max(1.4, r * 0.09);
    c.beginPath(); c.arc(x + fx, y + r * 0.28 + fy, r * 0.3, 0.25, Math.PI - 0.25); c.stroke();
    c.lineWidth = 1;
    drawSignature(c, x, y - r, r, h, 1);
  }
  function drawSignature(c, x, yTop, r, h, s) {
    c.save();
    c.translate(x, yTop);
    c.scale(s, s);
    if (h.id === 'blaze' || h.id === 'aqua') {           /* star crown */
      c.fillStyle = '#ffd23a';
      star(c, 0, -3, 5, 7, 3);
    } else if (h.id === 'ruko' || h.id === 'splash') {   /* bandana */
      c.fillStyle = h.accent;
      c.beginPath(); c.arc(0, 2, r * 0.98, Math.PI * 1.08, Math.PI * 1.92); c.lineTo(r * 0.9, 4); c.lineTo(-r * 0.9, 4); c.closePath(); c.fill();
      if (h.id === 'splash') { c.fillStyle = '#bfefff'; drop(c, r * 0.55, -4, 3.2); }
    } else if (h.id === 'boulder' || h.id === 'pebble') { /* rock plates */
      c.fillStyle = h.accent;
      c.beginPath(); c.arc(-r * 0.4, 0, r * 0.34, 0, 7); c.fill();
      c.beginPath(); c.arc(r * 0.15, -r * 0.25, r * 0.4, 0, 7); c.fill();
      c.beginPath(); c.arc(r * 0.55, r * 0.1, r * 0.26, 0, 7); c.fill();
    } else if (h.id === 'sizzle' || h.id === 'drift') {  /* archer bow */
      c.strokeStyle = h.accent; c.lineWidth = 2.4;
      c.beginPath(); c.arc(r * 0.95, r * 0.6, r * 0.55, -1.1, 1.1); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(r * 0.95 + Math.cos(-1.1) * r * 0.55, r * 0.6 + Math.sin(-1.1) * r * 0.55);
      c.lineTo(r * 0.95 + Math.cos(1.1) * r * 0.55, r * 0.6 + Math.sin(1.1) * r * 0.55); c.stroke();
    } else if (h.id === 'cinder') {                      /* flame tips */
      c.fillStyle = h.accent;
      for (var i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(i * r * 0.4 - 3, 2); c.lineTo(i * r * 0.4, -r * 0.55); c.lineTo(i * r * 0.4 + 3, 2);
        c.closePath(); c.fill();
      }
    } else if (h.id === 'bubble') {                      /* splash crown */
      c.fillStyle = '#bfefff';
      drop(c, -r * 0.4, -r * 0.3, 3); drop(c, 0, -r * 0.55, 3.8); drop(c, r * 0.4, -r * 0.3, 3);
    } else if (h.id === 'inferno' || h.id === 'tidal') { /* commander crown */
      c.fillStyle = '#ffd23a';
      c.beginPath();
      c.moveTo(-8, 2); c.lineTo(-8, -6); c.lineTo(-3.5, -1); c.lineTo(0, -8); c.lineTo(3.5, -1); c.lineTo(8, -6); c.lineTo(8, 2);
      c.closePath(); c.fill();
    }
    c.restore();
  }
  function star(c, x, y, spikes, outer, inner) {
    c.beginPath();
    for (var i = 0; i < spikes * 2; i++) {
      var r = i % 2 === 0 ? outer : inner;
      var a = (Math.PI / spikes) * i - Math.PI / 2;
      var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath(); c.fill();
  }
  function drop(c, x, y, r) {
    c.beginPath();
    c.moveTo(x, y - r * 1.5);
    c.quadraticCurveTo(x + r, y + r * 0.4, x, y + r);
    c.quadraticCurveTo(x - r, y + r * 0.4, x, y - r * 1.5);
    c.fill();
  }

  function drawHumanoid(c, x, y, h, facing, walkT, crouch, transformP) {
    var bob = Math.sin(walkT) * 2.2;
    var squash = crouch ? 0.78 : 1;
    var stretch = transformP < 1 ? (0.6 + 0.4 * transformP) : 1;
    c.save();
    c.translate(x, y + bob * 0.3);
    c.scale(1, squash * stretch);
    /* shadow */
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); c.ellipse(0, 16, 13, 4.5, 0, 0, 7); c.fill();
    var fx = Math.cos(facing), fy = Math.sin(facing);
    /* legs */
    c.strokeStyle = h.c1; c.lineWidth = 5; c.lineCap = 'round';
    var lp = Math.sin(walkT) * 6;
    c.beginPath(); c.moveTo(-3, 6); c.lineTo(-3 + fx * 2 + lp * 0.4, 15); c.stroke();
    c.beginPath(); c.moveTo(3, 6); c.lineTo(3 + fx * 2 - lp * 0.4, 15); c.stroke();
    /* torso — sleek capsule of living element */
    var tg = c.createLinearGradient(0, -14, 0, 8);
    tg.addColorStop(0, h.c2); tg.addColorStop(1, h.c1);
    c.fillStyle = tg;
    c.beginPath();
    c.moveTo(-7, 6);
    c.quadraticCurveTo(-9, -10, 0, -13);
    c.quadraticCurveTo(9, -10, 7, 6);
    c.quadraticCurveTo(0, 10, -7, 6);
    c.fill();
    /* belt / stealth-kit sash */
    c.strokeStyle = 'rgba(10,14,28,0.85)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-6, 2); c.lineTo(6, 4); c.stroke();
    c.fillStyle = h.accent;
    c.fillRect(-2, 1, 4, 4);
    /* arms */
    c.strokeStyle = h.c1; c.lineWidth = 4.4;
    var ap = Math.sin(walkT + Math.PI) * 4;
    c.beginPath(); c.moveTo(-7, -6); c.lineTo(-10 + fx * 2, 2 + ap * 0.4); c.stroke();
    c.beginPath(); c.moveTo(7, -6); c.lineTo(10 + fx * 2, 2 - ap * 0.4); c.stroke();
    /* head */
    var hg = c.createRadialGradient(-2, -22, 2, 0, -18, 11);
    hg.addColorStop(0, h.c2); hg.addColorStop(1, h.c1);
    c.fillStyle = hg;
    c.beginPath(); c.arc(fx * 1.6, -18 + fy * 1.2, 9.5, 0, 7); c.fill();
    /* elemental hair */
    c.fillStyle = h.c2;
    if (h.element === 'fire') {
      for (var i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(fx * 1.6 + i * 5 - 2.6, -24);
        c.lineTo(fx * 1.6 + i * 5.6, -33 - (i === 0 ? 3 : 0));
        c.lineTo(fx * 1.6 + i * 5 + 2.6, -24);
        c.closePath(); c.fill();
      }
    } else {
      c.beginPath();
      c.arc(fx * 1.6 - 4, -25, 4.4, 0, 7); c.arc(fx * 1.6 + 1, -27, 5.2, 0, 7); c.arc(fx * 1.6 + 6, -25, 4, 0, 7);
      c.fill();
    }
    /* glowing eyes toward facing */
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(fx * 1.6 - 3.4 + fx * 2, -18 + fy * 1.6, 1.7, 0, 7); c.fill();
    c.beginPath(); c.arc(fx * 1.6 + 3.4 + fx * 2, -18 + fy * 1.6, 1.7, 0, 7); c.fill();
    drawSignature(c, fx * 1.6, -27.5, 9.5, h, 0.85);
    c.restore();
    c.lineCap = 'butt';
  }

  function drawBonehead(c, p) {
    var sleeping = p.sleepT > 0;
    c.save();
    c.translate(p.x, p.y);
    c.fillStyle = 'rgba(0,0,0,0.32)';
    c.beginPath(); c.ellipse(0, 13, 12, 4, 0, 0, 7); c.fill();
    if (sleeping) c.rotate(1.35);
    else c.rotate(Math.sin(p.wob) * 0.055);
    /* ribcage body */
    c.strokeStyle = '#e8ecf4'; c.lineWidth = 2.4;
    for (var i = 0; i < 3; i++) {
      c.beginPath(); c.arc(0, 2 + i * 3.6, 6.5 - i * 0.8, 0.15, Math.PI - 0.15); c.stroke();
    }
    c.beginPath(); c.moveTo(0, -2); c.lineTo(0, 12); c.stroke();
    /* arms */
    c.lineWidth = 2;
    var sw = Math.sin(p.wob) * 3;
    c.beginPath(); c.moveTo(-4, 2); c.lineTo(-10, 8 + sw * 0.4); c.stroke();
    c.beginPath(); c.moveTo(4, 2); c.lineTo(10, 8 - sw * 0.4); c.stroke();
    /* skull, offset toward facing */
    var fx = Math.cos(p.angle), fy = Math.sin(p.angle);
    c.fillStyle = '#f4f6fb';
    c.beginPath(); c.arc(fx * 2.4, -9 + fy * 1.4, 8.6, 0, 7); c.fill();
    c.fillRect(fx * 2.4 - 4.4, -3.4 + fy * 1.4, 8.8, 4.6);
    c.fillStyle = '#131722';
    c.beginPath(); c.arc(fx * 2.4 - 3.2 + fx * 1.6, -10 + fy * 1.8, 2.3, 0, 7); c.fill();
    c.beginPath(); c.arc(fx * 2.4 + 3.2 + fx * 1.6, -10 + fy * 1.8, 2.3, 0, 7); c.fill();
    c.fillRect(fx * 2.4 - 0.7 + fx * 1.6, -6.4 + fy * 1.8, 1.4, 2.2);
    c.restore();
    /* alert pops */
    if (p.stunPop > 0 && p.popChar) {
      var s = 1 + Math.sin(Math.min(1, p.stunPop / 0.8) * Math.PI) * 0.35;
      c.save();
      c.translate(p.x, p.y - 34);
      c.scale(s, s);
      c.font = '900 21px system-ui, sans-serif';
      c.textAlign = 'center';
      c.lineWidth = 4; c.strokeStyle = 'rgba(8,10,20,0.8)';
      var col = p.popChar === '!' ? '#ff5340' : '#ffd23a';
      c.strokeText(p.popChar, 0, 0);
      c.fillStyle = col; c.fillText(p.popChar, 0, 0);
      c.restore();
    }
    if (sleeping) {
      c.font = '700 11px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = 'rgba(207,232,255,0.85)';
      c.fillText('sleeping', p.x, p.y + 26);
    }
  }

  function drawCone(c, p, wide) {
    if (p.sleepT > 0) return;
    var col = p.state === 'alert' ? 'rgba(255,64,44,0.24)' : p.state === 'suspicious' ? 'rgba(255,166,48,0.20)' : 'rgba(255,216,90,0.12)';
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(p.x, p.y);
    var steps = 16;
    for (var i = 0; i <= steps; i++) {
      var a = p.angle - CONE_HALF + (CONE_HALF * 2 * i) / steps;
      var d = 0, max = CONE_RANGE;
      while (d < max) {
        d += 9;
        var sx = p.x + Math.cos(a) * d, sy = p.y + Math.sin(a) * d;
        var tx = Math.floor(sx / TILE), ty = Math.floor(sy / TILE);
        if (blocksSight(tx, ty)) { d -= 5; break; }
      }
      c.lineTo(p.x + Math.cos(a) * Math.min(d, max), p.y + Math.sin(a) * Math.min(d, max));
    }
    c.closePath(); c.fill();
    if (wide) {
      c.strokeStyle = 'rgba(255,255,255,0.22)';
      c.lineWidth = 1.2;
      c.stroke();
      c.lineWidth = 1;
    }
  }

  function render() {
    var cw = canvas.width, ch = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#060b1d';
    ctx.fillRect(0, 0, cw, ch);
    var heroX = G ? G.px : (SPAWN.x + 0.5) * TILE;
    var heroY = G ? G.py : (SPAWN.y + 0.5) * TILE;
    var scale = cw / viewW;
    var tx = heroX - viewW / 2, ty = heroY - viewH / 2;
    tx = Math.max(0, Math.min(WORLD_W - viewW, tx));
    ty = Math.max(0, Math.min(WORLD_H - viewH, ty));
    cam.x += (tx - cam.x) * 0.12; cam.y += (ty - cam.y) * 0.12;
    if (Math.abs(tx - cam.x) > 200) cam.x = tx;
    if (Math.abs(ty - cam.y) > 200) cam.y = ty;
    var shx = 0, shy = 0;
    if (G && G.shake > 0) { shx = (Math.random() - 0.5) * 7 * G.shake; shy = (Math.random() - 0.5) * 7 * G.shake; }
    ctx.setTransform(scale, 0, 0, scale, -cam.x * scale + shx * scale, -cam.y * scale + shy * scale);

    ctx.drawImage(staticLayer, 0, 0);

    /* lava glow */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var pulse = 0.16 + Math.sin(T * 2.2) * 0.05;
    ctx.fillStyle = 'rgba(255,92,26,' + pulse + ')';
    for (var ly = 0; ly < ROWS; ly++) for (var lx = 0; lx < COLS; lx++) {
      if (tileAt(lx, ly) === 'L') ctx.fillRect(lx * TILE, ly * TILE, TILE, TILE);
    }
    ctx.restore();

    /* gear pad pulse */
    if (!G || !G.formed) {
      var gp = 0.5 + Math.sin(T * 3) * 0.25;
      ctx.strokeStyle = 'rgba(255,190,80,' + gp + ')';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc((GEAR_PAD.x + 0.5) * TILE, (GEAR_PAD.y + 0.5) * TILE, 17 + Math.sin(T * 3) * 2.4, 0, 7); ctx.stroke();
      ctx.lineWidth = 1;
    }

    /* steam mist */
    ctx.fillStyle = 'rgba(190,215,255,0.07)';
    steamTiles.forEach(function (s) {
      for (var i = 0; i < 2; i++) {
        var ph = T * 0.6 + s.ph + i * 2.2;
        ctx.beginPath();
        ctx.arc(s.x + 20 + Math.sin(ph) * 9, s.y + 20 + Math.cos(ph * 0.8) * 7, 13 + Math.sin(ph * 1.3) * 3.5, 0, 7);
        ctx.fill();
      }
    });

    /* slime trails */
    slimers.forEach(function (s) {
      s.trail.forEach(function (tp) {
        var a = 0.34 * (1 - tp.age / 11);
        ctx.fillStyle = 'rgba(16,22,14,' + a + ')';
        ctx.beginPath(); ctx.ellipse(tp.x, tp.y, 14, 10, 0, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(120,220,90,' + a * 0.35 + ')';
        ctx.beginPath(); ctx.ellipse(tp.x - 3, tp.y - 3, 5, 3, 0, 0, 7); ctx.fill();
      });
    });

    /* extraction glow when escape is live */
    if (G && G.stage === 2) {
      var ex = (EXTRACTION.x + 0.5) * TILE, ey = (EXTRACTION.y + 0.5) * TILE;
      var eg = ctx.createRadialGradient(ex, ey, 4, ex, ey, 44);
      eg.addColorStop(0, 'rgba(71,224,200,' + (0.5 + Math.sin(T * 6) * 0.2) + ')');
      eg.addColorStop(1, 'rgba(71,224,200,0)');
      ctx.fillStyle = eg;
      ctx.fillRect(ex - 44, ey - 44, 88, 88);
    }

    /* pump charge blink */
    if (G && G.stage === 2) {
      ctx.fillStyle = Math.sin(T * 10) > 0 ? '#ff4030' : '#7a1408';
      ctx.beginPath(); ctx.arc(PUMP.x * TILE, PUMP.y * TILE - 16, 4.4, 0, 7); ctx.fill();
    }

    /* vision cones */
    var wide = !!(G && G.tune.wide);
    patrols.forEach(function (p) { drawCone(ctx, p, wide); });

    /* cages + captives */
    cages.forEach(function (cg) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(cg.x, cg.y + 13, 15, 4.4, 0, 0, 7); ctx.fill();
      if (!cg.freed) {
        var fakeHero = { c1: '#1e7ae8', c2: cg.tint, _face: 0, id: 'captive' };
        var bobY = Math.sin(T * 2 + cg.x) * 1.6;
        drawOrb(ctx, cg.x, cg.y + bobY, 10.5, fakeHero, true);
        ctx.strokeStyle = '#aebbd4'; ctx.lineWidth = 2.4;
        ctx.strokeRect(cg.x - 15, cg.y - 16, 30, 32);
        ctx.beginPath();
        for (var b = -1; b <= 1; b++) { ctx.moveTo(cg.x + b * 8, cg.y - 16); ctx.lineTo(cg.x + b * 8, cg.y + 16); }
        ctx.stroke();
        ctx.fillStyle = '#ffd23a';
        ctx.beginPath(); ctx.arc(cg.x + 11, cg.y + 10, 3.2, 0, 7); ctx.fill();
        ctx.lineWidth = 1;
      } else if (cg.anim > 0 && cg.anim < 2.4) {
        var fh = { c1: '#1e7ae8', c2: cg.tint, _face: 0, id: 'captive' };
        var hop = cg.anim < 0.8 ? -Math.abs(Math.sin(cg.anim * 11)) * 7 : 0;
        var fade = cg.anim > 1.6 ? 1 - (cg.anim - 1.6) / 0.8 : 1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade);
        drawOrb(ctx, cg.x + (cg.fx || 0), cg.y + (cg.fy || 0) + hop, 10.5, fh, true);
        ctx.restore();
        if (cg.anim < 0.8) {
          ctx.font = '900 13px system-ui, sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = '#aef3ff';
          ctx.fillText('!', cg.x, cg.y - 24 + hop);
        }
      }
    });

    /* slimers */
    slimers.forEach(function (s) {
      if (s.dead) {
        ctx.fillStyle = '#6a6258';
        ctx.beginPath(); ctx.ellipse(s.x, s.y + 6, 15, 6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#877d6e';
        ctx.beginPath(); ctx.ellipse(s.x - 4, s.y + 4, 6, 3, 0, 0, 7); ctx.fill();
        return;
      }
      var w = Math.sin(T * 3.1 + s.hx) * 2.4;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 10, 15, 4.4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#171b12';
      ctx.beginPath(); ctx.ellipse(s.x, s.y, 15 + w, 12.6 - w * 0.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(140,230,100,0.5)';
      ctx.beginPath(); ctx.ellipse(s.x - 5, s.y - 5, 5.6, 3.2, -0.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#c8f09a';
      ctx.beginPath(); ctx.arc(s.x - 4.4, s.y - 1, 1.7, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(s.x + 4.4, s.y - 1, 1.7, 0, 7); ctx.fill();
    });

    /* patrols */
    patrols.forEach(function (p) { drawBonehead(ctx, p); });

    /* hero */
    var hero = G ? G.hero : selectedHero;
    if (G && G.formed || G && G.transformT > 0) {
      drawHumanoid(ctx, heroX, heroY, hero, G.facing, G.walkT || 0, G.crouch, G.transformT);
    } else {
      var previewHero = { c1: hero.c1, c2: hero.c2, accent: hero.accent, id: hero.id, _face: 0 };
      var bounce = Math.abs(Math.sin(T * 2.4)) * 2.4;
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath(); ctx.ellipse(heroX, heroY + 14, 12, 4, 0, 0, 7); ctx.fill();
      if (G && G.crouch) { ctx.save(); ctx.translate(heroX, heroY); ctx.scale(1.08, 0.82); drawOrb(ctx, 0, 0, 14.5, previewHero, false); ctx.restore(); }
      else drawOrb(ctx, heroX, heroY - bounce, 14.5, previewHero, false);
    }

    /* dart */
    if (G && G.dartProj) {
      ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2.4;
      var dp = G.dartProj;
      ctx.beginPath();
      ctx.moveTo(dp.x - Math.cos(dp.ang) * 8, dp.y - Math.sin(dp.ang) * 8);
      ctx.lineTo(dp.x, dp.y);
      ctx.stroke(); ctx.lineWidth = 1;
    }

    /* hold progress ring */
    if (G && G.hold) {
      var ht = G.hold.kind === 'cage' ? G.hold.ref : { x: PUMP.x * TILE, y: PUMP.y * TILE };
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.arc(ht.x, ht.y, 25, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#2fd8e0';
      ctx.beginPath(); ctx.arc(ht.x, ht.y, 25, -Math.PI / 2, -Math.PI / 2 + (G.hold.t / G.hold.need) * Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
    }

    /* burst meter pip near hero */
    if (G && G.formed) {
      ctx.fillStyle = 'rgba(10,14,28,0.65)';
      ctx.fillRect(heroX - 15, heroY + 22, 30, 4.4);
      ctx.fillStyle = G.burst >= 1 ? '#ffb23a' : '#7a5a28';
      ctx.fillRect(heroX - 15, heroY + 22, 30 * G.burst, 4.4);
      if (G.tune.dart) {
        ctx.font = '700 9px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = '#ffe9a8';
        ctx.fillText('darts ' + G.darts, heroX, heroY + 35);
      }
    }

    /* particles + floaters */
    if (G) {
      G.particles.forEach(function (pt) {
        ctx.globalAlpha = Math.max(0, 1 - pt.life / pt.max);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      });
      ctx.globalAlpha = 1;
      ctx.font = '800 12.5px system-ui, sans-serif'; ctx.textAlign = 'center';
      G.floaters.forEach(function (f) {
        if (f.t < 0) return;
        ctx.globalAlpha = Math.max(0, 1 - f.t / 1.6);
        ctx.lineWidth = 3.4; ctx.strokeStyle = 'rgba(8,10,20,0.75)';
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      });
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }

    /* vignette + hero light */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.42, cw / 2, ch / 2, Math.max(cw, ch) * 0.78);
    vg.addColorStop(0, 'rgba(2,4,12,0)');
    vg.addColorStop(1, 'rgba(2,4,12,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, cw, ch);
  }

  /* ---------------- Main loop ---------------- */
  var lastTs = 0;
  function frame(ts) {
    var dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    T = ts / 1000;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  /* ---------------- UI wiring ---------------- */
  var selectedHero = HEROES[0];
  var touchCrouch = false;

  HEROES.forEach(function (h) {
    h._face = 0;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'fbr-hero-card' + (h === selectedHero ? ' sel' : '');
    b.setAttribute('data-hero', h.id);
    var cv = document.createElement('canvas');
    cv.width = 72; cv.height = 72;
    cv.className = 'fbr-hero-art';
    b.appendChild(cv);
    var nm = document.createElement('span');
    nm.className = 'fbr-hero-cardname';
    nm.textContent = h.name;
    b.appendChild(nm);
    var rl = document.createElement('span');
    rl.className = 'fbr-hero-role';
    rl.textContent = (h.element === 'fire' ? 'Fire' : 'Water') + ' · ' + h.role;
    b.appendChild(rl);
    b.addEventListener('click', function () {
      selectedHero = h;
      ac();
      SFX.ui();
      var cards = heroGrid.querySelectorAll('.fbr-hero-card');
      cards.forEach(function (cd) { cd.classList.toggle('sel', cd.getAttribute('data-hero') === h.id); });
      heroNameEl.textContent = h.name + ' — ' + h.role;
    });
    heroGrid.appendChild(b);
    var c2 = cv.getContext('2d');
    drawOrb(c2, 36, 40, 19, h, false);
  });
  heroNameEl.textContent = selectedHero.name + ' — ' + selectedHero.role;

  function startMission() {
    ac();
    patrols = makePatrols();
    slimers = makeSlimers();
    cages = makeCages();
    rebuildCageSolid();
    G = newGame(selectedHero);
    selectEl.classList.add('hidden');
    completeEl.classList.add('hidden');
    pauseEl.classList.add('hidden');
    touchEl.classList.remove('hidden');
    cam.x = Math.max(0, Math.min(WORLD_W - viewW, G.px - viewW / 2));
    cam.y = Math.max(0, Math.min(WORLD_H - viewH, G.py - viewH / 2));
    G.codecQueue = CODEC_LINES.intro.slice();
    nextCodec();
    refreshHUD();
  }
  function quitToSelect() {
    G = null;
    patrols = makePatrols();
    slimers = makeSlimers();
    cages = makeCages();
    rebuildCageSolid();
    pauseEl.classList.add('hidden');
    completeEl.classList.add('hidden');
    touchEl.classList.add('hidden');
    selectEl.classList.remove('hidden');
  }
  function openPause() {
    if (!G || G.phase !== 'play') return;
    G.phase = 'pause';
    updateSoundBtn();
    pauseEl.classList.remove('hidden');
  }
  function closePause() {
    if (!G) return;
    G.phase = 'play';
    pauseEl.classList.add('hidden');
  }

  document.getElementById('fbr-deploy').addEventListener('click', startMission);
  document.getElementById('fbr-pause-btn').addEventListener('click', function () {
    if (!G) return;
    if (G.phase === 'play') openPause();
    else if (G.phase === 'pause') closePause();
  });
  document.getElementById('fbr-resume').addEventListener('click', closePause);
  document.getElementById('fbr-restart').addEventListener('click', function () { startMission(); });
  soundBtn.addEventListener('click', function () {
    muted = !muted;
    try { localStorage.setItem('fbr-muted', muted ? '1' : '0'); } catch (e) {}
    updateSoundBtn();
    if (!muted) SFX.ui();
  });
  document.getElementById('fbr-help-btn').addEventListener('click', function () { helpEl.classList.toggle('hidden'); });
  document.getElementById('fbr-quit').addEventListener('click', quitToSelect);
  document.getElementById('fbr-again').addEventListener('click', function () { startMission(); });
  document.getElementById('fbr-change').addEventListener('click', quitToSelect);
  codecEl.addEventListener('click', function () { if (G && G.phase === 'codec') advanceCodec(); });

  /* ---------------- Touch controls ---------------- */
  var touchEl = document.getElementById('fbr-touch');
  var stickEl = document.getElementById('fbr-stick');
  var nubEl = document.getElementById('fbr-nub');
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (!isTouch) touchEl.classList.add('hidden');
  touchEl.classList.add('hidden'); // revealed during a mission

  var stickId = null;
  function stickMove(e) {
    var r = stickEl.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var dx = e.clientX - cx, dy = e.clientY - cy;
    var d = Math.hypot(dx, dy), max = r.width / 2;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    nubEl.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    if (d < 7) { joyVec.x = 0; joyVec.y = 0; }
    else { joyVec.x = dx / max; joyVec.y = dy / max; }
  }
  stickEl.addEventListener('pointerdown', function (e) { e.preventDefault(); stickId = e.pointerId; stickEl.setPointerCapture(stickId); stickMove(e); });
  stickEl.addEventListener('pointermove', function (e) { if (e.pointerId === stickId) stickMove(e); });
  function stickEnd(e) {
    if (e.pointerId !== stickId) return;
    stickId = null; joyVec.x = 0; joyVec.y = 0;
    nubEl.style.transform = 'translate(0px,0px)';
  }
  stickEl.addEventListener('pointerup', stickEnd);
  stickEl.addEventListener('pointercancel', stickEnd);

  var actBtn = document.getElementById('fbr-btn-act');
  actBtn.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (G && G.phase === 'codec') { advanceCodec(); return; }
    touchHold.act = true;
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
    actBtn.addEventListener(ev, function () { touchHold.act = false; });
  });
  document.getElementById('fbr-btn-bonk').addEventListener('pointerdown', function (e) { e.preventDefault(); doAction(); });
  var crchBtn = document.getElementById('fbr-btn-crch');
  crchBtn.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    touchCrouch = !touchCrouch;
    crchBtn.classList.toggle('on', touchCrouch);
  });

  /* ---------------- Resize & boot ---------------- */
  function resize() {
    var w = stage.clientWidth || 360, h = stage.clientHeight || 520;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    viewH = 620;
    viewW = viewH * (w / h);
    if (viewW > WORLD_W) { viewW = WORLD_W; viewH = Math.min(WORLD_H, viewW * (h / w)); }
    if (viewH > WORLD_H) viewH = WORLD_H;
  }
  window.addEventListener('resize', resize);

  patrols = makePatrols();
  slimers = makeSlimers();
  cages = makeCages();
  rebuildCageSolid();
  root.classList.add('fbr-live');
  resize();
  cam.x = 0;
  cam.y = Math.max(0, Math.min(WORLD_H - viewH, (SPAWN.y + 0.5) * TILE - viewH / 2));
  requestAnimationFrame(frame);

  /* ---------------- Test/debug handle ---------------- */
  window.__FBR = {
    state: function () {
      if (!G) return { phase: 'select' };
      return {
        phase: G.phase, stage: G.stage, formed: G.formed, rescued: G.rescued,
        spotted: G.spotted, shields: G.shields, alarm: Math.round(G.alarm),
        px: Math.round(G.px), py: Math.round(G.py), escapeT: G.escapeT,
        burst: +G.burst.toFixed(2), darts: G.darts,
        patrols: patrols.map(function (p) {
          return { state: p.state, suspicion: +p.suspicion.toFixed(2), sleepT: Math.round(p.sleepT), x: Math.round(p.x), y: Math.round(p.y) };
        })
      };
    },
    start: function (id) {
      var h = HEROES.filter(function (x) { return x.id === id; })[0] || HEROES[0];
      selectedHero = h;
      startMission();
    },
    dismissCodec: function () {
      var guard = 0;
      while (G && G.codecCur && guard++ < 40) { G.codecChars = 1e9; advanceCodec(); }
    },
    teleport: function (x, y) { if (G) { G.px = x; G.py = y; } },
    debugInput: function () { return { keys: Object.keys(keys).filter(function (k) { return keys[k]; }), mv: moveInput(), phase: G ? G.phase : 'none' }; },
    pos: function () { return G ? { x: Math.round(G.px), y: Math.round(G.py) } : null; },
    heroIds: HEROES.map(function (h) { return h.id; })
  };
})();
