/* ============ Fire Babys 3D: 250 World Tasks + Silver Armor ============
   Complete all 250 tasks -> full Silver Armor set (+20% over everything).
   Silver overrides Bronze (+10%). */

var FB_TASK_STORE_KEY = 'fb_silver_tasks_v1';
var FB_SILVER_KEY = 'fb_silver_armor_v1';

/* ----- task progress store ----- */
var __fbTaskProgress = {};   // taskId -> current count
var __fbTasksDone = {};      // taskId -> true when complete
var __fbTaskInitDone = false;

function __fbLoadTasks() {
  if (__fbTaskInitDone) return;
  __fbTaskInitDone = true;
  try {
    var raw = localStorage.getItem(FB_TASK_STORE_KEY);
    if (raw) {
      var d = JSON.parse(raw);
      __fbTaskProgress = d.progress || {};
      __fbTasksDone = d.done || {};
    }
  } catch (e) {}
  // check silver armor
  try {
    var sraw = localStorage.getItem(FB_SILVER_KEY);
    if (sraw) {
      var s = JSON.parse(sraw);
      if (s && s.unlocked) __FB_SILVER_UNLOCKED = true;
    }
  } catch (e) {}
}

function __fbSaveTasks() {
  try {
    localStorage.setItem(FB_TASK_STORE_KEY, JSON.stringify({
      progress: __fbTaskProgress,
      done: __fbTasksDone,
    }));
  } catch (e) {}
}

/* ----- record a task event ----- */
function fbTaskEvent(event, value) {
  try {
    __fbLoadTasks();
    value = value || 1;
    if (typeof FB_TASKS_250 === 'undefined') return;
    var changed = false;
    for (var i = 0; i < FB_TASKS_250.length; i++) {
      var t = FB_TASKS_250[i];
      if (t.event !== event) continue;
      if (__fbTasksDone[t.id]) continue;
      var cur = (__fbTaskProgress[t.id] || 0) + value;
      __fbTaskProgress[t.id] = cur;
      changed = true;
      if (cur >= t.target) {
        __fbTasksDone[t.id] = true;
        __fbOnTaskComplete(t);
      }
    }
    if (changed) __fbSaveTasks();
    __fbCheckSilver();
  } catch (e) {}
}

function __fbOnTaskComplete(t) {
  try {
    if (typeof toast === 'function') toast('✅ TASK DONE: ' + t.name);
    if (typeof beep === 'function') beep(660, 0.12, 'sine', 0.06);
  } catch (e) {}
  // update UI if open
  try { __fbRefreshTaskUI(); } catch (e) {}
}

function __fbTasksCompletedCount() {
  var n = 0;
  for (var k in __fbTasksDone) if (__fbTasksDone[k]) n++;
  return n;
}

/* ----- silver armor ----- */
var __FB_SILVER_UNLOCKED = false;
var __FB_SILVER_BOOST = 0.20;

function __fbCheckSilver() {
  if (__FB_SILVER_UNLOCKED) return;
  var done = __fbTasksCompletedCount();
  if (done >= 250) {
    __FB_SILVER_UNLOCKED = true;
    try {
      localStorage.setItem(FB_SILVER_KEY, JSON.stringify({ unlocked: true, at: Date.now() }));
    } catch (e) {}
    // apply silver visuals
    try {
      if (player && player.group) addSilverArmor(player.group, 1);
    } catch (e) {}
    // celebrate
    try {
      if (typeof toast === 'function') toast('🥈 SILVER ARMOR UNLOCKED! +20% OVER EVERYTHING!');
      if (typeof beep === 'function') { beep(523, 0.15, 'sine', 0.08); setTimeout(function(){ beep(659, 0.15, 'sine', 0.08); }, 150); setTimeout(function(){ beep(784, 0.3, 'sine', 0.08); }, 300); }
    } catch (e) {}
    // broadcast to opponents
    try {
      if (typeof net !== 'undefined' && net && net.connected && typeof mpInGame !== 'undefined' && mpInGame) {
        net.sendAction({ kind: 'silver_armor', data: { on: 1 } });
      }
    } catch (e) {}
    // sync to server
    try { __fbSyncSilver(); } catch (e) {}
  }
}

