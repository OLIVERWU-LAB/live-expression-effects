import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{StickerWorld}from'../dist/effects.mjs';import{flatShell,flatChildren,ACTIVE_FLAT_PATTERNS}from'../dist/flat-fireworks.mjs';import{contactRain,drawLineRain,drawFlatRain}from'../dist/rain-style.mjs';import{cinemaShell,cinemaRingChildren}from'../dist/reference-bursts.mjs';import{giftMaterialTint}from'../dist/gift-materials.mjs';
const rng=s=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
test('all flat bouquets open their first flower on the same beat; later flowers remain staggered',()=>{
 for(let seed=0;seed<12;seed++){const first=[];for(const key of ACTIVE_FLAT_PATTERNS.filter(k=>k!=='flat-reprise')){const w=new StickerWorld(rng(seed));w.setStyle('flat');w.setEffect('laugh');w.burst(900,500,1,key);const times=[];for(let f=0;f<100;f++){w.update(.01,1800,1800,null);for(const e of w.consumeEvents())if(e.stage===2)times.push(f);}assert.equal(times.length,w.lastFlatFlowerCount);assert.ok(times.slice(1).every((t,i)=>t-times[i]>6));first.push(times[0]);}assert.ok(Math.max(...first)-Math.min(...first)<=1);}
 const flower=flatChildren(flatShell(0,0,1,rng(8),'flat-petals').particles[0],rng(4));assert.equal(flower.filter(p=>p.flatRole==='petal').length,17);
 const medallion=flatChildren(flatShell(0,0,1,rng(8),'flat-medallion').particles[0],rng(4)),comets=medallion.filter(p=>p.flatRole==='comet');assert.ok(Math.max(...comets.slice(24,40).map(p=>p.size))<Math.min(...comets.slice(0,24).map(p=>p.size))*.8);
});
test('cinema reprises now use eleven round-light clusters with a minority of satellite stars',()=>{
 const carriers=cinemaShell('cinema-rings',0,0,1,rng(4)).particles.filter(p=>p.ringCarrier);assert.equal(carriers.length,11);let count=0,stars=0;for(const c of carriers){const children=cinemaRingChildren(c,rng(5));assert.ok(children.length>=8&&children.length<=10);count+=children.length;stars+=children.filter(p=>p.ringStar).length;}assert.ok(count>=88&&count<=110);assert.ok(stars>count*.18&&stars<count*.32);
});
test('faster rain retains varied sizes, tones, rare hollow drops, and no screen water in any style',()=>{
 for(const style of['gift','flat','cinema','glow']){const w=new StickerWorld(rng(31));w.setStyle(style);w.setEffect('smile');for(let f=0;f<300;f++){w.rain(.02,1000,900,.35);w.update(.02,1000,900,null);assert.equal(w.lens.drops.length+w.lens.trails.length,0);}assert.ok(w.particles.length>0);const drops=w.particles.filter(p=>!p.generation);assert.ok(new Set(drops.map(p=>p.rainTone)).size>=3);assert.ok(drops.every(p=>p.gravity>=470));assert.ok(drops.every(p=>p.vy>=360));}
 const w=new StickerWorld(rng(8));w.setStyle('flat');w.setEffect('smile');for(let i=0;i<500;i++)w.rain(.02,1000,1000,.35);const ratio=w.particles.filter(p=>p.rainVariant==='hollow').length/w.particles.length;assert.ok(ratio>.05&&ratio<.18);
});
test('contact spray never draws an inherited long rain rod on its first or later frames',()=>{
 let lines=0,beads=0;const g=new Proxy({lineTo(){lines++;},ellipse(){beads++;}},{get:(o,k)=>o[k]||(()=>{})});
 const parent={type:'drop',x:400,y:300,size:14,vx:150,vy:600,rainLength:70,variant:0,hitNormal:{x:0,y:-1}};
 for(const style of['cinema','glow']){const children=contactRain(parent,rng(4),style),spray=children.filter(p=>p.contactSpray);for(const p of spray){assert.equal(p.rainLength,0);assert.equal(p.tailLength,0);drawLineRain(g,p);p.life-=.025;drawLineRain(g,p);}assert.ok(spray.every(p=>p.noRecollision));}
 assert.equal(lines,0);assert.equal(beads,8);const gift=contactRain(parent,rng(4),'gift');assert.equal(gift.length,2);assert.ok(gift.every(p=>p.size/parent.size>=.44&&p.size/parent.size<=.56&&p.maxLife<=.44));
});
test('flat raindrops use a real gradient and highlight, while hollow drops omit the body fill',()=>{
 let fills=0,gradients=0,strokes=0;const g=new Proxy({fill(){fills++;},stroke(){strokes++;},createLinearGradient(){gradients++;return{addColorStop(){}};}},{get:(o,k)=>o[k]||(()=>{})}),p={x:0,y:0,size:18,life:1,maxLife:2,variant:0,angle:-.23,rainVariant:'solid'};drawFlatRain(g,p);assert.equal(gradients,1);assert.equal(fills,1);assert.equal(strokes,2);drawFlatRain(g,{...p,rainVariant:'hollow'});assert.equal(fills,1);assert.equal(strokes,3);
});
test('emoji palette preserves soft hues without increasing measured luminance',()=>{
 const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255),Y=h=>rgb(h).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 for(let i=0;i<6;i++)assert.ok(Y(giftMaterialTint({variant:i},'soft-candy'))<=Y(giftMaterialTint({variant:i},'soft'))+.003);
 const shader=readFileSync(new URL('../dist/optics.mjs',import.meta.url),'utf8');assert.ok(!shader.includes('uFilm')&&!shader.includes('uDrops'));assert.ok(shader.includes('length:3'));
});
