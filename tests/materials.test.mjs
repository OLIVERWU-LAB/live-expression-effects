import test from 'node:test';import assert from 'node:assert/strict';
import{StickerWorld}from'../dist/effects.mjs';import{cinemaShell,giftShell,giftBeadChildren,CINEMA_PAIRS}from'../dist/reference-bursts.mjs';import{flatShell,FLAT_PATTERNS,drawFlatFireworks}from'../dist/flat-fireworks.mjs';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const saturation=hex=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);return(Math.max(...c)-Math.min(...c))/Math.max(...c);};
test('every curated inner hue has stronger saturation than its soft outer rays',()=>{for(const[outer,inner]of CINEMA_PAIRS)assert.ok(saturation(inner)>saturation(outer)+.15);for(let seed=0;seed<20;seed++){const p=cinemaShell('cinema-shell',500,300,1,rng(seed)).particles;assert.ok(saturation(p.find(p=>p.snowStar).tint)>saturation(p[0].tint));}});
test('secondary centres follow the actual first-wave carriers with bounded uneven spacing and one shared colour',()=>{
 const p=cinemaShell('cinema-rings',900,400,1,rng(8)).particles.filter(p=>p.ringCarrier);assert.equal(new Set(p.map(p=>p.ringColor)).size,1);assert.equal(p.length,11);const gaps=p.slice(1).map((q,i)=>q.carrierAngle-p[i].carrierAngle);assert.ok(Math.max(...gaps)-Math.min(...gaps)>.06);assert.ok(gaps.every(x=>x>0&&x<2));assert.ok(Math.max(...gaps)/Math.min(...gaps)>1.8);const speeds=p.map(p=>Math.hypot(p.vx,p.vy+9));assert.ok(Math.max(...speeds)-Math.min(...speeds)>30);
});
test('second-round beads survive the entire first shell and continue accelerating downwards',()=>{
 const w=new StickerWorld(rng(10));w.setStyle('cinema');w.setEffect('laugh');w.burst(900,350,1,'cinema-rings');for(let i=0;i<166;i++)w.update(.02,1800,1800,null);assert.equal(w.particles.filter(p=>!p.secondary).length,0);const s=w.particles.filter(p=>p.ringBlob);assert.ok(s.length>30);assert.equal(new Set(s.map(p=>p.tint)).size,1);assert.ok(s.every(p=>p.vy>0));const p=s.filter(p=>p.life>.15).sort((a,b)=>a.vy-b.vy)[0],y=p.y,vy=p.vy;w.update(.05,1800,1800,null);assert.ok(p.y>y&&p.vy>vy);
});
test('gift bead size is restored while primary layout remains eleveny percent of v23',()=>{const p=giftShell('gift-twinkle',500,300,1,rng(1)).particles;const s=giftBeadChildren(p[0],rng(8));assert.ok(s.every(p=>p.size>=5&&p.size<=11.2));assert.equal(p.length,41);});
test('fourth style has distinct fast/slow timings and each petal is independently ballistic',()=>{
 const a=flatShell(900,350,1,rng(23),FLAT_PATTERNS[0]).particles,b=flatShell(900,350,1,rng(23),FLAT_PATTERNS[1]).particles;assert.equal(a.length,b.length);assert.ok(Math.max(...b.map(p=>p.life+p.delay))>Math.max(...a.map(p=>p.life+p.delay))*1.6);
 for(const key of FLAT_PATTERNS.slice(0,2)){const w=new StickerWorld(rng(23));w.setStyle('flat');w.setPattern(key);w.setEffect('laugh');w.burst(900,350,1,key);for(let i=0;i<40;i++)w.update(.02,1800,1800,null);const p=w.particles.find(p=>p.flatRole==='petal'&&p.vy>0);assert.ok(p);const vy=p.vy,y=p.y;for(let i=0;i<10;i++)w.update(.02,1800,1800,null);assert.ok(p.y>y);assert.ok(p.gravity>0);assert.ok(w.particles.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));}
 const w=new StickerWorld(rng(3));w.setStyle('flat');assert.ok(FLAT_PATTERNS.includes(w.nextPattern()));w.setPattern(FLAT_PATTERNS[1]);w.setStyle('sticker');assert.equal(w.pattern,'auto');for(let i=0;i<20;i++)assert.ok(!FLAT_PATTERNS.includes(w.nextPattern()));
});
test('late flat rings draw the full closed perimeter; no disappearing half or angular wipe',()=>{
 const w=new StickerWorld(rng(2));w.setStyle('flat');w.setEffect('laugh');w.burst(300,200,1,'flat-petals');for(let i=0;i<60;i++)w.update(.01,1200,1200,null);const p=w.particles.find(p=>p.flatRole==='ring');assert.ok(p);p.delay=0;p.life=p.maxLife-1.1*p.tempo;const points=[];let closed=0;const ctx=new Proxy({moveTo(x,y){points.push([x,y]);},lineTo(x,y){points.push([x,y]);},closePath(){closed++;}},{get(o,k){return k in o?o[k]:(()=>{});},set(o,k,v){o[k]=v;return true;}});drawFlatFireworks(ctx,{particles:[p]});assert.equal(closed,1);assert.ok(points.length>=40);for(const quadrant of[0,1,2,3])assert.ok(points.some(([x,y])=>((x>=0?0:1)+(y>=0?0:2))===quadrant));assert.ok(Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])<1e-6);
});
test('cinema at the faster 1.5-second cadence keeps a finite budget and never swallows a launch',()=>{
 const w=new StickerWorld(rng(91));w.setStyle('cinema');w.setPattern('cinema-rings');w.setEffect('laugh');let launched=0,burst=0,tailSeen=false;
 for(let i=0;i<2000;i++){if(i%75===0){assert.ok(w.launch(900,300,1800,1800));launched++;}w.update(.02,1800,1800,null);burst+=w.consumeEvents().filter(e=>e.type==='burst').length;assert.ok(w.particles.length<=700);tailSeen ||= w.particles.some(p=>p.secondary&&p.maxLife-p.life>2.2);}
 for(let i=0;i<300;i++){w.update(.02,1800,1800,null);burst+=w.consumeEvents().filter(e=>e.type==='burst').length;}assert.equal(burst,launched);assert.ok(tailSeen);assert.equal(w.particles.length,0);
});