/* ----- silver armor meshes: bright metallic silver ----- */
function addSilverArmor(g, R) {
  if (!g || typeof THREE === 'undefined') return;
  try {
    // remove bronze first (silver overrides)
    if (g.userData.bronzeArmor) {
      g.userData.bronzeArmor.forEach(function(m){ g.remove(m); });
      g.userData.bronzeArmor = null;
    }
    if (g.userData.silverArmor) {
      g.userData.silverArmor.forEach(function(m){ g.remove(m); });
    }
    var parts = [];
    var silver = new THREE.MeshStandardMaterial({
      color: 0xd8d8e0, roughness: 0.25, metalness: 0.9,
      emissive: 0x8899ff, emissiveIntensity: 0.12,
    });
    // greaves
    [-1, 1].forEach(function(s){
      var gr = new THREE.Mesh(new THREE.CylinderGeometry(R*0.27, R*0.31, R*0.58, 10), silver);
      gr.position.set(s*R*0.38, -R*0.95, 0); gr.castShadow = true;
      g.add(gr); parts.push(gr);
    });
    // gauntlets
    [-1, 1].forEach(function(s){
      var ga = new THREE.Mesh(new THREE.CylinderGeometry(R*0.21, R*0.24, R*0.48, 10), silver);
      ga.position.set(s*R*1.02, -R*0.15, 0); ga.rotation.z = s * -0.12; ga.castShadow = true;
      g.add(ga); parts.push(ga);
    });
    // helmet
    var helm = new THREE.Mesh(new THREE.SphereGeometry(R*0.94, 18, 12, 0, Math.PI*2, 0, Math.PI*0.55), silver);
    helm.position.y = R*0.55; helm.castShadow = true;
    g.add(helm); parts.push(helm);
    var brim = new THREE.Mesh(new THREE.TorusGeometry(R*0.90, R*0.07, 8, 20), silver);
    brim.rotation.x = Math.PI/2; brim.position.y = R*0.62;
    g.add(brim); parts.push(brim);
    // chestplate with silver star
    var chest = new THREE.Mesh(new THREE.SphereGeometry(R*1.06, 18, 12, 0, Math.PI*2, 0, Math.PI*0.62), silver);
    chest.position.y = R*0.02; chest.castShadow = true;
    g.add(chest); parts.push(chest);
    var star = new THREE.Mesh(new THREE.OctahedronGeometry(R*0.24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.2,
        emissive: 0xcceeff, emissiveIntensity: 1.0 }));
    star.position.set(0, R*0.12, R*1.0); star.rotation.y = Math.PI/4;
    g.add(star); parts.push(star);
    // silver glow
    if (typeof GLOW_TEX !== 'undefined' && GLOW_TEX) {
      var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: 0xcceeff,
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.4 }));
      glow.scale.set(R*3.8, R*3.8, 1);
      g.add(glow); parts.push(glow);
    }
    g.userData.silverArmor = parts;
  } catch (e) {}
}

/* ----- effective boost: silver (20%) overrides bronze (10%) ----- */
function __fbEffectiveBoost() {
  if (__FB_SILVER_UNLOCKED) return __FB_SILVER_BOOST;
  return (typeof __FB_ARMOR_BOOST !== 'undefined') ? __FB_ARMOR_BOOST : 0;
}

/* ----- server sync ----- */
function __fbSyncSilver() {
  var t = null;
  try { if (window.FireBabysAuth && window.FireBabysAuth.getToken) t = window.FireBabysAuth.getToken(); } catch (e) {}
  if (!t) return;
  fetch('https://fire-babys-auth.jeffpruden288.workers.dev/profile/silver', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: t, unlocked: __FB_SILVER_UNLOCKED, tasksDone: __fbTasksCompletedCount() }),
  }).catch(function(){});
}

