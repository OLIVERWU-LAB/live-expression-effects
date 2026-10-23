import test from'node:test';import assert from'node:assert/strict';import{refinedFlameTrail}from'../dist/cinema-refined-renderer.mjs';import{flatOpening,ACTIVE_FLAT_PATTERNS}from'../dist/flat-fireworks.mjs';
const particle={x:100,y:100,vx:180,vy:0,maxLife:2,life:1.8,seed:5,scale:1,trail:Array.from({length:19},(_,i)=>({x:100-i*5,y:100}))};
test('inner and outer tails remain straight early, later sway independently with irregular dim gaps and a pinned head',()=>{
 for(const innerRay of[false,true]){const p={...particle,innerRay};assert.equal(refinedFlameTrail(p),p.trail);const late={...p,life:.4},before=structuredClone(late),pts=refinedFlameTrail(late);assert.deepEqual(late,before);assert.deepEqual({...pts[0],tailAlpha:1},{...late.trail[0],tailAlpha:1});assert.ok(pts.some(q=>q.y>101));assert.ok(pts.some(q=>q.y<99));assert.ok(pts.some(q=>q.tailAlpha<.25));assert.ok(pts.some(q=>q.tailAlpha>.95));assert.deepEqual(pts,refinedFlameTrail(late));assert.notDeepEqual(pts,refinedFlameTrail({...late,life:.35}));}
 for(const extra of[{ringBlob:true},{cinemaDust:true}]){const p={...particle,...extra,life:.2};assert.equal(refinedFlameTrail(p),p.trail);}
});
test('all first-beat petals last 0.8 seconds without extending the opening stars and circle',()=>{
 for(const key of ACTIVE_FLAT_PATTERNS){const ps=flatOpening(500,300,1,0,()=>.37,key);assert.equal(ps.filter(p=>p.flatRole==='petal').length,10);assert.ok(ps.filter(p=>p.flatRole==='petal').every(p=>p.life===.8&&p.maxLife===.8));assert.ok(ps.filter(p=>p.flatRole!=='petal').every(p=>p.maxLife<=.48));}
});
