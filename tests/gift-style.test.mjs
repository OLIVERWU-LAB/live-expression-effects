import {giftMaterialTint} from '../dist/gift-materials.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import{StickerWorld}from'../dist/effects.mjs';import{ACTIVE_PATTERNS}from'../dist/pyro.mjs';import{GIFT_COLORS,giftMaterial,giftSplashEnvelope,giftPopperEnvelope,GIFT_PREP,giftLaunchOrigin}from'../dist/gift-style.mjs';import{GIFT_PALETTE,GIFT_LAYOUT,giftSurfaceColor}from'../dist/reference-bursts.mjs';import{emissionColor}from'../dist/emission.mjs';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('gift has its own 41-object composition and scale hierarchy instead of the illustration shell',()=>{
 for(const pattern of ['gift-scatter','gift-twinkle']){const gift=new StickerWorld(rng(13));gift.setStyle('gift');gift.setEffect('laugh');gift.burst(900,300,1,pattern);const paper=new StickerWorld(rng(13));paper.setEffect('laugh');paper.burst(900,300,1,'chrysanthemum');assert.equal(gift.particles.length,GIFT_LAYOUT.length);assert.ok(gift.particles.length<paper.particles.length);assert.ok(Math.max(...gift.particles.map(p=>p.size))/Math.min(...gift.particles.map(p=>p.size))>8);assert.ok(gift.particles.every(p=>p.referenceGift&&p.tailLength===0));}
});
test('gift styles restore ribbons while preserving reflected light',()=>{
 const w=new StickerWorld(rng(4));w.setStyle('gift');w.setEffect('laugh');w.burst(700,130,1,'chrysanthemum');const kinds=new Set(w.particles.map(p=>giftMaterial(p).kind));for(const k of['star','bead','ring','ribbon','coil'])assert.ok(kinds.has(k));for(const p of w.particles)assert.equal(emissionColor(p,false),giftMaterialTint(p,p.giftFinish));
 w.setStyle('sticker');assert.equal(w.particles.length,0);w.burst(700,130,1,'chrysanthemum');assert.ok(w.particles.every(p=>!p.giftMaterial&&!p.tint));
});
test('gift rain sprays twice and clears within 0.45 seconds, without another collision',()=>{
 const w=new StickerWorld(rng(21));w.setStyle('gift');w.setEffect('smile');w.split({type:'drop',x:195,y:120,size:18,vx:0,vy:400,hitNormal:{x:0,y:-1},variant:0,generation:0,angle:0});
 assert.equal(w.particles.length,2);assert.ok(w.particles.every(p=>p.contactSpray&&p.noRecollision&&p.maxLife<=.44));const originals=[...w.particles];
 for(let i=0;i<8;i++)w.update(.02,390,844,{collide(){throw new Error('Spray must not collide again');}});assert.ok(originals.every(p=>Math.hypot(p.x-195,p.y-120)>5));
 for(let i=0;i<20;i++)w.update(.02,390,844,null);assert.equal(w.particles.length,0);
});
test('all locally rendered atlas files exist, have matching hashes and bounded 160px rotation frames',()=>{
 const root=new URL('../dist/assets/gift-v20/',import.meta.url),m=JSON.parse(readFileSync(new URL('manifest.json',root)));assert.equal(m.assets.length,31);let total=0;
 for(const asset of m.assets){const bytes=readFileSync(new URL(asset.file,root));assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert.equal(bytes.readUInt32BE(16),160*asset.frames);assert.equal(bytes.readUInt32BE(20),160);assert.ok(asset.frames===1||asset.frames===12);total+=bytes.length;}assert.ok(total<3_000_000);
});

test('gift capsule launches directly below the frame, slows along its fixed path and bursts once',()=>{
 const w=new StickerWorld(rng(17));w.setStyle('gift');w.setEffect('laugh');w.setPattern('gift-scatter');w.launch(290,95,390,844,1,{launchX:210,radius:120});const r=w.rockets[0];
 assert.equal(w.launchers.length,0);assert.equal(r.delayRemaining,0);assert.ok(r.sy>844);assert.equal(w.consumeEvents().filter(e=>e.type==='launch').length,1);
 const distances=[];let old={x:r.x,y:r.y};for(let i=0;i<20;i++){w.update(.02,390,844,null);distances.push(Math.hypot(r.x-old.x,r.y-old.y));old={x:r.x,y:r.y};}
 assert.ok(distances[0]>distances.at(-1)*2);let bursts=0;for(let i=0;i<30;i++){w.update(.02,390,844,null);bursts+=w.consumeEvents().filter(e=>e.type==='burst').length;}
 assert.equal(bursts,1);assert.equal(w.rockets.length,0);assert.equal(w.launchers.length,0);assert.ok(w.particles.length>0);
});
test('popper retreats and all gift launch state clears on change; committed prep finishes after smile release',()=>{
 assert.ok(giftPopperEnvelope(0).offset>200);assert.ok(giftPopperEnvelope(.26).offset<.01);assert.ok(giftPopperEnvelope(.70).offset>100);assert.equal(giftPopperEnvelope(.8).done,true);
 const w=new StickerWorld(rng(2));w.setStyle('gift');w.setEffect('laugh');w.launch(250,70,390,844);const r=w.rockets[0];w.requestEffect('neutral');assert.ok(w.finishRemaining>=r.duration+GIFT_PREP+.64);
 for(let i=0;i<60;i++)w.update(.02,390,844,null);assert.ok(w.consumeEvents().some(e=>e.type==='burst'));w.setStyle('sticker');assert.equal(w.launchers.length,0);assert.equal(w.rockets.length,0);
});
test('v21 uses the reference gold, violet, coral, blue and magenta and complete separate launch assets',()=>{
 const root=new URL('../dist/assets/gift-v21/',import.meta.url),m=JSON.parse(readFileSync(new URL('manifest.json',root)));assert.deepEqual(m.colors,GIFT_COLORS);assert.equal(m.assets.length,33);let total=0;
 for(const a of m.assets){const b=readFileSync(new URL(a.file,root));assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);assert.equal(b.readUInt32BE(16),160*a.frames);assert.equal(b.readUInt32BE(20),160);total+=b.length;}assert.ok(total<3_000_000);
 for(const name of ['capsule-0.png','popper-0.png'])assert.ok(m.assets.some(a=>a.file===name&&a.frames===1));assert.ok(m.launch.mouth.every(v=>v>0&&v<1));
});

test('gift launch origin stays below the image in both portrait and a close-up face',()=>{
 const close={left:326,right:693,top:93,bottom:490},q=giftLaunchOrigin(510,145,960,540,close);assert.equal(q.x,510);assert.ok(q.y>540);
 assert.equal(giftLaunchOrigin(195,195,390,844,{left:120,right:270,top:170,bottom:420}).x,195);
 const w=new StickerWorld(rng(9));w.setStyle('gift');w.head=close;w.setEffect('laugh');w.launch(145,78,960,540,1,{launchX:510});assert.equal(w.rockets[0].sx,q.x);assert.equal(w.launchers.length,0);
});
