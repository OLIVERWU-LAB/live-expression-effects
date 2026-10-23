import test from 'node:test';import assert from 'node:assert/strict';
import{StickerWorld}from'../dist/effects.mjs';import{flatShell,flatTrailGeometry,FLAT_CASCADES}from'../dist/flat-fireworks.mjs';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('five white carriers split into five distinct live-centred flowers at fast-petal pace',()=>{
 for(const key of FLAT_CASCADES)for(const dt of[.008,.016,.033]){
  const w=new StickerWorld(rng(17));w.setStyle('flat');w.setEffect('laugh');w.burst(900,550,1,key);
  const seeds=w.particles.filter(p=>p.flatRole==='seed');assert.equal(seeds.length,5);assert.ok(seeds.every(p=>p.flatRole==='seed'&&p.flatEmitAt>=.19&&p.flatEmitAt<.75));
  seeds[1].x+=34;seeds[1].vx*=-1;const centres=new Set();let children=0;
  for(let i=0;i<Math.ceil(.95/dt);i++){
   const before=new Set(w.particles);w.update(dt,1800,1800,null);
   for(const p of w.particles)if(!before.has(p)&&p.cascadeChild){
    const source=seeds.find(q=>q.seed===p.emitterId);assert.ok(source);assert.equal(p.birthX,source.x);assert.equal(p.birthY,source.y);assert.ok(p.delay===0||(p.flatFine||p.flatRing||p.crownSatellite)&&p.delay<=.14);assert.ok(p.gravity>0);centres.add(source.seed);children++;
   }
  }
  assert.equal(centres.size,5);assert.ok(children>=170);assert.ok(w.particles.every(p=>p.flatRole!=='seed'));
  for(let i=0;i<150;i++)w.update(.02,1800,1800,null);assert.equal(w.particles.length,0);
 }
});
test('flat trail follows every recorded turn, tapers to zero, and ignores stale positions',()=>{
 const p={x:100,y:100,size:6,scale:1,life:1,maxLife:2,trailAge:.3,trail:[{x:99,y:99,age:.98},{x:90,y:97,age:.9},{x:80,y:86,age:.8},{x:70,y:60,age:.5}]};
 const m=flatTrailGeometry(p);assert.equal(m.points.length,4);assert.deepEqual(m.points.map(q=>[q.x,q.y]),[[0,0],[-1,-1],[-10,-3],[-20,-14]]);assert.deepEqual(m.left.at(-1),m.right.at(-1));assert.equal(m.left.length,m.points.length);
 assert.ok(Math.abs(m.left[1].x-m.right[1].x)>0);assert.equal(flatTrailGeometry({...p,trail:[]}).points.length,1);
});
test('live trailing heads accelerate downward and keep a bounded recent history',()=>{
 const w=new StickerWorld(rng(62));w.setStyle('flat');w.setEffect('laugh');w.burst(900,550,1,'flat-festival');
 for(let i=0;i<38;i++)w.update(.02,1800,1800,null);
 const p=w.particles.find(q=>q.flatRole==='ribbon'&&q.vy>0&&q.vy<40);assert.ok(p);const vy=p.vy,y=p.y;
 for(let i=0;i<6;i++)w.update(.02,1800,1800,null);assert.ok(p.y>y&&p.vy>vy);assert.ok(p.trail.length>5&&p.trail.length<=24);
 const age=p.maxLife-p.life;assert.ok(p.trail.every(q=>age-q.age<=p.trailAge+1e-6));assert.ok(p.trail.slice(1).every((q,i)=>q.age<=p.trail[i].age));
});
test('cascade flowers stay within particle budgets even with repeated overlapping launches',()=>{
 for(const limit of[150,350,700]){const w=new StickerWorld(rng(39));w.limit=limit;w.setStyle('flat');w.setEffect('laugh');
  for(let i=0;i<500;i++){if(i%75===0)w.burst(900,550,1,FLAT_CASCADES[Math.floor(i/75)%3]);w.update(.02,1800,1800,null);assert.ok(w.particles.length<=limit);assert.ok(w.particles.every(p=>Number.isFinite(p.x+p.y)));}
 }
});

test('budget reduction does not delete pending white emitters before their flowers open',()=>{
 for(const key of FLAT_CASCADES){const w=new StickerWorld(rng(71));w.limit=150;w.setStyle('flat');w.setEffect('laugh');w.burst(900,550,1,key);for(let i=0;i<55;i++)w.update(.02,1800,1800,null);assert.equal(w.events.filter(e=>e.type==='crackle'&&e.stage===2).length,5);assert.ok(w.particles.length<=150);}
});
