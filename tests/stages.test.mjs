import test from 'node:test';import assert from 'node:assert/strict';
import{StickerWorld}from'../dist/effects.mjs';import{cinemaShell,giftShell,CINEMA_PATTERNS}from'../dist/reference-bursts.mjs';import{flatShell,flatEnvelope,FLAT_PATTERN}from'../dist/flat-fireworks.mjs';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const world=(style,key)=>{const w=new StickerWorld(rng(52));w.setStyle(style);w.setEffect('laugh');w.burst(900,350,1,key);return w;};
test('gift pieces no longer transform spontaneously during their falling phase',()=>{const w=world('gift','gift-twinkle'),originals=[...w.particles];for(let i=0;i<70;i++)w.update(.02,1800,1800,null);assert.ok(originals.every(p=>w.particles.includes(p)));assert.ok(w.particles.every(p=>!p.secondary));assert.equal(w.events.filter(e=>e.stage===2).length,0);});
test('the new gift completes its opening sooner and gains downward speed after its apex',()=>{
 const w=world('gift','gift-scatter'),p=w.particles[1];const sample=[];for(let i=0;i<80;i++){w.update(.02,1800,1800,null);if([24,49,74].includes(i))sample.push({y:p.y,vy:p.vy});}
 assert.ok(sample[1].vy>sample[0].vy+150);assert.ok(sample[2].y-sample[1].y>sample[1].y-sample[0].y);assert.ok(sample[2].vy>sample[1].vy);
});
test('cinema strobe stars start after the rays, fill the sphere and outlive all long streaks',()=>{
 const {particles}=cinemaShell('cinema-shell',900,350,1,rng(1)),dust=particles.filter(p=>p.snowStar),rays=particles.filter(p=>!p.cinemaDust&&!p.innerRay);assert.equal(dust.length,192);assert.ok(rays.length>=80);assert.ok(Math.min(...dust.map(p=>p.delay))>Math.max(...rays.map(p=>p.delay))+.1);
 const quadrants=new Set(dust.map(p=>(p.vx>0?'R':'L')+(p.vy>0?'D':'U')));assert.equal(quadrants.size,4);
 const w=world('cinema','cinema-shell');for(let i=0;i<118;i++)w.update(.02,1800,1800,null);assert.equal(w.particles.filter(p=>!p.cinemaDust).length,0);assert.ok(w.particles.filter(p=>p.snowStar&&p.life>.3).length>100);assert.equal(w.innerBursts.length,0);assert.deepEqual(CINEMA_PATTERNS,['cinema-shell','cinema-rings']);
});
test('eleven reprises keep ordered but unequal angles while their first-wave rays remain alive',()=>{
 const w=world('cinema','cinema-rings'),parents=w.particles.filter(p=>p.ringCarrier),angles=parents.map(p=>p.carrierAngle);assert.equal(parents.length,11);
 const gaps=angles.slice(1).map((a,i)=>a-angles[i]);assert.ok(gaps.every(g=>g>0));assert.ok(Math.max(...gaps)/Math.min(...gaps)>1.8);
 for(let i=0;i<64;i++)w.update(.02,1800,1800,null);const groups=new Set(w.particles.filter(p=>p.ringBlob).map(p=>p.ringGroup));assert.equal(groups.size,11);assert.ok(parents.every(p=>p.life>0&&w.particles.includes(p)));assert.ok(w.particles.filter(p=>p.ringBlob).every(p=>p.size<=6.6));
});
test('flat particles keep their style and finish the short handoff before rain resumes',()=>{
 const w=world('flat',FLAT_PATTERN);assert.equal(w.particles.filter(p=>p.flatRole==='seed').length,5);assert.ok(w.particles.every(p=>p.flatFx));w.requestEffect('smile');w.update(.02,1800,1800,null);assert.equal(w.effect,'laugh');assert.ok(w.particles.length>0);for(let i=0;i<12;i++)w.update(.02,1800,1800,null);assert.equal(w.effect,'smile');assert.equal(w.particles.length,0);
 w.setPattern(FLAT_PATTERN);w.setStyle('cinema');assert.equal(w.pattern,'auto');
});
