import test from 'node:test';import assert from 'node:assert/strict';
import {StickerWorld} from '../dist/effects.mjs';
import {LIVE_STYLES,liveStyle,applyLiveStyle,lockedState} from '../dist/live-playback.mjs';
import {ACTIVE_FLAT_PATTERNS,flatOpening,flatOpeningGlint} from '../dist/flat-fireworks.mjs';
const rng=s=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
test('live style migration admits only three styles and fixes cinema to refined across switches',()=>{
 assert.deepEqual(LIVE_STYLES,['cinema','gift','flat']);
 for(const saved of ['glow','coherent','sticker',null,'garbage'])assert.equal(liveStyle(saved),'cinema');
 const w=new StickerWorld(rng(31));
 for(let i=0;i<3;i++)for(const style of LIVE_STYLES){applyLiveStyle(w,style);const keys=Array.from({length:12},()=>w.nextPattern());if(style==='flat')assert.deepEqual([...new Set(keys)].sort(),[...ACTIVE_FLAT_PATTERNS].sort());else assert.ok(keys.every(k=>k===(style==='cinema'?'cinema-refined':'gift-twinkle')));}
});
test('locked rain and fireworks override every expression and release returns to actual expression',()=>{
 for(const style of LIVE_STYLES){const w=new StickerWorld(rng(3));applyLiveStyle(w,style);for(const expression of ['neutral','smile','laugh']){
  w.setEffect(lockedState(expression,'rain','camera'));w.rain(.05,1000,800,.35);w.update(.016,1000,800,null);assert.equal(w.effect,'smile');assert.ok(w.particles.some(p=>p.type==='drop'));
  w.clear();w.setEffect(lockedState(expression,'fireworks','camera'));assert.ok(w.launch(500,200,1000,800));assert.equal(w.effect,'laugh');w.clear();
  assert.equal(lockedState(expression,null,'camera'),expression);assert.equal(lockedState(expression,'rain','idle'),expression);
 }}
});
test('initial glints stay compact, vary spatially and blink independently; opening petals are fuller',()=>{
 for(const key of ACTIVE_FLAT_PATTERNS){const ps=flatOpening(500,300,1,0,rng(11),key),glints=ps.filter(p=>p.openingGlint),petals=ps.filter(p=>p.flatRole==='petal');assert.equal(glints.length,10);assert.ok(petals.every(p=>p.size>=7.8));
  assert.ok(glints.every(p=>Math.hypot(p.vx,p.vy)<350&&p.size<=6.875&&p.tint==='#FFFFFF'));
  const alpha=glints.map(p=>flatOpeningGlint(.14,p));assert.ok(Math.max(...alpha)-Math.min(...alpha)>.5);
  const speeds=glints.map(p=>Math.hypot(p.vx,p.vy));assert.ok(Math.max(...speeds)-Math.min(...speeds)>45);
  for(const p of glints){const samples=Array.from({length:40},(_,i)=>flatOpeningGlint(i*.01,p));assert.ok(Math.max(...samples)>.9&&Math.min(...samples)<.22);}
  const w=new StickerWorld(rng(4));w.setStyle('flat');w.setEffect('laugh');ps.forEach(p=>w.add(p));for(let i=0;i<45;i++){w.update(.01,1600,1000,null);for(const p of w.particles.filter(p=>p.openingGlint))assert.ok(Math.hypot(p.x-500,p.y-300)<82);}
 }
});
test('live delivery includes both random gift banks and inference dependencies without historical QA pages',async()=>{
 const {liveFiles}=await import('../tools/live-files.mjs'),files=liveFiles();
 for(const p of ['app.mjs','live-playback.mjs','vision.worker.js','vision-config.js','vendor/compressed/face_landmarker.task.gz','vendor/compressed/hand_landmarker.task.gz','assets/favicon.svg'])assert.ok(files.includes(p),p);
 assert.ok(files.some(p=>p==='assets/gift-v70/candy-bank.webp'));assert.ok(files.some(p=>p==='assets/gift-v70/soft-candy-bank.webp'));
 assert.ok(!files.some(p=>p.startsWith('qa/')||p.includes('gift-v20/')||p.includes('gift-v21/')||p.includes('gift-v35/')));
});
