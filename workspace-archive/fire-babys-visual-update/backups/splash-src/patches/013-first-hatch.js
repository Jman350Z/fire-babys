/* =====================================================================
   PATCH 013 — first-hatch
   Date: 2026-10-01 | For: Jeff (Fire Babys)
   Directive: Jeff — "What i want you to build now is the player creation
     area .. time to make my very first fire baby."
   The full creator already lives in patch 003 (🎨 button, ~9.6M combos).
   What's missing is the MOMENT: every real video game starts with
   "create your character." This patch adds the first-run flow:
     1. New player taps PLAY on the title screen.
     2. Instead of the deploy screen, they meet the HATCH prompt:
        "EVERY LEGEND STARTS WITH A SPARK — make your very first
        fire baby." One big button opens the 003 creator.
     3. The moment they save their baby, the creator closes and a
        "🐣 HATCHED!" celebration names their baby, then sends them
        to battle with it.
     4. Never shows again (persisted flag). "Skip for now" respects
        players who just want to fight.
   Touches: DOM only (#hatchPromptOv, #hatchDoneOv). Wraps nothing in
     003 — it drives the creator through its public HUD button and
     reads window.__FB3. No canvas, combat, or baseline changes.
   How to disable: set "enabled": false in patches/manifest.json, rebuild.
   Test: with no custom babies, needsFirstHatch() is true and the prompt
     builds; after a baby is saved, celebrate() names it.
   ===================================================================== */
