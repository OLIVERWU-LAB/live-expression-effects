import {Renderer} from '../dist/renderer.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {StickerWorld} from '../dist/effects.mjs';import{flatShell,flatChildren,ACTIVE_FLAT_PATTERNS}from'../dist/flat-fireworks.mjs';import{particleVisibility}from'../dist/particle-visibility.mjs';import{cinemaErosion,cinemaTrailGeometry}from'../dist/cinema-renderer.mjs';
const rng=s=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
const scenes=[...ACTIVE_FLAT_PATTERNS.map(k=>['flat',k]),['gift','gift-scatter'],['gift','gift-twinkle'],['cinema','cinema-shell'],['cinema','cinema-rings'],['glow','cinema-shell'],['glow','cinema-rings']];
test('overlapping shells never remove still-live components to reclaim their slots in any style',()=>{
 for(const limit of[150,350,700])for(const[style,key]of scenes){const w=new StickerWorld(rng(31));w.limit=limit;w.setStyle(style);w.setEffect('laugh');
  for(let f=0;f<450;f++){const before=[...w.particles];if(f%70===0)w.burst(900,500,1,key);w.update(.02,1800,1800,null);const live=new Set(w.particles);for(const p of before)if(!live.has(p)&&p.y<1900&&p.x>-150&&p.x<1950)assert.ok(p.life<=0,style+' '+key+' hard removal');assert.ok(w.particles.length<=limit);assert.ok(w.pendingParticles.length<=limit);}
  for(let f=0;f<350;f++)w.update(.02,1800,1800,null);assert.equal(w.particles.length+w.pendingParticles.length,0);
 }
});
test('pressure retirement changes opacity over a full interval before new births take the slot',()=>{
 const w=new StickerWorld(rng(3));w.limit=150;w.setStyle('flat');w.setEffect('laugh');
 for(let i=0;i<150;i++)w.add({type:'spark',flatFx:true,flatRole:'dust',x:500,y:500,vx:0,vy:0,gravity:0,size:2,tint:'#fff',life:2,maxLife:3,tempo:1,seed:i,angle:0,touched:0});
 const old=[...w.particles];w.burst(800,400,1,'flat-festival');assert.ok(old.every(p=>w.particles.includes(p)));const p=old.find(p=>p.retireRemaining!=null);assert.ok(p);assert.equal(particleVisibility(p),1);for(let i=0;i<6;i++)w.update(.02,1800,1800,null);assert.ok(particleVisibility(p)>.35&&particleVisibility(p)<.7);assert.ok(w.particles.includes(p));for(let i=0;i<10;i++)w.update(.02,1800,1800,null);assert.equal(p.life,0);assert.ok(!w.particles.includes(p));assert.ok(w.particles.some(p=>p.pattern==='flat-festival'));
});
test('head collisions preserve animation age and a nearby flat emitter still opens its flower',()=>{
 for(const[style,flag]of[['flat','flatFx'],['cinema','cinematic'],['glow','handDrawn']]){const w=new StickerWorld(rng(4));w.setStyle(style);w.setEffect('laugh');w.head={left:200,right:340,top:250,bottom:440};const p={type:'spark',[flag]:true,cinematic:style!=='flat',flatRole:'dust',x:270,y:225,vx:0,vy:350,gravity:0,drag:0,size:4,life:3,maxLife:3,seed:2,variant:0,touched:0,angle:0,trail:[],collisionDelay:0};w.add(p);for(let i=0;i<10;i++)w.update(.02,600,900,null);assert.ok(p.hasCollided);assert.ok(p.maxLife-p.life<.25,style+' collision skipped animation time');}
 const w=new StickerWorld(rng(3));w.setStyle('flat');w.setEffect('laugh');w.burst(270,240,1,'flat-petals');w.head={left:0,right:600,top:0,bottom:900};for(let f=0;f<90;f++)w.update(.02,1000,1400,null);assert.equal(w.events.filter(e=>e.stage===2).length,5);
});
test('petals are fuller; crown keeps eight clearly separated primary stars',()=>{
 for(const seed of flatShell(0,0,1,rng(5),'flat-petals').particles){const p=flatChildren(seed,rng(8));assert.ok(p.filter(q=>q.flatRole==='petal').length>=11);}
 const child=flatChildren(flatShell(0,0,1,rng(5),'flat-star-crown').particles[0],rng(6)),primary=child.filter(p=>p.flatRole==='star'&&p.tailLength),satellites=child.filter(p=>p.crownSatellite);assert.equal(primary.length,8);assert.equal(satellites.length,0);
});
test('cinema tails are continuous tapered meshes and erosion crossfades instead of switching geometry',()=>{
 const p={x:100,y:100,life:1,maxLife:2,trail:[{x:90,y:100},{x:75,y:98},{x:55,y:94},{x:20,y:90}]},m=cinemaTrailGeometry(p,2);assert.equal(m.points.length,5);const widths=m.left.map((q,i)=>Math.hypot(q.x-m.right[i].x,q.y-m.right[i].y));assert.ok(widths.slice(1).every((w,i)=>w<=widths[i]));assert.equal(widths.at(-1),0);
 let prev=0;for(let i=0;i<=100;i++){const e=cinemaErosion({...p,life:2-i*.02});assert.ok(e>=prev&&e-prev<.06);prev=e;}assert.equal(prev,1);
});

test('collided particles stay in the foreground until their own fade ends',()=>{
 let fills=0;const ctx=new Proxy({fill(){fills++;}},{get:(o,k)=>o[k]||(()=>{})});
 for(const style of['gift','flat','cinema','glow']){const p={hasCollided:true,life:.5,maxLife:3,hitAge:1.1,cinematic:style==='cinema',handDrawn:style==='glow',delay:0,flatFx:style==='flat',flatRole:'dust',tempo:1,size:2,x:0,y:0,angle:0,seed:1,tint:'#ffcc00'},w={style,particles:[p],head:null};let selected;
  const target={ctx,width:100,height:100,gift:{draw(g,w){selected=w.particles;}},cinema:{draw(g,w){selected=w.particles;}}};
  Renderer.prototype.collisionForeground.call(target,w);if(style!=='flat')assert.deepEqual(selected,[p]);else assert.ok(fills>0);
 }
});