/* ----- task UI panel ----- */
var __fbTaskUIOpen = false;
function __fbShowTasks() {
  try {
    __fbLoadTasks();
    var old = document.getElementById('fb-task-ov');
    if (old) { old.parentNode.removeChild(old); __fbTaskUIOpen = false; return; }
    __fbTaskUIOpen = true;
    var done = __fbTasksCompletedCount();
    var ov = document.createElement('div');
    ov.id = 'fb-task-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;background:rgba(8,4,2,0.88);padding:16px;box-sizing:border-box;';
    var cats = ['warrior','guardian','explorer','champion','legend'];
    var icons = { warrior: '⚔️', guardian: '🔥', explorer: '🗺️', champion: '👑', legend: '💎' };
    var html = '<div style="width:100%;max-width:520px;max-height:85vh;display:flex;flex-direction:column;background:#1c1006;border:3px solid #cceeff;border-radius:20px;padding:20px;">' +
      '<div style="color:#cceeff;font-size:20px;font-weight:900;letter-spacing:2px;text-align:center;">🥈 WORLD TASKS — ' + done + '/250</div>' +
      '<div style="color:#ffe9d6;font-size:13px;text-align:center;margin:8px 0;">Complete all 250 to earn the <b style="color:#cceeff;">SILVER ARMOR</b> (+20% over everything!)</div>' +
      '<div style="height:8px;background:#3a2410;border-radius:4px;margin-bottom:12px;"><div style="height:100%;width:' + (done/250*100) + '%;background:linear-gradient(90deg,#8899ff,#cceeff);border-radius:4px;"></div></div>' +
      '<div id="fb-task-cats" style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;justify-content:center;"></div>' +
      '<div id="fb-task-list" style="flex:1;overflow-y:auto;min-height:200px;"></div>' +
      '<button id="fb-task-close" style="margin-top:12px;padding:12px;font-size:16px;font-weight:900;border:none;border-radius:12px;cursor:pointer;color:#0a1a2a;background:linear-gradient(180deg,#cceeff,#8899ff);">CLOSE</button></div>';
    ov.innerHTML = html;
    ov.querySelector('#fb-task-close').addEventListener('click', function(){ ov.parentNode.removeChild(ov); __fbTaskUIOpen = false; });
    ov.addEventListener('click', function(e){ if (e.target === ov){ ov.parentNode.removeChild(ov); __fbTaskUIOpen = false; } });
    document.body.appendChild(ov);
    // category tabs
    var catEl = document.getElementById('fb-task-cats');
    cats.forEach(function(c, i){
      var b = document.createElement('button');
      var cDone = FB_TASKS_250.filter(function(t){ return t.category === c && __fbTasksDone[t.id]; }).length;
      b.textContent = icons[c] + ' ' + c + ' ' + cDone + '/50';
      b.style.cssText = 'padding:8px 12px;font-size:13px;font-weight:700;border:none;border-radius:8px;cursor:pointer;color:#ffe9d6;background:' + (i===0 ? '#4a6a9a' : '#3a2410') + ';';
      b.addEventListener('click', function(){ __fbRenderTaskCat(c); });
      catEl.appendChild(b);
    });
    __fbRenderTaskCat('warrior');
  } catch (e) {}
}

function __fbRenderTaskCat(cat) {
  try {
    var list = document.getElementById('fb-task-list');
    if (!list) return;
    var html = '';
    FB_TASKS_250.filter(function(t){ return t.category === cat; }).forEach(function(t){
      var isDone = !!__fbTasksDone[t.id];
      var prog = Math.min(__fbTaskProgress[t.id] || 0, t.target);
      var pct = Math.round(prog / t.target * 100);
      html += '<div style="padding:10px;margin-bottom:8px;border-radius:10px;background:' + (isDone ? 'rgba(136,153,255,0.15)' : 'rgba(255,140,46,0.08)') + ';border:1px solid ' + (isDone ? '#8899ff' : 'rgba(255,140,46,0.3)') + ';">' +
        '<div style="color:' + (isDone ? '#cceeff' : '#ffe9d6') + ';font-size:14px;font-weight:700;">' + (isDone ? '✅ ' : '') + t.name + '</div>' +
        '<div style="color:#c9a882;font-size:12px;margin:4px 0;">' + t.desc + '</div>' +
        '<div style="height:6px;background:#2a1a0c;border-radius:3px;"><div style="height:100%;width:' + pct + '%;background:' + (isDone ? '#8899ff' : '#ff8c2e') + ';border-radius:3px;"></div></div>' +
        '<div style="color:#c9a882;font-size:11px;margin-top:4px;">' + prog + ' / ' + t.target + '</div></div>';
    });
    list.innerHTML = html;
  } catch (e) {}
}

function __fbRefreshTaskUI() {
  if (__fbTaskUIOpen) {
    try {
      var ov = document.getElementById('fb-task-ov');
      if (ov) { ov.parentNode.removeChild(ov); __fbTaskUIOpen = false; }
      __fbShowTasks();
    } catch (e) {}
  }
}
