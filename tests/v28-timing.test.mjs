import test from 'node:test';import assert from 'node:assert/strict';
import{StickerWorld}from'../dist/effects.mjs';import{ACTIVE_FLAT_PATTERNS}from'../dist/flat-fireworks.mjs';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('flat automatic rotation contains only the four retained designs',()=>{
 const w=new StickerWorld(rng(8));w.setStyle('flat');assert.equal(ACTIVE_FLAT_PATTERNS.length,4);const seen=new Set();for(let i=0;i<40;i++){const key=w.nextPattern();assert.ok(ACTIVE_FLAT_PATTERNS.includes(key));seen.add(key);w.lastPattern=key;}assert.equal(seen.size,4);
});
test('flat flowers open in distinct staggered beats and their falling tail survives beyond two seconds',()=>{
 for(const key of ACTIVE_FLAT_PATTERNS.filter(k=>k!=='flat-reprise')){const w=new StickerWorld(rng(34));w.setStyle('flat');w.setEffect('laugh');w.burst(1500,800,1,key);const times=[];
  for(let i=1;i<=210;i++){w.update(.01,3000,3000,null);for(const e of w.consumeEvents())if(e.type==='crackle'&&e.stage===2)times.push(i*.01);}
  assert.equal(times.length,5);assert.ok(times[0]>=.21&&times[0]<.33);assert.ok(times.at(-1)-times[0]>.25);assert.ok(times.slice(1).every((t,i)=>t-times[i]>.06));assert.ok(w.particles.some(p=>p.life>.05&&p.vy>0));
  for(let i=0;i<230;i++)w.update(.01,3000,3000,null);assert.equal(w.particles.length,0);
 }
});
