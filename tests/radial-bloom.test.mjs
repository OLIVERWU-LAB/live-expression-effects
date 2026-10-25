import test from'node:test';import assert from'node:assert/strict';import{flatChildren,flatShell,ACTIVE_FLAT_PATTERNS}from'../dist/flat-fireworks.mjs';import{flatFlowerSites,flatRandom}from'../dist/flat-placement.mjs';
test('carrier inertia cannot sweep a complete secondary flower into one direction',()=>{
 for(const scale of[.22,.5,1.2])for(let seed=0;seed<15;seed++)for(const pattern of ACTIVE_FLAT_PATTERNS){
  const carriers=flatShell(200,150,scale,flatRandom(seed),pattern).particles,sites=flatFlowerSites(scale,seed);
  for(let i=0;i<carriers.length;i++){
   const parent={...carriers[i],vx:sites[i].vx,vy:sites[i].vy},localScale=scale*.78*parent.flowerScale,children=flatChildren(parent,flatRandom(51)),still=flatChildren({...parent,vx:0,vy:0},flatRandom(51));assert.equal(children.length,still.length);
   const drift={x:children[0].vx-still[0].vx,y:children[0].vy-still[0].vy};assert.ok(Math.hypot(drift.x,drift.y)<=22*localScale+1e-8);assert.ok(Math.hypot(drift.x,drift.y)<=Math.hypot(parent.vx,parent.vy)*.12+1e-8);
   children.forEach((p,j)=>{const q=still[j];assert.ok(Math.abs(p.vx-q.vx-drift.x)<1e-8);assert.ok(Math.abs(p.vy-q.vy-drift.y)<1e-8);for(const key of['x','y','birthX','birthY','size','life','maxLife','tint','delay','flatRole','trailAge','tailLength'])assert.equal(p[key],q[key]);});
   const rays=children.filter(p=>p.flatBand===0||p.flatBand===1);assert.ok(rays.some(p=>p.vx>0)&&rays.some(p=>p.vx<0)&&rays.some(p=>p.vy>0)&&rays.some(p=>p.vy<0));
   const sectors=new Set(rays.map(p=>Math.floor((Math.atan2(p.vy,p.vx)+Math.PI)/(Math.PI/2))));assert.equal(sectors.size,4);
  }
 }
});
test('even an unusually fast carrier produces bounded drift and leaves every flower at its real birth point',()=>{for(const pattern of ACTIVE_FLAT_PATTERNS){const p=flatShell(150,220,.6,flatRandom(8),pattern).particles[2],children=flatChildren({...p,vx:5000,vy:-4000},flatRandom(9)),localScale=.6*.78*p.flowerScale,stationary=flatChildren({...p,vx:0,vy:0},flatRandom(9));for(let i=0;i<children.length;i++){const child=children[i],q=stationary[i];assert.ok(Math.hypot(child.vx-q.vx,child.vy-q.vy)<=22*localScale+1e-8);assert.equal(child.birthX,150);assert.equal(child.birthY,220);}}});
