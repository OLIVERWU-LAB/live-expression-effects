import test from 'node:test';import assert from 'node:assert/strict';import{poppingFlower,innerCrownParticles}from'../dist/bouquet.mjs';import{StickerWorld}from'../dist/effects.mjs';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const parent={x:900,y:200,vx:0,vy:0,scale:1,variant:0,roundColors:['#F2C765','#73CBE8'],pattern:'chrysanthemum-inner'};
test('new descending flowers spread over three times faster than the previous mini flower, preserving finite dot trails',()=>{
 const old=poppingFlower(parent,rng(10),{stars:18,sparks:8,mini:true}),next=poppingFlower(parent,rng(10),{stars:18,sparks:8,mini:true,spread:3.3,lifeScale:1.25});
 for(let i=0;i<18;i++){assert.ok(Math.hypot(next[i].vx,next[i].vy)>Math.hypot(old[i].vx,old[i].vy)*3.2);assert.ok(next[i].tailLength>=28);assert.ok(next[i].dot&&!next[i].carrier&&!next[i].flowerCarrier);}
 const w=new StickerWorld(rng(8));w.setEffect('laugh');w.particles=next;for(let i=0;i<30;i++)w.update(.02,1800,1600,null);const radii=w.particles.filter(p=>!p.micro).map(p=>Math.hypot(p.x-parent.x,p.y-parent.y)).sort((a,b)=>a-b);assert.ok(radii[Math.floor(radii.length*.7)]>95);
});
test('inner crown covers every direction and has a clear round silhouette population and long tails',()=>{
 const p=innerCrownParticles(parent,rng(20)),sectors=new Set(p.map(p=>Math.floor((Math.atan2(p.vy,p.vx)+Math.PI)/(Math.PI*2)*12)%12));assert.equal(sectors.size,12);assert.ok(p.filter(p=>Math.hypot(p.vx,p.vy)>190).length>=70);assert.ok(p.every(p=>p.secondary===1&&p.dot&&p.tailLength===34&&p.tint==='#73CBE8'));
 const xs=p.map(p=>p.vx),ys=p.map(p=>p.vy),ratio=(Math.max(...xs)-Math.min(...xs))/(Math.max(...ys)-Math.min(...ys));assert.ok(ratio>.9&&ratio<1.1);
 const w=new StickerWorld(rng(2));w.setEffect('laugh');w.particles=p;for(let i=0;i<30;i++)w.update(.02,1800,1600,null);assert.ok(Math.max(...w.particles.map(p=>Math.hypot(p.x-parent.x,p.y-parent.y)))>160);
});