(function(){
'use strict';

var H = {};
H.FLAG = 'fb_firstHatch';
H.memFlag = false;
H.promptShown = false;   /* prompt visible right now */
H.flowActive = false;    /* player is in the first-hatch flow */
H.done = false;

/* ---------- persisted "already hatched" flag ---------- */
H.isDone = function(){
  if(H.done) return true;
  try{
    if(typeof localStorage !== 'undefined' && localStorage.getItem(H.FLAG) === '1') return true;
  }catch(e){}
  return H.memFlag;
};
H.markDone = function(){
  H.done = true; H.memFlag = true; H.flowActive = false;
  try{ localStorage.setItem(H.FLAG, '1'); }catch(e){}
};

/* ---------- store access (patch 003's public handle) ---------- */
H.store = function(){
  try{ return (typeof window !== 'undefined' && window.__FB3) ? window.__FB3 : null; }
  catch(e){ return null; }
};
H.creatorBtn = function(){
  try{ return (typeof document !== 'undefined' && document.getElementById('creatorBtn')) || null; }
  catch(e){ return null; }
};
H.titleGone = function(){
  try{
    if(typeof window !== 'undefined' && window.__TITLE_DEBUG && window.__TITLE_DEBUG.isHidden)
      return !!window.__TITLE_DEBUG.isHidden();
  }catch(e){}
  return true; /* no title patch -> nothing blocking */
};
H.creatorOpen = function(){
  try{
    var ov = document.getElementById('creatorOv');
    if(!ov) return false;
    if(ov.classList && typeof ov.classList.contains === 'function')
      return !ov.classList.contains('hidden');
    return ov.style.display !== 'none';
  }catch(e){ return false; }
};

/* ---------- the decision ---------- */
function needsFirstHatch(){
  if(H.isDone()) return false;
  var s = H.store();
  if(!s) return false;
  if(s.customs && s.customs.length > 0) return false;
  if(!H.creatorBtn()) return false; /* creator patch disabled */
  return true;
}

/* ---------- overlays ---------- */
H.baseStyle = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:45;' +
  'display:flex;flex-direction:column;justify-content:center;align-items:center;' +
  'background:rgba(8,3,2,.96);padding:24px;text-align:center;';

H.showPrompt = function(){
  if(typeof document === 'undefined') return false;
  if(document.getElementById('hatchPromptOv')) return true;
  var stage = document.getElementById('stage') || document.body;
  if(!stage || !stage.appendChild) return false;
  var ov = document.createElement('div');
  ov.id = 'hatchPromptOv';
  ov.style.cssText = H.baseStyle;
  var box = document.createElement('div');
  box.style.cssText = 'max-width:440px;display:flex;flex-direction:column;align-items:center;';
  var egg = document.createElement('div');
  egg.textContent = '🥚';
  egg.style.cssText = 'font-size:72px;margin-bottom:10px;';
  var head = document.createElement('div');
  head.textContent = 'EVERY LEGEND STARTS WITH A SPARK';
  head.style.cssText = 'color:#ffd76a;font:900 20px/1.4 system-ui;letter-spacing:1px;margin-bottom:10px;';
  var sub = document.createElement('div');
  sub.textContent = 'Before your first battle, make your very first fire baby — name it, pick its flames, choose how it fights. It\'s yours forever.';
  sub.style.cssText = 'color:#ffe9d6;opacity:.85;font:600 14px/1.6 system-ui;margin-bottom:20px;';
  var go = document.createElement('button');
  go.id = 'hatchCreateBtn';
  go.textContent = '🎨 CREATE MY BABY';
  go.style.cssText = 'background:linear-gradient(180deg,#ff7a2e,#e23c0a);color:#fff;border:none;' +
    'border-radius:16px;font:900 18px system-ui;letter-spacing:1px;padding:16px 40px;cursor:pointer;' +
    'box-shadow:0 6px 30px rgba(255,93,46,.55);margin-bottom:12px;';
  var skip = document.createElement('button');
  skip.id = 'hatchSkipBtn';
  skip.textContent = 'skip for now';
  skip.style.cssText = 'background:none;border:none;color:rgba(255,233,214,.5);' +
    'font:600 13px system-ui;cursor:pointer;text-decoration:underline;';
  if(go.addEventListener) go.addEventListener('click', function(){ H.begin(); });
  if(skip.addEventListener) skip.addEventListener('click', function(){ H.skip(); });
  box.appendChild(egg); box.appendChild(head); box.appendChild(sub);
  box.appendChild(go); box.appendChild(skip);
  ov.appendChild(box);
  stage.appendChild(ov);
  H.promptShown = true;
  return true;
};

H.hidePrompt = function(){
  try{
    var ov = document.getElementById('hatchPromptOv');
    if(ov){ ov.style.display = 'none'; }
  }catch(e){}
  H.promptShown = false;
};

H.begin = function(){
  H.hidePrompt();
  H.flowActive = true;
  var btn = H.creatorBtn();
  if(btn && btn.click) btn.click();
};

H.skip = function(){
  H.hidePrompt();
  H.markDone(); /* respect it: never nag again */
};

H.celebrate = function(spec){
  if(typeof document === 'undefined') return false;
  H.closeCreator();
  var old = document.getElementById('hatchDoneOv');
  if(old && old.parentNode && old.parentNode.removeChild) old.parentNode.removeChild(old);
  var stage = document.getElementById('stage') || document.body;
  if(!stage || !stage.appendChild) return false;
  var name = (spec && spec.name) || 'Baby';
  var cls = 'Fire Baby';
  try{
    if(window.__FB3_DEBUG && window.__FB3_DEBUG.cls && spec && spec.cls)
      cls = window.__FB3_DEBUG.cls(spec.cls).name;
  }catch(e){}
  var ov = document.createElement('div');
  ov.id = 'hatchDoneOv';
  ov.style.cssText = H.baseStyle;
  var box = document.createElement('div');
  box.style.cssText = 'max-width:440px;display:flex;flex-direction:column;align-items:center;';
  var chick = document.createElement('div');
  chick.textContent = '🐣';
  chick.style.cssText = 'font-size:72px;margin-bottom:10px;';
  var head = document.createElement('div');
  head.textContent = 'HATCHED!';
  head.style.cssText = 'color:#ffd76a;font:900 26px system-ui;letter-spacing:2px;margin-bottom:8px;';
  var who = document.createElement('div');
  who.textContent = name + ' is born!';
  who.style.cssText = 'color:#fff;font:800 18px system-ui;margin-bottom:6px;';
  var sub = document.createElement('div');
  sub.textContent = cls + ' · Yours forever. Now take it into battle.';
  sub.style.cssText = 'color:#ffe9d6;opacity:.8;font:600 13px/1.6 system-ui;margin-bottom:20px;';
  var go = document.createElement('button');
  go.id = 'hatchBattleBtn';
  go.textContent = '⚔️ TO BATTLE';
  go.style.cssText = 'background:linear-gradient(180deg,#ff7a2e,#e23c0a);color:#fff;border:none;' +
    'border-radius:16px;font:900 18px system-ui;letter-spacing:1px;padding:16px 40px;cursor:pointer;' +
    'box-shadow:0 6px 30px rgba(255,93,46,.55);';
  if(go.addEventListener) go.addEventListener('click', function(){ H.finish(); });
  box.appendChild(chick); box.appendChild(head); box.appendChild(who);
  box.appendChild(sub); box.appendChild(go);
  ov.appendChild(box);
  stage.appendChild(ov);
  return true;
};

H.closeCreator = function(){
  try{
    var ov = document.getElementById('creatorOv');
    if(ov){
      if(ov.classList && typeof ov.classList.add === 'function') ov.classList.add('hidden');
      else ov.style.display = 'none';
    }
  }catch(e){}
};

H.finish = function(){
  try{
    var ov = document.getElementById('hatchDoneOv');
    if(ov) ov.style.display = 'none';
  }catch(e){}
  H.markDone();
};

/* ---------- watch loop ---------- */
H.tick = function(){
  try{
    if(H.isDone()) return;
    if(!needsFirstHatch()) return;
    /* waiting for the title to clear */
    if(!H.titleGone() || H.creatorOpen()) return;
    if(H.flowActive){
      /* player is building: did they save a baby? */
      var s = H.store();
      if(s && s.customs && s.customs.length > 0){
        H.flowActive = false;
        H.celebrate(s.customs[s.customs.length - 1]);
      }
      return;
    }
    if(!H.promptShown) H.showPrompt();
  }catch(e){}
};

if(typeof setInterval !== 'undefined'){
  setInterval(H.tick, 600);
}

if(typeof window !== 'undefined'){
  window.__HATCH_DEBUG = {
    needsFirstHatch: needsFirstHatch,
    showPrompt: H.showPrompt,
    celebrate: H.celebrate,
    isDone: H.isDone,
    markDone: H.markDone,
    tick: H.tick
  };
}

})();
