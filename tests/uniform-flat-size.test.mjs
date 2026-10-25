import test from 'node:test';
import assert from 'node:assert/strict';
import {planLiveFirework} from '../dist/firework-playback.mjs';
import {flatRandom,flatViewportScale,flatFlowerSites,flatSitesClear} from '../dist/flat-placement.mjs';
import {flatShell,flatChildren,ACTIVE_FLAT_PATTERNS} from '../dist/flat-fireworks.mjs';
import {StickerWorld} from '../dist/effects.mjs';

test('moving the head horizontally or changing launch side cannot resize a flat firework',()=>{
 for(const [width,height,top] of [[1280,720,160],[1280,720,240],[960,576,238],[390,844,160],[390,844,260]]){
  const expected=flatViewportScale(width,height);
  for(const center of [.3,.5,.7])for(let index=0;index<4;index++){
   const half=width<650?82:125,head={left:width*center-half,right:width*center+half,top,bottom:top+250};
   const plan=planLiveFirework({style:'flat'},width,height,head,index,flatRandom(31+index));assert.ok(plan);
   assert.equal(plan.scale,expected);assert.equal(plan.radius,expected*205);
   assert.ok(flatSitesClear(flatFlowerSites(plan.scale,plan.flatSeed,plan.flatSpreadScale),plan.x,plan.y,plan.scale,head,width,height));
  }
  assert.equal(planLiveFirework({style:'flat'},width,height,null,0,flatRandom(31)).scale,expected);
 }
});
test('a tight layout may move carrier centres while preserving every flower radius and radial velocity',()=>{
 for(const pattern of ACTIVE_FLAT_PATTERNS){
  const size=.85,a=flatShell(100,100,size,flatRandom(51),pattern,size).particles,b=flatShell(100,100,size,flatRandom(51),pattern,size*.5).particles;
  assert.equal(a.length,5);assert.equal(b.length,a.length);
  for(let i=0;i<a.length;i++){
   const pa=flatChildren({...a[i],vx:0,vy:0},flatRandom(8)),pb=flatChildren({...b[i],vx:0,vy:0},flatRandom(8));assert.equal(pa.length,pb.length);
   pa.forEach((p,j)=>{for(const key of ['size','scale','vx','vy','life','maxLife','flatRole'])assert.equal(p[key],pb[j][key]);});
  }
 }
});
test('a constrained phone launch keeps the full bloom size and all planned flowers through real physics',()=>{
 const width=390,height=844,head={left:113,right:277,top:160,bottom:410};
 for(const pattern of ACTIVE_FLAT_PATTERNS){
  const world=new StickerWorld(flatRandom(86));world.setStyle('flat');world.setEffect('laugh');world.setPattern(pattern);world.viewport={width,height};world.head=head;world.limit=420;
  const plan=planLiveFirework(world,width,height,head,0,flatRandom(31));assert.ok(plan.flatSpreadScale<=plan.scale);
  assert.ok(world.launch(plan.x,plan.y,width,height,plan.scale,plan));const births=new Map();
  for(let frame=0;frame<180;frame++){
   world.update(1/60,width,height,null);
   for(const p of world.particles)if(p.cascadeChild&&!births.has(p.clusterIndex))births.set(p.clusterIndex,p);
   assert.ok(world.particles.length<=420);
  }
  assert.equal(births.size,5);
  for(const [index,p] of births)assert.ok(Math.abs(p.scale-plan.scale*.78*[.68,.92,1.16,.78,1.02][index])<1e-9);
 }
});
