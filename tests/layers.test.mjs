import test from 'node:test';import assert from 'node:assert/strict';
import {StickerWorld} from '../dist/effects.mjs';import{cinemaShell}from'../dist/reference-bursts.mjs';import{flatShell,flatChildren,ACTIVE_FLAT_PATTERNS}from'../dist/flat-fireworks.mjs';import{fireworkLights}from'../dist/lighting.mjs';
const rng=s=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
test('inner corolla opens later, remains inside outer rays, and preserves the 366 particle budget',()=>{
 const p=cinemaShell('cinema-shell',0,0,1,rng(4)).particles,outer=p.filter(p=>!p.cinemaDust&&!p.innerRay&&!p.filament),inner=p.filter(p=>p.innerRay);assert.equal(p.length,366);assert.equal(inner.length,48);assert.ok(Math.min(...inner.map(p=>p.delay))>Math.max(...outer.map(p=>p.delay))+.12);
 const w=new StickerWorld(rng(4));w.setStyle('cinema');w.setEffect('laugh');w.burst(600,400,1,'cinema-shell');for(let i=0;i<55;i++)w.update(.01,1400,1400,null);
 const radius=ps=>ps.reduce((a,p)=>a+Math.hypot(p.x-600,p.y-400),0)/ps.length;assert.ok(radius(w.particles.filter(p=>p.innerRay))<radius(w.particles.filter(p=>!p.cinemaDust&&!p.innerRay))*.7);assert.ok(w.particles.some(p=>p.innerRay&&p.trail.length>4));
});
test('all four flat flowers contain late expanding rings and interleaved white flashes',()=>{
 for(const key of ACTIVE_FLAT_PATTERNS.filter(k=>k!=='flat-reprise')){const seeds=flatShell(300,200,1,rng(8),key).particles;let children=flatChildren(seeds[0],rng(9));if(key==='flat-petals')children.push(...flatChildren(children.find(p=>p.flatRole==='core'),rng(10)));assert.ok(children.some(p=>p.flatRole==='ring'));assert.ok(children.filter(p=>p.whiteFlash).length>=10);assert.ok(children.filter(p=>p.whiteFlash).every(p=>p.tint==='#FFFFFF'));}
});
test('fifth style retains safe launches, inner and outer shells, collisions, lighting and bounded lifetime',()=>{
 const w=new StickerWorld(rng(9));w.setStyle('glow');w.setEffect('laugh');w.setPattern('cinema-rings');assert.equal(w.style,'glow');assert.equal(w.pattern,'cinema-rings');w.burst(600,250,1,w.pattern);let lit=false,secondary=false;for(let i=0;i<400;i++){w.update(.02,1600,1600,null);lit ||=fireworkLights(w).some(l=>l.energy>.1);secondary ||=w.particles.some(p=>p.ringBlob);assert.ok(w.particles.length<=700);}assert.ok(lit&&secondary);assert.equal(w.particles.length,0);w.setStyle('gift');assert.equal(w.pattern,'auto');
});
