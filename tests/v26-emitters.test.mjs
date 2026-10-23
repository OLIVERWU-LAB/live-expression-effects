import test from 'node:test';import assert from 'node:assert/strict';
import{StickerWorld}from'../dist/effects.mjs';import{flatChildren,FLAT_PATTERNS,FLAT_COLORWAYS,FLAT_CASCADES}from'../dist/flat-fireworks.mjs';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('flat flower births stay attached to actual carriers even after an externally displaced collision',()=>{
 for(const key of FLAT_PATTERNS.slice(0,2))for(const dt of[.008,.016,.033]){
  const w=new StickerWorld(rng(12));w.setStyle('flat');w.setEffect('laugh');w.burst(900,350,1,key);const seeds=[...w.particles];seeds[0].x+=85;seeds[0].y+=31;seeds[0].vx*=-.7;
  let centres=0;
  for(let i=0;i<Math.ceil(2/dt);i++){
   const before=new Set(w.particles);w.update(dt,1800,1800,null);
   for(const p of w.particles)if(!before.has(p)&&p.flatRole==='petal'&&!p.innerPetal){const seed=seeds.find(q=>q.seed===p.emitterId);assert.ok(seed);assert.equal(p.birthX,seed.x);assert.equal(p.birthY,seed.y);centres++;}
  }
  assert.ok(centres>=30);
 }
});
test('inner round and hollow ring share their moving core emitter, never a precomputed offset',()=>{
 const parent={x:777,y:333,vx:-22,vy:36,tempo:1.65,scale:1,pattern:'flat-petals-slow',flatRole:'core',color:'#59C9F2',accent:'#FF7975',turn:.8,seed:19};
 const children=flatChildren(parent,rng(2));assert.ok(children.some(p=>p.flatRole==='ring'));assert.ok(children.every(p=>p.x===777&&p.y===333&&p.emitterId===19&&p.delay===0));
});
test('all radial flat designs remain distinct, use curated palettes per flower, and fall under gravity',()=>{
 const signatures=[];
 for(const key of FLAT_PATTERNS.slice(2)){
  const w=new StickerWorld(rng(61));w.setStyle('flat');w.setPattern(key);w.setEffect('laugh');w.burst(900,350,1,key);if(FLAT_CASCADES.includes(key))for(let i=0;i<49;i++)w.update(.02,1800,1800,null);const original=[...w.particles];assert.ok(original.length>=50&&original.length<=700);assert.ok(original.every(p=>p.gravity>0));
  for(const v of new Set(original.map(p=>p.variant))){const colors=new Set(original.filter(p=>p.variant===v).map(p=>p.tint));assert.ok(FLAT_COLORWAYS.some(c=>[...colors].every(x=>c.includes(x)||x==='#FFF2D6'||x==='#FFFFFF')));}signatures.push([...new Set(original.map(p=>p.flatRole))].sort().join()+original.length);
  for(let i=0;i<35;i++)w.update(.02,1800,1800,null);assert.ok(w.particles.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));assert.ok(w.particles.some(p=>p.vy>0));for(let i=0;i<150;i++)w.update(.02,1800,1800,null);assert.equal(w.particles.length,0);
 }
 assert.equal(new Set(signatures).size,FLAT_PATTERNS.length-2);
});
