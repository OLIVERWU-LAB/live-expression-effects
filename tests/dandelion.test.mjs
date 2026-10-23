import test from 'node:test';import assert from 'node:assert/strict';
import{StickerWorld}from'../dist/effects.mjs';import{COLOR_PAIRS,stickerBurstEnvelope}from'../dist/dandelion.mjs';import{emissionColor}from'../dist/emission.mjs';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const flowerTypes=['chrysanthemum','willow','heart','chrysanthemum-double','chrysanthemum-inner'];
test('01 and 03 share the exact paper shape, trajectory, pattern rotation and timing',()=>{
 for(const pattern of flowerTypes){const worlds=['sticker','coherent'].map(style=>{const w=new StickerWorld(rng(21));w.setStyle(style);w.setEffect('laugh');w.burst(900,200,.8,pattern);return w;});
  assert.ok(worlds.every(w=>w.particles.every(p=>['star','confetti'].includes(p.type)&&!p.dot)));
  const geometry=w=>w.particles.map(({tint,roundColors,fireworkStage,...p})=>p);
  assert.deepEqual(geometry(worlds[0]),geometry(worlds[1]));
  for(let i=0;i<100;i++)for(const w of worlds)w.update(.02,1800,1600,null);
  assert.deepEqual(geometry(worlds[0]),geometry(worlds[1]));
 }
 const a=new StickerWorld(rng(99)),b=new StickerWorld(rng(99));b.setStyle('coherent');for(let i=0;i<45;i++){const p=a.nextPattern(),q=b.nextPattern();assert.equal(p,q);assert.notEqual(p,'orbit');a.lastPattern=p;b.lastPattern=q;}
});
test('03 paints each round with one curated colour; later dot trails inherit the second colour',()=>{
 for(const pattern of flowerTypes)for(let seed=0;seed<5;seed++){
  const w=new StickerWorld(rng(seed));w.setStyle('coherent');w.setEffect('laugh');w.burst(900,300,.7,pattern);const pair=w.particles[0].roundColors;
  assert.ok(COLOR_PAIRS.some(p=>p.join()===pair.join()));assert.ok(w.particles.every(p=>p.tint===pair[0]));assert.equal(w.blooms[0].tint,pair[0]);let later=false;
  for(let i=0;i<350;i++){w.update(.02,1800,1600,null);for(const p of w.particles){assert.equal(p.tint,p.fireworkStage===1?pair[0]:pair[1]);assert.equal(emissionColor(p,false),p.tint);if(p.secondary){later=true;assert.ok(p.dot);}}
   assert.ok(w.blooms.every(b=>b.tint===(b.secondary?pair[1]:pair[0])));assert.ok(w.particles.length<=700&&w.blooms.length<=80);
  }
  if(['willow','chrysanthemum-double','chrysanthemum-inner'].includes(pattern))assert.ok(later);assert.equal(w.particles.length,0);assert.equal(w.blooms.length,0);
 }
});
test('every paper explosion including four-way and final flowers produces the shared burst motif',()=>{
 for(const style of['sticker','coherent'])for(const pattern of['crossette','bouquet']){const w=new StickerWorld(rng(71));w.setStyle(style);w.setEffect('laugh');w.burst(900,300,.7,pattern);let stages=0;
  for(let i=0;i<230;i++){w.update(.02,1800,1600,null);for(const e of w.consumeEvents())if(e.type==='crackle'){stages++;assert.ok(w.blooms.some(b=>b.secondary&&b.age<.08));}}
  assert.ok(stages>0);
 }
});
test('comic burst snaps open, holds briefly, then collapses completely in 300ms',()=>{
 for(const life of[.7,.9]){const at=t=>stickerBurstEnvelope(t,life);assert.ok(at(.06).scale>at(.01).scale*2);assert.ok(at(.16).scale>1.1);assert.ok(at(.26).scale<at(.16).scale*.25);assert.ok(at(.14).alpha>.99);assert.equal(at(.30).scale,0);assert.equal(at(.30).alpha,0);assert.equal(at(.5).alpha,0);for(let i=0;i<300;i++){const a=at(i/1000),b=at((i+1)/1000);assert.ok(Math.abs(a.scale-b.scale)<.08);assert.ok(a.alpha>=0&&a.alpha<=1);}}
});
test('paper rain has no glass beads or rivulets while airborne drops and accumulation remain',()=>{
 for(const style of['sticker','coherent']){const w=new StickerWorld(rng(17));w.setStyle(style);w.setEffect('smile');let rain=false;for(let i=0;i<600;i++){w.rain(.016,390,640,.3);w.update(.016,390,640,null);rain ||=w.particles.some(p=>p.type==='drop');assert.equal(w.lens.drops.length,0);assert.equal(w.lens.trails.length,0);}assert.ok(rain&&w.water.level>0);}
 const w=new StickerWorld(rng(17));w.setStyle('cinema');w.setEffect('smile');for(let i=0;i<300;i++)w.update(.02,390,640,null);assert.equal(w.lens.drops.length,0);w.setStyle('coherent');assert.equal(w.lens.drops.length,0);
});
test('legacy colour variant selection migrates to the shared paper version',()=>{for(const style of['bloom','dandelion']){const w=new StickerWorld(rng(5));w.setStyle(style);assert.equal(w.style,'coherent');w.setPattern('heart');w.setEffect('laugh');w.burst(500,170);assert.equal(w.lastPattern,'heart');assert.ok(w.particles.every(p=>p.type==='star'||p.type==='confetti'));}});
