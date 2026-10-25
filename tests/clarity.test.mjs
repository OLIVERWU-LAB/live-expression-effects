import test from'node:test';import assert from'node:assert/strict';
import{CinemaRenderer}from'../dist/cinema-renderer.mjs';import{GiftRenderer}from'../dist/gift-renderer.mjs';import{contactRain,drawLineRain}from'../dist/rain-style.mjs';import{StickerWorld}from'../dist/effects.mjs';
const rng=s=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
const context=extra=>new Proxy(extra,{get:(o,k)=>o[k]||(()=>{})});
test('cinema uses one four-point spark without nested discs, then three smaller round lights',()=>{
 const r=new CinemaRenderer();r.hand.tile=()=>{throw Error('blurry tile reuse');};r.glow=()=>({});r.head=()=>({});let round=0,star=0,curves=0,fills=0,images=0;const g=context({arc(){round++;},lineTo(){star++;},quadraticCurveTo(){curves++;},fill(){fills++;},drawImage(){images++;},createRadialGradient(){return{addColorStop(){}};},createLinearGradient(){return{addColorStop(){}};}}),p={x:0,y:0,size:4.5,angle:0,seed:4,tint:'#53C9F4',life:2.7,maxLife:3,erosionAt:.34,luminosity:1,ringStar:false};r.reprise(g,p);assert.equal(round,0);assert.equal(images,0);assert.equal(fills,1);assert.equal(curves,4);assert.equal(star,0);
 fills=0;r.reprise(g,{...p,life:1.56});assert.equal(fills,3);assert.equal(star,0);assert.equal(round,3);assert.equal(r.hand.tiles.size,0);
});
test('gift contact rain keeps two short-lived beads and its own cached blue volume material',()=>{
 const w=new StickerWorld(rng(4));w.setStyle('gift');w.setEffect('smile');w.split({type:'drop',x:500,y:200,vx:0,vy:500,size:18,life:3,maxLife:3,variant:1,rainTone:3,angle:0,generation:0,hitNormal:{x:0,y:-1}});assert.equal(w.particles.length,2);assert.ok(w.particles.every(p=>p.contactSpray&&p.noRecollision&&p.maxLife<=.44));
 const old=globalThis.OffscreenCanvas,tiles=[];globalThis.OffscreenCanvas=class{constructor(){const counts={pointed:0,circle:0,gradients:0,highlight:0};tiles.push(counts);this.counts=counts;}getContext(){const c=this.counts;return context({bezierCurveTo(){c.pointed++;},arc(){c.circle++;},ellipse(){c.highlight++;},createLinearGradient(){c.gradients++;return{addColorStop(){}};},createRadialGradient(){return{addColorStop(){}};}});}};
 try{const r=new GiftRenderer();r.ready=true;const draws=[];const g=context({drawImage(im){draws.push(im);}});r.draw(g,{particles:[{...w.particles[0],generation:0,contactSpray:false}],blooms:[]});r.draw(g,w);assert.equal(tiles.length,3);assert.ok(tiles[0].pointed>0);assert.ok(tiles.slice(1).every(c=>c.pointed===0&&c.circle===1&&c.gradients===1&&c.highlight===1));assert.ok(draws.slice(1).every(im=>im.counts.circle===1));r.draw(g,w);assert.equal(tiles.length,3,'collision frames reuse the same tiles');}finally{globalThis.OffscreenCanvas=old;}
 for(let i=0;i<30;i++)w.update(.02,1000,900,{collide(){throw Error('contact beads cannot collide again');}});assert.equal(w.particles.length,0);
});
test('realistic rain is visibly wider while contact splash, trajectory, ripple and glow remain unchanged',()=>{
 const p={type:'drop',x:500,y:300,vx:120,vy:600,size:12,life:1,maxLife:2,depth:.5,rainLength:60},widths=[],ends=[],g=context({stroke(){widths.push(this.lineWidth);},moveTo(x,y){ends.push([x,y]);},lineTo(x,y){ends.push([x,y]);}});drawLineRain(g,p,'glow');drawLineRain(g,p,'cinema');assert.ok(Math.abs(widths[1]/widths[0]-1.7)<1e-9);assert.deepEqual(ends.slice(0,2),ends.slice(2));
 widths.length=0;drawLineRain(g,{...p,rainRipple:true},'glow');drawLineRain(g,{...p,rainRipple:true},'cinema');assert.equal(widths[0],widths[1]);
 const ps=contactRain(p,rng(3),'cinema');assert.equal(ps.filter(p=>p.contactSpray).length,2);assert.equal(ps.filter(p=>p.rainRipple).length,1);assert.ok(ps.every(p=>p.noRecollision));
});
