import test from 'node:test';import assert from 'node:assert/strict';
import{StickerWorld}from'../dist/effects.mjs';import{fireworkLights}from'../dist/lighting.mjs';
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
test('long-lived glowing sparks still light the person after the short flash has disappeared',()=>{
 const w=new StickerWorld(random(53));w.setStyle('cinema');w.setEffect('laugh');w.burst(260,120,1,'willow');for(let i=0;i<40;i++)w.update(.05,1280,960,null);
 assert.equal(w.blooms.length,0);assert.ok(w.particles.length>0);assert.ok(fireworkLights(w).some(l=>l.energy>.01));
 const energy=fireworkLights(w).reduce((n,l)=>n+l.energy,0);for(let i=0;i<35;i++)w.update(.05,1280,960,null);assert.ok(fireworkLights(w).reduce((n,l)=>n+l.energy,0)<energy);
 for(let i=0;i<90;i++)w.update(.05,1280,960,null);assert.equal(fireworkLights(w).length,0);
});
test('five bounded coloured sources follow the sparks and switch off with the scene',()=>{
 const w=new StickerWorld(random(17));w.setEffect('laugh');w.burst(240,180,1,'chrysanthemum');for(let i=0;i<12;i++)w.update(.025,960,900,null);const before=fireworkLights(w);assert.equal(before.length,5);assert.ok(before.every(l=>Number.isFinite(l.x)&&Number.isFinite(l.y)&&l.energy>0&&l.energy<=.82));
 for(let i=0;i<24;i++)w.update(.025,960,900,null);const after=fireworkLights(w);assert.ok(after.some((l,i)=>Math.hypot(l.x-before[i].x,l.y-before[i].y)>5));
 w.setEffect('smile');w.rain(.05,960,900,.4);assert.equal(fireworkLights(w).length,0);w.setEffect('neutral');assert.equal(fireworkLights(w).length,0);
});
test('the light budget remains bounded with overlapping multi-colour shells',()=>{
 const w=new StickerWorld(random(33));w.setEffect('laugh');for(let i=0;i<7;i++)w.burst(200+i*45,100+i*10,1,'chrysanthemum');for(let i=0;i<10;i++)w.update(.02,1000,900,null);const lights=fireworkLights(w);assert.ok(lights.length<=5);assert.ok(lights.every(l=>l.energy<=.82));assert.ok(w.particles.length<=700);
});

import{emissionColor,hexRGB}from'../dist/emission.mjs';
test('each reflected source uses the current spark hue in both styles and cools with its sparks',()=>{
 for(const style of ['sticker','cinema'])for(let variant=0;variant<5;variant++)for(const life of [2.98,2.4,.6]){
  const p={type:'ember',x:50,y:70,life,maxLife:3,variant,luminosity:1};
  const lights=fireworkLights({effect:'laugh',style,particles:[p],blooms:[]});assert.equal(lights.length,1);
  const expected=hexRGB(emissionColor(p,style==='cinema'));lights[0].color.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-10));
 }
 const p={type:'ember',x:50,y:70,life:2.4,maxLife:3,variant:0},w={effect:'laugh',style:'cinema',particles:[p],blooms:[]};const young=fireworkLights(w)[0].color;p.life=.3;const old=fireworkLights(w)[0].color;assert.ok(young[2]>young[0]);assert.ok(old[0]>old[2]);
});
