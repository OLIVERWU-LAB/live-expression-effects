import test from 'node:test';
import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import {flatShell,flatChildren,ACTIVE_FLAT_PATTERNS} from '../dist/flat-fireworks.mjs';
import {flatRandom} from '../dist/flat-placement.mjs';
import {StickerWorld} from '../dist/effects.mjs';
const reference=JSON.parse(readFileSync(new URL('./fixtures/five-centres.json',import.meta.url),'utf8'));

test('all retained forms restore the exact five carrier positions and staggered timing from the last five-flower version',()=>{
 for(const row of reference.raw)for(const pattern of ACTIVE_FLAT_PATTERNS){
  const ps=flatShell(400,120,row.scale,flatRandom(row.seed),pattern).particles;assert.equal(ps.length,5);
  ps.forEach((p,i)=>{for(const[k,value]of Object.entries(row.parents[i]))assert.ok(Math.abs(p[k]-value)<1e-9,`${pattern}/${row.seed}/${k}: five-flower reference changed`);});
 }
});

test('the normal phone and desktop budgets actually show about one third more uniformly spaced primary components',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/before-visible-counts.json',import.meta.url),'utf8'));
 for(const row of rows){
  const w=new StickerWorld(flatRandom(4));w.setStyle('flat');w.setEffect('laugh');w.limit=row.limit;
  const parent=flatShell(400,120,.8,flatRandom(13),row.pattern).particles[0],ps=flatChildren(parent,flatRandom(7)).map(p=>({...p,flatMobile:true,flatDensity:Math.max(.12,(row.limit-20)/700)})),chosen=w.fitBatch(ps,.7),bands={};
  for(const p of chosen)if(p.flatTargetCount!=null){const k=p.flatRole+':'+p.flatBand;bands[k]=(bands[k]||0)+1;}
  for(const[key,count]of Object.entries(row.bands))assert.equal(bands[key],Math.round(count*4/3),`${row.limit}/${row.pattern}/${key}`);
  assert.equal(w.pendingParticles.length,0);assert.ok(chosen.some(p=>p.flatRing));assert.ok(chosen.some(p=>p.whiteFlash));
 }
});
