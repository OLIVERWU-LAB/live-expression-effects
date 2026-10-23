import test from 'node:test';
import assert from 'node:assert/strict';
import { fragmentDrops, LensRain, StickerWorld, fireworkEnvelope } from '../dist/effects.mjs';
let seed=17;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('fragment sizes vary continuously while preserving a bounded volume budget',()=>{
 const sizes=[];
 for(let i=0;i<400;i++){
  const parent={x:40,y:60,vx:0,vy:-300,impactVX:20,impactVY:420,hitNormal:{x:0,y:-1},size:24,volume:24**3};
  const parts=fragmentDrops(parent,random);assert.ok(parts.length>=2&&parts.length<=4);
  const volume=parts.reduce((n,p)=>n+p.size**3,0);assert.ok(volume<=parent.volume*.75&&volume>=parent.volume*.61);
  for(const p of parts){assert.ok(p.vy<0);assert.ok(p.size<parent.size);assert.ok(p.generation===1);sizes.push(p.size/parent.size);}
 }
 assert.ok(Math.max(...sizes)-Math.min(...sizes)>.3);assert.ok(sizes.reduce((a,b)=>a+b)/sizes.length>.5);
});
test('legacy lens state is cleared without producing screen beads or trails',()=>{
 const lens=new LensRain(random);lens.drops=[{x:60,y:50,radius:4}];lens.trails=[{points:[{x:0,y:0},{x:1,y:1}]}];lens.update(.01,300,400,true);assert.equal(lens.drops.length,0);assert.equal(lens.trails.length,0);
});
test('lens simulation stays bounded, and a fireworks transition clears all rain layers',()=>{
 const w=new StickerWorld(random);w.setStyle('cinema');w.setEffect('smile');
 for(let i=0;i<4000;i++){w.rain(.016,1000,800,.5);w.update(.016,1000,800,null);assert.ok(w.lens.drops.length<=28);assert.ok(w.lens.trails.length<=80);assert.ok(w.particles.length<=w.limit);}
 assert.equal(w.lens.drops.length,0);w.setEffect('laugh');assert.equal(w.lens.drops.length,0);assert.equal(w.lens.trails.length,0);assert.equal(w.water.level,0);
});
test('emitted particles shrink and lose light before they expire',()=>{
 const p={life:2,maxLife:2},a=fireworkEnvelope(p);p.life=1;const b=fireworkEnvelope(p);p.life=.1;const c=fireworkEnvelope(p);
 assert.ok(a.size>b.size&&b.size>c.size);assert.ok(b.light>c.light);p.life=0;assert.equal(fireworkEnvelope(p).light,0);
});
test('switching visual versions clears incompatible sprites without changing expression',()=>{
 const w=new StickerWorld(random);w.setEffect('laugh');w.burst(100,100);w.setStyle('cinema');assert.equal(w.effect,'laugh');assert.equal(w.particles.length,0);w.burst(100,100);assert.ok(w.particles.every(p=>p.type==='ember'));w.setStyle('sticker');w.burst(100,100);assert.ok(w.particles.every(p=>p.type==='star'||p.type==='confetti'||p.flatFx));
});
