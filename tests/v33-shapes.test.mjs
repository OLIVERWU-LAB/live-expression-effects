import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {giftMaterial} from '../dist/gift-style.mjs';
import {GiftRenderer} from '../dist/gift-renderer.mjs';
import {GIFT_ASSETS,giftShell} from '../dist/reference-bursts.mjs';
import {activeGiftAssets,giftAssetPath,GIFT_RETAINED_SHAPES} from '../dist/gift-shapes.mjs';
const rng=s=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
test('shape selection preserves all 41 slots and particle state, including the two restored ribbons',()=>{
 for(const pattern of ['gift-scatter','gift-twinkle'])for(let seed=0;seed<12;seed++){
  const particles=giftShell(pattern,800,250,1,rng(seed)).particles,before=structuredClone(particles);
  assert.equal(particles.length,41);let replaced=0;
  for(const p of particles){const m=giftMaterial(p);assert.ok(GIFT_RETAINED_SHAPES.includes(m.kind));
   if(p.giftMaterial.kind==='ribbon'){replaced++;assert.equal(m.kind,'ribbon');assert.equal(m.color,p.giftMaterial.color);}
   else assert.deepEqual(m,p.giftMaterial);
  }assert.equal(replaced,2);assert.deepEqual(particles,before);
 }
 assert.equal(giftMaterial({giftMaterial:{kind:'wave',color:1,sourceKind:'ribbon'}}).kind,'ribbon');
});
test('actual drawing preserves each slot size, yaw, opacity and simulation data',()=>{
 const particles=giftShell('gift-scatter',800,250,1,rng(14)).particles;
 for(const p of particles){p.delay=0;p.life-=.6;}
 const before=structuredClone(particles),g={save(){},restore(){},translate(){},rotate(){}},renderer=new GiftRenderer(),calls=[];
 renderer.ready=true;renderer.sprite=(...args)=>calls.push(args.slice(1));renderer.draw(g,{particles,blooms:[]});
 assert.equal(calls.length,41);assert.deepEqual(particles,before);
 for(let i=0;i<particles.length;i++){
  const p=particles[i],kind=p.giftMaterial.kind,age=p.maxLife-p.life;
  const factor=kind==='twinkle'?3.2:kind==='bead'?4.15:['ring','fourstar','sparkle'].includes(kind)?3.5:['cylinder','wave','triangle'].includes(kind)?3.3:2.85;
  const yaw=['star','sparkle','fourstar','ring','triangle','cube','coil','ribbon'].includes(kind)?Math.sin(p.seed+age*.75)*.34:p.seed*.05+age*.48;
  assert.equal(calls[i][0],kind);assert.equal(calls[i][4],p.size*factor);assert.equal(calls[i][5],p.size*factor);assert.equal(calls[i][6],yaw);
 }
});
test('all selected shapes have bounded verified textures in each material, including restored ribbons',()=>{
 const assets=activeGiftAssets(GIFT_ASSETS);assert.ok(assets.ribbon);assert.equal(assets.wave.length,2);let total=0;
 for(const profile of ['light','soft','candy'])for(const[k,colors]of Object.entries(assets))for(const color of colors){
  const path=new URL('../dist/'+giftAssetPath(profile,k,color),import.meta.url),b=readFileSync(path),manifest=JSON.parse(readFileSync(new URL('manifest.json',path)));
  const entry=manifest.assets.find(a=>a.file===`${k}-${color}.png`);assert.ok(entry);assert.equal(createHash('sha256').update(b).digest('hex'),entry.sha256);
  assert.equal(b.readUInt32BE(16),entry.frames*manifest.tile);assert.equal(b.readUInt32BE(20),manifest.tile);total+=b.length;
 }assert.ok(total<12_000_000);
});
