import test from'node:test';import assert from'node:assert/strict';
import{StickerWorld}from'../dist/effects.mjs';import{giftShell}from'../dist/reference-bursts.mjs';import{flatRandom}from'../dist/flat-placement.mjs';
const wall=[{x:100,y:20},{x:190,y:20},{x:190,y:220},{x:100,y:220}];
for(const velocity of[{vx:260,vy:30},{vx:260,vy:-25}])test(`gift contact is immediate, including upward/sideways motion ${velocity.vy}`,()=>{
 const w=new StickerWorld(flatRandom(31));w.setStyle('gift');w.setEffect('laugh');w.viewport={width:220,height:260};const p={...giftShell('gift-twinkle',95,120,.6,flatRandom(2)).particles[0],x:95,y:120,...velocity,delay:0};w.particles=[p];
 w.update(1/30,220,260,wall);assert.equal(w.collisions,1);assert.ok(p.wallAge<.1);assert.ok(!w.particles.includes(p));const paper=w.particles.filter(q=>q.giftConfetti);assert.equal(paper.length,5);assert.ok(paper.every(q=>q.collisionBorn&&q.hasCollided&&q.x<=100));
 for(let i=0;i<6;i++)w.update(1/60,220,260,wall);assert.equal(w.collisions,1,'short confetti does not recursively collide and multiply');
});
test('actual flower births have clear spacing without changing the component budget',()=>{
 for(const seed of[1,5,31,86,811]){
  const w=new StickerWorld(flatRandom(7));w.setStyle('flat');w.setEffect('laugh');w.viewport={width:1280,height:800};w.burst(600,220,.5,'flat-medallion',.5,seed);const born=new Map();
  for(let i=0;i<100;i++){w.update(1/60,1280,800,null);for(const p of w.particles)if(p.cascadeChild&&!born.has(p.clusterIndex))born.set(p.clusterIndex,{x:p.birthX,y:p.birthY});assert.ok(w.particles.length<=w.limit);}
  assert.equal(born.size,w.lastFlatFlowerCount);const a=[...born.values()];let nearest=Infinity;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)nearest=Math.min(nearest,Math.hypot(a[i].x-a[j].x,a[i].y-a[j].y));assert.ok(nearest>110,`${seed}: ${nearest}`);
 }
});
