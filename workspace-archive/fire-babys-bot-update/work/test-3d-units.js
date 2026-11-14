// Unit tests: extract the REAL bot functions from the shipped 3d.html and
// run them against fabricated state (same technique as src/verify-patches.js).
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf-8');
let failures = 0;
function assert(c, m){ if(!c){ failures++; console.log('FAIL:', m); } else console.log('ok:', m); }
function extractFn(name){
  const i = html.indexOf('function ' + name + '(');
  if(i < 0) throw new Error('fn not found: ' + name);
  let j = html.indexOf('{', i), depth = 0, k = j;
  for(; k < html.length; k++){ if(html[k] === '{') depth++; else if(html[k] === '}'){ depth--; if(!depth) break; } }
  return html.slice(i, k + 1);
}
// globals the functions expect
global.ATK_RANGE = 3.5; global.JUMP_V1 = 14; global.JUMP_GRAV = 25;
global.mpGameMode = 'versus'; global.mpMyTeam = 1; global.mpKO = false;
global.mpCatch = null;
let V3 = function(x, y, z){ this.x = x; this.y = y; this.z = z; };
V3.prototype.distanceTo = function(o){ return Math.hypot(this.x - o.x, this.z - o.z); };
// extract + eval the real functions
for(const n of ['mpBotTick', 'mpBotHits', 'mpBotTickCatch', 'nearestHero', 'foePickTarget', 'mpCatchPlayers', 'mpCatchPoolOf'])
  try { eval(extractFn(n)); } catch(e) { /* mpCatch* may not exist in scope set */ }
global.mpBotTick = mpBotTick; global.mpBotHits = mpBotHits;

// --- fabricate a bot + an enemy (the local player object) ---
let actions = [];
function mkBot(x, z){ return { id: 'bot1', team: 0, x: x, z: z, dir: 0, hp: 5, ko: false, koTimer: 0,
  atkCd: 0, atkAnimT: 0, blockUntil: 0, jumps: 0, jumpY: 0, jumpV: 0, wanderT: 0, wx: x, wz: z,
  net: { sendAction: function(a){ actions.push({ t: simT, a: a }); }, sendMove: function(){}, disconnect: function(){} } }; }
global.mpBots = [];
global.remotePlayers = {};
global.net = { isHost: true, playerId: 'me' };
global.player = { group: { position: { x: 20, z: 20 } } };
let simT = 0;

// TEST 1: bot closes distance on the enemy (chase), old speed 5.2 vs new 7.0
let bot = mkBot(0, 0); global.mpBots = [bot];
const d0 = Math.hypot(20 - bot.x, 20 - bot.z);
for(let i = 0; i < 20; i++){ mpBotTick(0.05); simT += 0.05; } // 1 second
const d1 = Math.hypot(20 - bot.x, 20 - bot.z);
const closedPerSec = d0 - d1;
assert(closedPerSec > 6.0, `bot closes >6.0 units in 1s of chase (got ${closedPerSec.toFixed(2)}) — hard speed`);
assert(closedPerSec < 7.6, `bot does not exceed player speed (got ${closedPerSec.toFixed(2)})`);

// TEST 2: attack cadence over 10 simulated seconds in range
bot = mkBot(19, 19); global.mpBots = [bot]; actions = []; simT = 0;
for(let i = 0; i < 200; i++){ mpBotTick(0.05); simT += 0.05; }
const atk = actions.filter(a => a.a.kind === 'attack').length;
assert(atk >= 9, `hard bot attacks >=9 times in 10s in range (got ${atk}; old pacing would give ~6)`);

// TEST 3: reactive block rate (200 trials)
let blocks = 0, trials = 200;
for(let i = 0; i < trials; i++){
  bot = mkBot(20, 20); bot.hp = 5; bot.blockUntil = 0; global.mpBots = [bot];
  global.remotePlayers = { enemy1: { team: 1, ko: false, group: { position: { x: 20, z: 20 } } } };
  mpBotHits({ id: 'enemy1', data: {} }, 20, 20);
  if(bot.blockUntil > 0) blocks++;
  delete global.remotePlayers.enemy1;
}
const rate = blocks / trials;
assert(rate > 0.33 && rate < 0.58, `reactive block rate ~45% (got ${(rate * 100).toFixed(0)}%)`);

// TEST 4: foePickTarget focuses weakest hero within 16, else nearest
global.units = [
  { side: 'hero', dead: false, hp: 100, maxHp: 100, group: { position: new V3(3, 0, 0) } },
  { side: 'hero', dead: false, hp: 30, maxHp: 100, group: { position: new V3(10, 0, 0) } },
  { side: 'hero', dead: false, hp: 90, maxHp: 100, group: { position: new V3(30, 0, 0) } }
];
const foe = { group: { position: new V3(0, 0, 0) } };
let pick = foePickTarget(foe);
assert(pick && pick.u === global.units[1], 'foePickTarget picks the weakest hero in reach (30% HP at d=10 over full-HP at d=3)');
global.units[1].hp = 100;
pick = foePickTarget(foe);
assert(pick && pick.u === global.units[0], 'foePickTarget falls back to nearest when nobody is weakened');

// TEST 5: constants in the shipped source (SP foe speed / rival speed / foe attack cd)
assert(/speed:4\.4\+Math\.random\(\)\*0\.5/.test(html), 'spawnFoes speed raised to 4.4–4.9');
assert(/speed:5\.0, range:2\.4/.test(html), 'tournament rival speed raised to 5.0');
assert(/:1\.05;/.test(html), 'foe attack cooldown tightened to 1.05s');
assert(/0\.55 \+ Math\.random\(\)\*0\.35/.test(html), 'MP bot attack cooldown is the hard pacing');

// TEST 6: SPLASH/catch bot hunts an enemy at hard speed
global.mpGameMode = 'catch';
global.mpCatch = { caught: {}, eliminated: {} };
global.mpMyTeam = 1;
global.remotePlayers = {};
global.player = { group: { position: { x: 20, z: 20 } } };
let cbot = mkBot(0, 0); cbot.eliminated = false;
const cd0 = Math.hypot(20 - cbot.x, 20 - cbot.z);
for(let i = 0; i < 20; i++) mpBotTickCatch(cbot, 0.05);
const cd1 = Math.hypot(20 - cbot.x, 20 - cbot.z);
assert(cd0 - cd1 > 6.0, `catch bot closes >6.0 units in 1s hunting (got ${(cd0 - cd1).toFixed(2)})`);

console.log(failures ? `\n${failures} FAILURES` : '\nALL 3D UNIT TESTS PASSED');
process.exit(failures ? 1 : 0);
