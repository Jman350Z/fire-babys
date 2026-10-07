import Matter from 'matter-js';
const { Engine, Bodies, Body, Composite, Events } = Matter;
const W = 1600, H = 900, GROUND_Y = 820;
const SLING = { x: 260, y: 600 };
const MAX_PULL = 170, POWER = 0.19, BLAZE_R = 34;
const container = document.getElementById('game-container');
const canvas = document.createElement('canvas');
container.appendChild(canvas);
const ctx = canvas.getContext('2d');
function loadImage(src){ const img = new Image(); img.src = src; return img; }
const images = {
  bg: loadImage('assets/volcano-bg.webp'),
  blaze: loadImage('assets/blaze.webp'),
  crystal: loadImage('assets/crystal-block.webp'),
  rock: loadImage('assets/rock-block.webp'),
};
let scale = 1, offX = 0, offY = 0;
function resize(){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  scale = Math.min(canvas.width / W, canvas.height / H);
  offX = (canvas.width - W * scale) / 2;
  offY = (canvas.height - H * scale) / 2;
}
addEventListener('resize', resize); resize();
const LEVELS = [
  { shots: 4, blocks: [
    ['rock', 1150, 0, 60, 120], ['rock', 1310, 0, 60, 120],
    ['rock', 1230, 1, 240, 30], ['crystal', 1230, 2, 70, 70],
    ['crystal', 1150, 2, 60, 60], ['crystal', 1310, 2, 60, 60],
  ]},
  { shots: 4, blocks: [
    ['rock', 1050, 0, 50, 140], ['rock', 1190, 0, 50, 140], ['rock', 1330, 0, 50, 140],
    ['rock', 1120, 1, 200, 28], ['rock', 1260, 1, 200, 28],
    ['crystal', 1120, 2, 70, 70], ['crystal', 1260, 2, 70, 70],
    ['rock', 1190, 3, 240, 28], ['crystal', 1190, 4, 70, 70],
  ]},
  { shots: 5, blocks: [
    ['rock', 1000, 0, 50, 130], ['rock', 1140, 0, 50, 130], ['crystal', 1280, 0, 70, 70], ['rock', 1420, 0, 50, 130],
    ['rock', 1070, 1, 200, 26], ['rock', 1350, 1, 200, 26],
    ['crystal', 1070, 2, 60, 60], ['crystal', 1350, 2, 60, 60],
    ['rock', 1070, 3, 60, 110], ['rock', 1350, 3, 60, 110],
    ['rock', 1210, 4, 380, 26], ['crystal', 1210, 5, 80, 80],
  ]},
];
let engine, blocks = [], blaze = null, state = 'aim';
let levelIndex = 0, score = 0, shotsLeft = 0, settleTimer = 0;
let particles = [], shake = 0, pull = null, flightTime = 0;
function buildLevel(){
  engine = Engine.create(); engine.gravity.y = 1;
  const ground = Bodies.rectangle(W/2+400, GROUND_Y+50, W*2, 100, { isStatic: true, label: 'ground' });
  Composite.add(engine.world, ground);
  blocks = [];
  const level = LEVELS[levelIndex];
  const rowTops = {}; let stackY = GROUND_Y;
  const rowHeights = [];
  level.blocks.forEach(b => { rowHeights[b[2]] = Math.max(rowHeights[b[2]]||0, b[4]); });
  rowHeights.forEach((h,r) => { rowTops[r] = stackY; stackY -= h; });
  level.blocks.forEach(([type,x,row,w,h]) => {
    const y = rowTops[row] - h/2;
    const body = Bodies.rectangle(x, y, w, h, { density: type==='rock'?0.004:0.002, friction: 0.7, restitution: 0.05 });
    const maxHp = type==='rock' ? 26 : 10;
    body.gameData = { type, w, h, hp: maxHp, maxHp, dead: false };
    blocks.push(body); Composite.add(engine.world, body);
  });
  Events.on(engine, 'collisionStart', onCollision);
  shotsLeft = level.shots; blaze = null; state = 'aim';
}
function onCollision(event){
  for(const pair of event.pairs){
    const a = pair.bodyA, b = pair.bodyB;
    const rel = Math.hypot(a.velocity.x-b.velocity.x, a.velocity.y-b.velocity.y);
    if(rel < 2.2) continue;
    const isBlaze = a.label==='blaze' || b.label==='blaze';
    const damage = (rel-2) * (isBlaze?2.2:1.1);
    [a,b].forEach(body => { if(body.gameData) damageBlock(body, damage); });
  }
}
function damageBlock(body, damage){
  const d = body.gameData; if(d.dead) return;
  d.hp -= damage; score += Math.round(damage*5);
  if(d.hp <= 0) destroyBlock(body);
}
function destroyBlock(body){
  const d = body.gameData; d.dead = true;
  score += d.type==='crystal' ? 500 : 150;
  spawnBurst(body.position.x, body.position.y, d.type==='crystal'?'#6ff':'#f84', 18);
  shake = Math.max(shake, 10);
  setTimeout(() => Composite.remove(engine.world, body), 0);
}
function spawnBurst(x,y,color,count){
  for(let i=0;i<count;i++){
    const a = Math.random()*Math.PI*2, s = 2+Math.random()*7;
    particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s-2, life: 1, color, size: 4+Math.random()*8 });
  }
}
function crystalsLeft(){ return blocks.filter(b=>b.gameData.type==='crystal'&&!b.gameData.dead).length; }
function toWorld(e){
  const r = canvas.getBoundingClientRect(), dpr = canvas.width/r.width;
  return { x: ((e.clientX-r.left)*dpr-offX)/scale, y: ((e.clientY-r.top)*dpr-offY)/scale };
}
canvas.addEventListener('pointerdown', e => {
  const p = toWorld(e);
  if(state==='won'||state==='lost'){
    if(state==='won'){ levelIndex=(levelIndex+1)%LEVELS.length; if(levelIndex===0) score=0; }
    else { score=0; levelIndex=0; }
    buildLevel(); return;
  }
  if(state==='aim' && p.x < W*0.45){
    pull = { x: SLING.x, y: SLING.y }; updatePull(p);
    canvas.setPointerCapture(e.pointerId);
  }
});
function updatePull(p){
  let dx=p.x-SLING.x, dy=p.y-SLING.y;
  const d=Math.hypot(dx,dy);
  if(d>MAX_PULL){ dx=dx/d*MAX_PULL; dy=dy/d*MAX_PULL; }
  pull={ x: SLING.x+dx, y: SLING.y+dy };
}
canvas.addEventListener('pointermove', e => { if(pull) updatePull(toWorld(e)); });
canvas.addEventListener('pointerup', () => {
  if(!pull) return;
  const dx=SLING.x-pull.x, dy=SLING.y-pull.y;
  if(Math.hypot(dx,dy)>25) launch(dx,dy);
  pull=null;
});
function launch(dx,dy){
  blaze=Bodies.circle(pull.x,pull.y,BLAZE_R,{label:'blaze',density:0.008,restitution:0.35,friction:0.4});
  Composite.add(engine.world, blaze);
  Body.setVelocity(blaze,{x:dx*POWER,y:dy*POWER});
  shotsLeft--; state='flying'; flightTime=0;
}
function update(dt){
  Engine.update(engine, 1000/60);
  blocks.forEach(b=>{ if(!b.gameData.dead&&(b.position.y>H+100||b.position.x>W+200)) destroyBlock(b); });
  if(state==='flying'){
    flightTime+=dt; spawnTrail();
    const slow=blaze.speed<0.4, gone=blaze.position.x>W+100||blaze.position.x<-100||blaze.position.y>H+100;
    if(gone||(slow&&flightTime>1.5)||flightTime>9){ state='settling'; settleTimer=1.4; }
  } else if(state==='settling'){
    settleTimer-=dt;
    if(settleTimer<=0){
      Composite.remove(engine.world, blaze); blaze=null;
      if(crystalsLeft()===0){ score+=shotsLeft*1000; state='won'; }
      else if(shotsLeft<=0){ state='lost'; }
      else { state='aim'; }
    }
  }
  if(state==='aim'&&crystalsLeft()===0) state='won';
  particles.forEach(p=>{ p.x+=p.vx; p.vy+=0.3; p.y+=p.vy; p.life-=dt*1.5; });
  particles=particles.filter(p=>p.life>0);
  shake*=0.88;
}
function spawnTrail(){
  if(blaze&&Math.random()<0.7) particles.push({x:blaze.position.x,y:blaze.position.y,vx:(Math.random()-0.5)*2,vy:-Math.random()*2,life:0.7,color:Math.random()<0.5?'#ffb000':'#ff5a00',size:8+Math.random()*8});
}
function drawImageCover(img,x,y,w,h){
  if(img.complete&&img.naturalWidth){ ctx.drawImage(img,x,y,w,h); return true; }
  return false;
}
function drawBlock(b){
  const d=b.gameData;
  ctx.save(); ctx.translate(b.position.x,b.position.y); ctx.rotate(b.angle);
  const img=d.type==='crystal'?images.crystal:images.rock;
  if(!drawImageCover(img,-d.w/2,-d.h/2,d.w,d.h)){ ctx.fillStyle=d.type==='crystal'?'#4de':'#544'; ctx.fillRect(-d.w/2,-d.h/2,d.w,d.h); }
  ctx.lineWidth=3; ctx.strokeStyle='#1a0a10'; ctx.strokeRect(-d.w/2,-d.h/2,d.w,d.h);
  const dmg=1-d.hp/d.maxHp;
  if(dmg>0.2){ ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=2; ctx.beginPath();
    const cracks=Math.ceil(dmg*4);
    for(let i=0;i<cracks;i++){ const sx=((i*37)%10/10-0.5)*d.w; ctx.moveTo(sx,-d.h/2); ctx.lineTo(sx*0.3+6,0); ctx.lineTo(-sx*0.4,d.h/2*dmg); }
    ctx.stroke(); }
  ctx.restore();
}
function drawBlaze(x,y,angle){
  ctx.save(); ctx.translate(x,y); ctx.rotate(angle);
  ctx.shadowColor='#ffa000'; ctx.shadowBlur=30;
  const bw=BLAZE_R*2.3, bh=bw*(784/530);
  if(!drawImageCover(images.blaze,-bw/2,-bh*0.62,bw,bh)){ ctx.fillStyle='#ffb300'; ctx.beginPath(); ctx.arc(0,0,BLAZE_R,0,Math.PI*2); ctx.fill(); }
  ctx.restore();
}
function drawTrajectory(){
  const vx=(SLING.x-pull.x)*POWER, vy=(SLING.y-pull.y)*POWER;
  const g=0.001*(1000/60)*(1000/60);
  let px=pull.x,py=pull.y,cvx=vx,cvy=vy;
  ctx.fillStyle='#fff';
  for(let i=0;i<70;i++){ cvy+=g; cvx*=0.99; cvy*=0.99; px+=cvx; py+=cvy;
    if(i%3===0){ ctx.globalAlpha=1-i/80; ctx.beginPath(); ctx.arc(px,py,6-i/18,0,Math.PI*2); ctx.fill(); }
    if(py>GROUND_Y) break; }
  ctx.globalAlpha=1;
}
function drawSlingshot(front){
  ctx.strokeStyle='#3b1d10'; ctx.lineCap='round';
  if(!front){ ctx.lineWidth=22; ctx.beginPath();
    ctx.moveTo(SLING.x,GROUND_Y); ctx.lineTo(SLING.x,SLING.y+60); ctx.lineTo(SLING.x-30,SLING.y-10);
    ctx.moveTo(SLING.x,SLING.y+60); ctx.lineTo(SLING.x+30,SLING.y-10); ctx.stroke(); }
  const holder=pull||SLING, tip=front?SLING.x+30:SLING.x-30;
  if(state==='aim'){ ctx.strokeStyle='#ff3d2e'; ctx.lineWidth=8; ctx.beginPath(); ctx.moveTo(tip,SLING.y-10); ctx.lineTo(holder.x,holder.y); ctx.stroke(); }
}
function drawHud(){
  ctx.fillStyle='rgba(40,10,0,0.55)'; ctx.fillRect(40,40,520,70);
  ctx.fillStyle='#ffe9b0'; ctx.font='bold 34px sans-serif'; ctx.fillText(`SCORE ${score}`,60,88);
  ctx.font='bold 26px sans-serif'; ctx.fillText(`LVL ${levelIndex+1}`,330,88);
  for(let i=0;i<shotsLeft;i++){ ctx.fillStyle='#ffb300'; ctx.beginPath(); ctx.arc(450+i*24,76,9,0,Math.PI*2); ctx.fill(); }
  ctx.font='bold 24px sans-serif'; ctx.fillStyle='#bff'; ctx.fillText(`💎 ${crystalsLeft()} left`,60,145);
  if(state==='aim'&&!pull&&shotsLeft===LEVELS[levelIndex].shots){
    ctx.fillStyle='#fff'; ctx.textAlign='center';
    ctx.fillText('Drag Blaze back & release to smash the crystals!',SLING.x+260,SLING.y-140);
    ctx.textAlign='left';
  }
}
function drawOverlay(){
  ctx.fillStyle='rgba(20,0,0,0.6)'; ctx.fillRect(0,0,W,H); ctx.textAlign='center';
  ctx.fillStyle=state==='won'?'#ffd23f':'#ff6b5a'; ctx.font='bold 80px sans-serif';
  const last=levelIndex===LEVELS.length-1;
  ctx.fillText(state==='won'?(last?'VOLCANO CONQUERED!':'LEVEL CLEAR!'):'OUT OF BLAZES!',W/2,H/2-40);
  ctx.fillStyle='#fff'; ctx.font='bold 40px sans-serif'; ctx.fillText(`Score: ${score}`,W/2,H/2+30);
  ctx.font='32px sans-serif'; ctx.fillText(state==='won'?(last?'Tap to play again':'Tap for next level'):'Tap to restart',W/2,H/2+100);
  ctx.textAlign='left';
}
function render(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='#2a0c04'; ctx.fillRect(0,0,canvas.width,canvas.height);
  const sx=(Math.random()-0.5)*shake, sy=(Math.random()-0.5)*shake;
  ctx.setTransform(scale,0,0,scale,offX+sx*scale,offY+sy*scale);
  if(!drawImageCover(images.bg,0,0,W,H)){ ctx.fillStyle='#ff8a3d'; ctx.fillRect(0,0,W,H); }
  ctx.fillStyle='rgba(40,15,10,0.85)'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
  ctx.fillStyle='#ff7a00'; ctx.fillRect(0,GROUND_Y,W,6);
  drawSlingshot(false);
  blocks.forEach(b=>{ if(!b.gameData.dead) drawBlock(b); });
  if(state==='aim'){ const pos=pull||SLING; drawBlaze(pos.x,pos.y,0); if(pull) drawTrajectory(); }
  else if(blaze){ drawBlaze(blaze.position.x,blaze.position.y,blaze.angle); }
  drawSlingshot(true);
  particles.forEach(p=>{ ctx.globalAlpha=Math.max(p.life,0); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2); ctx.fill(); });
  ctx.globalAlpha=1; drawHud();
  if(state==='won'||state==='lost') drawOverlay();
}
let lastTime=performance.now();
function loop(now){
  const dt=Math.min((now-lastTime)/1000,0.05); lastTime=now;
  update(dt); render(); requestAnimationFrame(loop);
}
buildLevel(); requestAnimationFrame(loop);
