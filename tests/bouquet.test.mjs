import test from 'node:test';import assert from 'node:assert/strict';
import{StickerWorld}from'../dist/effects.mjs';import{bouquetShell,poppingFlower}from'../dist/bouquet.mjs';
const randomSeed=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('paper bouquet has a coloured opening, falling tailed carriers, staggered flowers and finite crackling stars',()=>{
 const w=new StickerWorld(randomSeed(52));w.setStyle('sticker');w.setPattern('bouquet');w.setEffect('laugh');w.burst(380,130,.8);assert.equal(w.lastPattern,'bouquet');assert.equal(new Set(w.particles.map(p=>p.variant)).size,5);assert.equal(w.particles.filter(p=>p.carrier).length,11);
 let tailedFall=false,secondaries=false,micro=false;const pops=[];
 for(let i=0;i<240;i++){
  const before=w.particles.filter(p=>p.carrier&&p.splitAt);
  w.update(.02,900,1000,null);tailedFall ||= w.particles.some(p=>p.carrier&&p.vy>0&&p.trail.length>4);secondaries ||= w.particles.some(p=>p.secondary===1);micro ||= w.particles.some(p=>p.micro);
  for(const e of w.consumeEvents())if(e.type==='crackle'){pops.push(i*.02);assert.ok(before.some(p=>p.life<=0&&p.vy>22));}
  assert.ok(w.particles.length<=700&&w.blooms.length<=80&&w.afterglows.length<=150);assert.ok(w.particles.every(p=>[p.x,p.y,p.vx,p.vy,p.life].every(Number.isFinite)&&(!p.trail||p.trail.length<=28)));
 }
 assert.ok(tailedFall&&secondaries&&micro);assert.ok(pops.length>=6);assert.ok(Math.max(...pops)-Math.min(...pops)>.3);assert.ok(Math.min(...pops)>.8);
 for(let i=0;i<250;i++)w.update(.02,900,1000,null);assert.equal(w.particles.length,0);assert.equal(w.blooms.length,0);assert.equal(w.afterglows.length,0);
});
test('secondary stars never recursively explode and retain a smaller scale with irregular ignition',()=>{const parent=bouquetShell(300,100,1,randomSeed(3)).particles[0],children=poppingFlower(parent,randomSeed(4));assert.equal(children.length,33);assert.ok(children.every(p=>!p.splitAt&&!p.carrier));assert.equal(children.filter(p=>p.micro).length,19);assert.ok(Math.max(...children.map(p=>p.delay))>.25);assert.equal(new Set(children.map(p=>p.variant)).size,5);});
test('secondary flower centres respect the expanded head guard',()=>{const w=new StickerWorld(randomSeed(71));w.setStyle('sticker');w.setPattern('bouquet');w.setEffect('laugh');w.head={left:0,right:900,top:0,bottom:1000};w.burst(450,150,.8);w.consumeEvents();for(let i=0;i<250;i++){w.update(.02,900,1000,null);assert.ok(w.blooms.every(b=>!b.secondary));assert.ok(w.consumeEvents().every(e=>e.type!=='crackle'));}});
test('bouquet effect and mode switches cancel every pending flower and preserve the single expression state',()=>{for(const next of ['dandelion','cinema','smile']){const w=new StickerWorld(randomSeed(2));w.setStyle('sticker');w.setPattern('bouquet');w.setEffect('laugh');w.launch(250,110,900,1000);w.burst(450,130,.8);if(next==='smile')w.setEffect(next);else w.setStyle(next);for(let i=0;i<200;i++)w.update(.02,900,1000,null);assert.equal(w.particles.length,0);assert.equal(w.blooms.length,0);assert.equal(w.rockets.length,0);assert.equal(w.consumeEvents().length,0);assert.equal(w.effect,next==='smile'?'smile':'laugh');}});
