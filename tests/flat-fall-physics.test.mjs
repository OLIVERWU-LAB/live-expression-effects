import test from'node:test';import assert from'node:assert/strict';import{createHash}from'node:crypto';
import{StickerWorld}from'../dist/effects.mjs';import{flatChildren,ACTIVE_FLAT_PATTERNS}from'../dist/flat-fireworks.mjs';import{flatRandom}from'../dist/flat-placement.mjs';
const before={
 'flat-medallion':'4ad15e4a8b34a829813f34335cca146438e25f8520a6de9ce428be16b47b9839',
 'flat-star-crown':'730b3c9c062d1d7ba91788324bd0d437d66b562bf8b3fd5e674247b6893f574e',
 'flat-festival':'90ccc1e105f2433e1b439d3199648fa7b38029913c4b9cd977d28cd84bcb5288'
};
const flower=pattern=>flatChildren({pattern,x:400,y:120,scale:.8,seed:13,variant:3,turn:.43,cascade:true,flowerScale:1,vx:199,vy:200,clusterIndex:1,flatDensity:.5},flatRandom(2));
test('stronger fall keeps every accepted initial direction, launch speed, component size, count and lifetime unchanged',()=>{
 for(const pattern of ACTIVE_FLAT_PATTERNS){const particles=flower(pattern);assert.equal(createHash('sha256').update(JSON.stringify(particles.map(({gravity,...p})=>p))).digest('hex'),before[pattern]);}
});
function turnTime(p,gravity){const w=new StickerWorld(flatRandom(9));w.setStyle('flat');w.setEffect('laugh');const particle={...p,gravity,trail:[],outerGlints:false};w.particles=[particle];for(let f=1;f<=360;f++){w.update(1/120,3000,3000,null);if(particle.vy>=0)return f/120;}assert.fail('an upward main component did not turn downward');}
test('real physics turns the highest upward ray downward earlier in all three forms',()=>{
 for(const pattern of ACTIVE_FLAT_PATTERNS){const p=flower(pattern).filter(p=>p.flatTargetCount!=null).sort((a,b)=>a.vy-b.vy)[0],old=turnTime(p,p.gravity/1.6),now=turnTime(p,p.gravity);assert.ok(now<=old*.83&&old-now>=.10,`${pattern}: before ${old}, after ${now}`);}
});
