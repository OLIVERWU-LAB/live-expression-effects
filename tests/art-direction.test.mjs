import test from 'node:test';import assert from 'node:assert/strict';
import {planBurst,burstIsSafe,shellParticles,SHELLS}from'../dist/pyro.mjs';import{LensRain,StickerWorld}from'../dist/effects.mjs';
let seed=536;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('opening regions clear the entire head while large falling clouds can still reach the person',()=>{
 for(const [w,h]of[[390,844],[526,984],[1280,720],[320,640]])for(let i=0;i<100;i++){
  const r=Math.min(w*.13,h*.14),x=w*(.28+random()*.44),y=h*(.3+random()*.15),head={left:x-r*1.1,right:x+r*1.1,top:y-r*1.4,bottom:y+r*1.4};const p=planBurst(w,h,head,i,random);
  assert.ok(p,'normal portrait needs an available sky region');assert.ok(burstIsSafe(p,head,23));assert.ok(p.x>=24&&p.x<=w-24);assert.ok(p.y>=(w<650&&h>w?28:w<650?104:78)-1);assert.ok(p.radius>=w*.2||p.radius>=h*.3);const distance=Math.hypot(Math.max(head.left-p.x,0,p.x-head.right),Math.max(head.top-p.y,0,p.y-head.bottom));assert.ok(distance<p.radius*.92,'the falling cloud must still reach the person');
 }
});
test('a head occupying all sky causes cancellation instead of a forehead burst',()=>{assert.equal(planBurst(320,640,{left:0,right:320,top:0,bottom:640},0,random),null);});
test('a moving head is rechecked before an in-flight firework explodes',()=>{
 const w=new StickerWorld(random);w.setEffect('laugh');const head={left:180,right:320,top:250,bottom:430},p=planBurst(526,984,head,0,random);w.head=head;w.launch(p.x,p.y,526,984,p.scale,p);
 w.head={left:p.x-40,right:p.x+40,top:p.y-40,bottom:p.y+40};for(let i=0;i<30;i++)w.update(.05,526,984,null);
 assert.ok(w.blooms.every(b=>burstIsSafe({x:b.x,y:b.y,radius:p.radius},w.head,10)));
});
test('every paper bloom has all five colours, and natural shells are not evenly spaced',()=>{
 for(const pattern of Object.keys(SHELLS)){const s=shellParticles(pattern,400,200,.5,false,random);assert.equal(new Set(s.particles.map(p=>p.variant)).size,5);}
 const s=shellParticles('chrysanthemum',400,200,.6,true,random),angles=s.particles.map(p=>Math.atan2(p.vy,p.vx)).sort((a,b)=>a-b),gaps=angles.slice(1).map((a,i)=>a-angles[i]);const mean=gaps.reduce((a,b)=>a+b)/gaps.length,std=Math.sqrt(gaps.reduce((a,b)=>a+(b-mean)**2,0)/gaps.length);assert.ok(std/mean>.5);
 assert.ok(new Set(s.particles.map(p=>p.variant)).size>=2);assert.ok(Math.max(...s.particles.map(p=>p.delay))>.1);
});
test('all styles omit glass droplets and screen rivulets at both refresh rates',()=>{
 for(const step of[1/30,1/120])for(const style of['sticker','cinema','gift','flat','glow']){const lens=new LensRain(random);lens.setStyle(style);for(let t=0;t<3;t+=step)lens.update(step,390,844,true);assert.equal(lens.drops.length,0);assert.equal(lens.trails.length,0);}
});
test('fireworks do not bounce during their opening beat; rain still collides immediately',()=>{let hits=0;const collider={collide(){hits++;return false;}};const w=new StickerWorld(random);w.setEffect('laugh');w.burst(400,200,.5,'chrysanthemum');for(let i=0;i<6;i++)w.update(.01,1280,720,collider);assert.equal(hits,0);for(let i=0;i<60;i++)w.update(.03,1280,720,collider);assert.ok(hits>0);});
