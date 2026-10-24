import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import{flatShell,flatChildren,ACTIVE_FLAT_PATTERNS}from'../dist/flat-fireworks.mjs';import{giftShell,GIFT_ASSETS}from'../dist/reference-bursts.mjs';import{StickerWorld}from'../dist/effects.mjs';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('every flat bouquet gives its five flowers different but coordinated colourways',()=>{for(const key of ACTIVE_FLAT_PATTERNS.filter(k=>k!=='flat-reprise')){const seeds=flatShell(1200,500,1,rng(31),key).particles;assert.equal(new Set(seeds.map(p=>p.variant)).size,5);const signatures=seeds.map(p=>{const children=flatChildren(p,rng(5));return [...new Set(children.map(p=>p.tint))].sort().join();});assert.equal(new Set(signatures).size,5);}});
test('gift scattering varies with bounded lobe presets without changing gravity or first-wave size',()=>{
 const shells=Array.from({length:12},(_,seed)=>giftShell('gift-scatter',900,350,1,rng(seed)).particles);assert.ok(new Set(shells.map(p=>p[0].layoutPreset)).size>=3);
 for(const p of shells){assert.equal(p.length,41);assert.ok(p.every(q=>q.gravity===255&&q.giftSplitAt===null&&q.delay<=.045));}
 const deviations=shells.map(p=>p[6].vx);assert.ok(Math.max(...deviations)-Math.min(...deviations)>20);const a=giftShell('gift-scatter',900,350,1,rng(3)).particles,b=giftShell('gift-twinkle',900,350,1,rng(3)).particles;assert.ok(a.some((p,i)=>Math.abs(p.vx-b[i].vx)>4));
});
test('even stale gift timer data cannot trigger an airborne split',()=>{const w=new StickerWorld(rng(2));w.setStyle('gift');w.setEffect('laugh');w.burst(900,350,1,'gift-twinkle');for(const p of w.particles)p.giftSplitAt=.1;for(let i=0;i<100;i++)w.update(.02,1800,1800,null);assert.ok(w.particles.every(p=>!p.secondary));assert.equal(w.events.filter(e=>e.stage===2).length,0);});
