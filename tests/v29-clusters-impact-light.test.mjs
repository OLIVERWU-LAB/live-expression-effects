import test from 'node:test';import assert from 'node:assert/strict';
import{StickerWorld}from'../dist/effects.mjs';import{flatShell,flatChildren,FLAT_CASCADES}from'../dist/flat-fireworks.mjs';import{giftShell,cinemaShell}from'../dist/reference-bursts.mjs';import{fireworkLights}from'../dist/lighting.mjs';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('three or four staggered flowers have consistent scales and fine particles at least four times smaller than their large pieces',()=>{
 for(const key of FLAT_CASCADES){const seeds=flatShell(1200,600,1,rng(42),key).particles;assert.ok(seeds.length===3||seeds.length===4);assert.ok(seeds.at(-1).flatEmitAt-seeds[0].flatEmitAt>.30);const sizes=[];
  for(const p of seeds){const children=flatChildren(p,rng(8)),fine=children.filter(p=>p.flatFine),big=children.filter(p=>!p.flatFine);assert.equal(fine.length,32);assert.ok(Math.max(...big.map(p=>p.size))>Math.max(...fine.map(p=>p.size))*4);assert.ok(fine.every(p=>p.tailLength===0));sizes.push(Math.max(...big.map(p=>p.size)));}
  assert.equal(new Set(sizes).size,1);
 }
});
test('both gift modes shatter first-wave shapes and beads at the head or body surface without recursive explosions',()=>{
 for(const key of['gift-scatter','gift-twinkle'])for(const kind of['cube','bead'])for(const region of['head','body']){
  const w=new StickerWorld(rng(2));w.setStyle('gift');w.setEffect('laugh');const p=giftShell(key,300,100,1,rng(4)).particles.find(p=>p.giftMaterial.kind===kind);Object.assign(p,{x:300,y:100,vx:0,vy:250,delay:0,wallAge:1,giftSplitAt:null});w.add(p);
  const collider={collide(q,old){if(q.y<106)return false;q.y=103;q.vy=-Math.abs(q.vy);q.hitRegion=region;q.hitNormal={x:0,y:-1};return true;}};
  for(let i=0;i<30;i++)w.update(.01,1000,1000,collider);
  assert.ok(!w.particles.includes(p));const balls=w.particles.filter(p=>p.collisionBorn);assert.ok(balls.length>=4&&balls.length<=6);assert.ok(balls.every(p=>p.hasCollided&&p.giftConfetti&&p.hitRegion===region));assert.equal(w.events.filter(e=>e.collision).length,1);
  for(let i=0;i<100;i++)w.update(.01,1000,1000,collider);assert.equal(w.events.filter(e=>e.collision).length,1);assert.equal(w.particles.length,0);
 }
});
test('cinema emits 50 percent more main rays while retaining delayed fine stars',()=>{
 const p=cinemaShell('cinema-shell',0,0,1,rng(9)).particles;assert.equal(p.filter(p=>!p.cinemaDust&&!p.filament&&!p.innerRay).length,84);assert.equal(p.filter(p=>p.snowStar).length,192);assert.ok(p.filter(p=>p.snowStar).every(p=>p.delay>=.14));
});
test('gift and flat produce several saturated coloured sources during falling phase, then go dark',()=>{
 for(const[style,key]of[['gift','gift-scatter'],['flat','flat-festival']]){const w=new StickerWorld(rng(44));w.setStyle(style);w.setEffect('laugh');w.burst(1000,400,1,key);for(let i=0;i<55;i++)w.update(.02,2400,2400,null);const lights=fireworkLights(w);assert.ok(lights.length>=3&&lights.length<=5);assert.ok(lights.some(l=>l.energy>.12));assert.ok(lights.every(l=>Math.max(...l.color)-Math.min(...l.color)>.2));
  for(let i=0;i<300;i++)w.update(.02,2400,2400,null);assert.equal(fireworkLights(w).length,0);
 }
});
