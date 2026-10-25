import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{planLiveFirework}from'../dist/firework-playback.mjs';import{flatRandom}from'../dist/flat-placement.mjs';
const reference=JSON.parse(readFileSync(new URL('./fixtures/v105-five-centres.json',import.meta.url),'utf8'));
import{flatShell,flatChildren}from'../dist/flat-fireworks.mjs';
import{prioritizeFlat}from'../dist/flat-budget.mjs';
test('the actual phone and desktop launch planner reproduces the last five-flower arrangement exactly',()=>{
 for(const row of reference.planned){const actual=planLiveFirework({style:'flat'},row.width,row.height,row.head,row.side,flatRandom(31+row.side));assert.ok(actual);for(const[key,value]of Object.entries(row.layout))assert.ok(Math.abs(actual[key]-value)<1e-9,`${row.width}/${row.side}/${key}: old placement changed`);}
});
test('a seven-star admitted ring still divides the full circle into seven equal directions',()=>{
 const parent=flatShell(400,100,.8,flatRandom(3),'flat-star-crown').particles[0],stars=flatChildren(parent,flatRandom(4)).filter(p=>p.flatRole==='star'&&p.outerGlints),chosen=prioritizeFlat(stars,7);
 assert.equal(chosen.length,7);const angles=chosen.map(p=>(Math.atan2(p.vy,p.vx)+Math.PI*2)%(Math.PI*2)).sort((a,b)=>a-b);
 for(let i=0;i<7;i++)assert.ok(Math.abs((angles[(i+1)%7]-angles[i]+Math.PI*2)%(Math.PI*2)-Math.PI*2/7)<1e-8);
});
