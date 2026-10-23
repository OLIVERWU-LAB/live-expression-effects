import test from'node:test';import assert from'node:assert/strict';import{createHash}from'node:crypto';
import{cinemaShell,cinemaRingChildren,CINEMA_TRAIL_HUES}from'../dist/reference-bursts.mjs';import{CinemaRenderer,cinemaRepriseTail}from'../dist/cinema-renderer.mjs';import{StickerWorld}from'../dist/effects.mjs';
const rng=s=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296),context=o=>new Proxy(o,{get:(o,k)=>o[k]||(()=>{})});
// Frozen v45 motion, before the v46 increase in secondary velocity. Colour and texture are excluded.
const approved=[
 [4,'ccd07fa7a3fee30397602fa3f9f7b8e9e13648da55d3f18a8f310ea6d772f064','4d1b5ba7207a9f8a9f5099045ee170d70ca0a91afba197fb8310a387d11ee844'],
 [31,'9b7626597febab8cfedd2af8515312b6aeee459a63ec8d871e44cd70d266e8ed','61e33f19e253841bc03ececd10645a992d7a3e784abe9c9b137b3f7abacfcd3a'],
 [89,'5831563736a4865ae555fa286019716d43a057f95911d9404d4919fc32190aae','1da539afe9068868880d355d12aa56886b82019451018add819d4fc1213a51c9']
];
const signature=ps=>createHash('sha256').update(JSON.stringify(ps.map(p=>['x','y','vx','vy','size','maxLife','delay','gravity','drag','seed','ringSplitAt','carrierAngle'].map(k=>p[k]==null?null:Math.round(p[k]*1e6)/1e6)))).digest('hex');
test('first-wave layout is unchanged and secondary layout/velocity restores the approved v45 motion',()=>{
 for(const[seed,shellHash,childHash]of approved){const ps=cinemaShell('cinema-rings',500,280,.9,rng(seed)).particles,kids=ps.filter(p=>p.ringCarrier).flatMap(p=>cinemaRingChildren(p,rng(Math.floor(p.seed))));assert.equal(signature(ps),shellHash);assert.equal(signature(kids),childHash);}
});
test('the actual trail fill retains its saturated colour, without an additive white spine',()=>{
 const r=new CinemaRenderer();for(const tint of CINEMA_TRAIL_HUES){const stops=[];let fills=0;const g=context({createLinearGradient(){return{addColorStop(t,c){stops.push([t,c]);}};},fill(){fills++;}});r.beam(g,{x:100,y:100,trailTint:tint,trail:[{x:90,y:100},{x:60,y:100}]},'#FFFFFF',1,2);assert.equal(fills,2);assert.ok(stops.some(([t,c])=>t===.08&&c===tint));for(const[t,c]of stops.filter(([t])=>t>=.08))assert.equal(c.slice(0,7),tint);}
});
test('primary heads follow velocity with a restrained elongated footprint',()=>{
 const r=new CinemaRenderer();r.head=()=>({});let angle,rect;const g=context({rotate(a){angle=a;},drawImage(im,x,y,w,h){rect={w,h};}});r.movingHead(g,{x:0,y:0,vx:40,vy:30},'#AB49EA',1,3);assert.equal(angle,Math.atan2(30,40));assert.ok(rect.w/rect.h>1.3&&rect.w/rect.h<1.5);assert.ok(rect.h<18,'avoid returning to oversized 26px round heads');
});
test('a four-point reprise has a brief long rear corner then three round lights, with no five-point stars',()=>{
 const r=new CinemaRenderer();r.glow=()=>({});const p={x:0,y:0,vx:70,vy:-20,size:5,seed:4,angle:0,tint:'#13B9FF',maxLife:3,life:2.9,luminosity:1,erosionAt:.34,trail:[]};let quads=0,lines=0,rounds=0,beams=0;const g=context({quadraticCurveTo(){quads++;},lineTo(){lines++;},arc(){rounds++;},createLinearGradient(){return{addColorStop(){}};},createRadialGradient(){return{addColorStop(){}};}});r.beam=()=>{beams++;};r.reprise(g,p);assert.equal(quads,4);assert.equal(lines,0);assert.equal(rounds,0);assert.equal(beams,1);r.reprise(g,{...p,life:2.5});assert.equal(beams,1,'the tail must already be gone at 0.5 seconds');rounds=0;r.reprise(g,{...p,life:1.56});assert.equal(rounds,3);assert.equal(lines,0);
 assert.ok(cinemaRepriseTail(.07)>.9);assert.ok(cinemaRepriseTail(.25)<.2);assert.equal(cinemaRepriseTail(.34),0);
});
test('short secondary tails never reappear as detached afterglows after impact or expiry',()=>{
 for(const dt of[1/30,1/60]){const w=new StickerWorld(rng(4));w.setStyle('cinema');w.setEffect('laugh');const parent=cinemaShell('cinema-rings',800,400,1,rng(5)).particles.find(p=>p.ringCarrier),ps=cinemaRingChildren(parent,rng(6));ps.forEach(p=>w.add(p));let seenTrail=false;for(let f=0;f<Math.ceil(4/dt);f++){w.update(dt,1600,1400,null);seenTrail||=w.particles.some(p=>p.trail.length>2);assert.equal(w.afterglows.length,0);}assert.ok(seenTrail);assert.equal(w.particles.length,0);}
});
