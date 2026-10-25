import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{planLiveFirework}from'../dist/firework-playback.mjs';import{flatRandom}from'../dist/flat-placement.mjs';
const reference=JSON.parse(readFileSync(new URL('./fixtures/five-centres.json',import.meta.url),'utf8'));
import{flatShell,flatChildren}from'../dist/flat-fireworks.mjs';
import{prioritizeFlat}from'../dist/flat-budget.mjs';
test('the launch planner gently widens the accepted five-flower layout while keeping its seed and flower sizes',()=>{
 let widened=0;
 for(const row of reference.planned){
  const actual=planLiveFirework({style:'flat'},row.width,row.height,row.head,row.side,flatRandom(31+row.side));assert.ok(actual);
  assert.equal(actual.flatSeed,row.layout.flatSeed);assert.equal(actual.scale,row.layout.scale);assert.equal(actual.radius,row.layout.radius);
  assert.ok(actual.flatSpreadScale>=row.layout.flatSpreadScale-1e-9&&actual.flatSpreadScale<=row.layout.flatSpreadScale*1.12+1e-9);
  assert.ok(Math.abs(actual.x-row.layout.x)<=Math.min(56,row.width*.04)+1e-9);assert.ok(Math.abs(actual.y-row.layout.y)<=32+1e-9);
  if(actual.flatSpreadScale>row.layout.flatSpreadScale*1.02)widened++;
 }
 assert.ok(widened>=20,'most normal portrait and desktop compositions gain space');
});
test('a seven-star admitted ring still divides the full circle into seven equal directions',()=>{
 const parent=flatShell(400,100,.8,flatRandom(3),'flat-star-crown').particles[0],stars=flatChildren(parent,flatRandom(4)).filter(p=>p.flatRole==='star'&&p.outerGlints),chosen=prioritizeFlat(stars,7);
 assert.equal(chosen.length,7);const angles=chosen.map(p=>(Math.atan2(p.vy,p.vx)+Math.PI*2)%(Math.PI*2)).sort((a,b)=>a-b);
 for(let i=0;i<7;i++)assert.ok(Math.abs((angles[(i+1)%7]-angles[i]+Math.PI*2)%(Math.PI*2)-Math.PI*2/7)<1e-8);
});
