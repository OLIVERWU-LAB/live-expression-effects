import test from 'node:test';import assert from 'node:assert/strict';
import {StickerWorld}from'../dist/effects.mjs';import{planBurst,rocketPoint,PATTERNS}from'../dist/pyro.mjs';
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function subject(w,h){const rx=Math.min(w*.13,h*.14),cx=w*.5,cy=h*.37;return{head:{left:cx-rx*1.1,right:cx+rx*1.1,top:cy-rx*1.4,bottom:cy+rx*1.4},poly:Array.from({length:48},(_,i)=>({x:cx+rx*Math.cos(i/48*Math.PI*2),y:cy+rx*1.28*Math.sin(i/48*Math.PI*2)}))};}
test('planned fireworks actually collide with the person in both styles and all five shapes',()=>{
 for(const [w,h]of[[390,844],[1280,720]])for(const style of['sticker','cinema'])for(const pattern of PATTERNS){
  const random=rng(753),world=new StickerWorld(random),s=subject(w,h);world.setStyle(style);world.setEffect('laugh');world.setPattern(pattern);world.head=s.head;
  const plan=planBurst(w,h,s.head,1,random);world.launch(plan.x,plan.y,w,h,plan.scale,plan);for(let i=0;i<240;i++)world.update(1/60,w,h,s.poly);
  assert.ok(world.collisions>0,`${w}×${h} ${style} ${pattern} must reach the person`);
 }
});
test('centre and nearby lower-screen origins recur, instead of always using viewport edges',()=>{
 const random=rng(185),s=subject(1280,720),positions=[];for(let i=0;i<12;i++){const plan=planBurst(1280,720,s.head,i,random);positions.push(plan.launchX);assert.ok(Math.abs(plan.x-640)<280);assert.ok(plan.radius>230);}
 assert.ok(positions.filter(x=>Math.abs(x-640)<1).length>=4);assert.ok(positions.every(x=>x>1280*.16&&x<1280*.84));
});
test('the same straight flight slows continuously and reaches its fixed destination at burst time',()=>{
 const world=new StickerWorld(rng(7));world.setEffect('laugh');world.launch(420,170,900,800);const r=world.rockets[0],distance=(a,b)=>{const p=rocketPoint(r,a),q=rocketPoint(r,b);return Math.hypot(p.x-q.x,p.y-q.y);};
 const first=distance(0,.1),middle=distance(.45,.55),last=distance(.9,1);assert.ok(first>middle*1.6);assert.ok(middle>last*5);
 let previous=Infinity;for(let i=0;i<20;i++){const d=distance(i/20,(i+1)/20);assert.ok(d<previous);previous=d;}
 assert.deepEqual(rocketPoint(r,1),{x:r.tx,y:r.ty});assert.ok(r.trail.length<=8);
});

test('the initial blast never collides, and one spark cannot keep hammering the same outline',()=>{
 for(const style of['sticker','cinema']){const w=new StickerWorld(rng(78));w.setStyle(style);w.setEffect('laugh');w.burst(440,220,1,'chrysanthemum');const count=w.particles.length;let calls=0;const alwaysHit={collide(p){calls++;p.vy=-Math.abs(p.vy);return true;}};
 for(let i=0;i<36;i++)w.update(1/60,1280,720,alwaysHit);assert.equal(calls,0);for(let i=0;i<180;i++)w.update(1/60,1280,720,alwaysHit);assert.ok(calls>0);assert.ok(calls<=count);
 }
});
test('nearer/larger faces receive a larger opening exclusion region, also during flight',()=>{
 const a={left:450,right:650,top:220,bottom:460},b={left:380,right:720,top:170,bottom:570};const p=planBurst(1100,900,a,1,()=>.5),q=planBurst(1100,900,b,1,()=>.5);assert.ok(q.clearance>p.clearance);assert.ok(p.clearance>=84);assert.ok(q.clearance<=150);
 const w=new StickerWorld(rng(8));w.setEffect('laugh');w.head=a;w.launch(p.x,p.y,1100,900,p.scale,p);const r=w.rockets[0];w.head={left:p.x+40,right:p.x+240,top:p.y-50,bottom:p.y+200};for(let i=0;i<100;i++)w.update(.02,1100,900,null);assert.ok(r.cancelled);assert.equal(w.blooms.length,0);
});
