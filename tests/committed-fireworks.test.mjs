import test from 'node:test';import assert from 'node:assert/strict';
import{ExpressionController}from'../dist/core.mjs';import{StickerWorld}from'../dist/effects.mjs';import{planBurst}from'../dist/pyro.mjs';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('45 percent responds promptly and small smile fluctuations do not cut the show',()=>{const e=new ExpressionController();let first=null;for(let t=0;t<500;t+=25){if(e.sample(.48,t).state==='laugh'&&first===null)first=t;}assert.ok(first!==null&&first<=300);for(let t=500;t<1100;t+=25)assert.equal(e.sample(.42+Math.sin(t)*.015,t).state,'laugh');});
test('switching from fireworks to smile hands off to rain within a short fade, even during ascent',()=>{
 for(const style of['sticker','cinema','coherent','gift','flat','glow']){const w=new StickerWorld(rng(61));w.setStyle(style);w.requestEffect('laugh');w.launch(300,100,800,800);for(let i=0;i<8;i++)w.update(1/60,800,800,null);w.requestEffect('smile');assert.equal(w.effect,'laugh');assert.ok(w.finishRemaining<=.24);
  let firstRain=null;for(let i=0;i<24;i++){w.rain(1/60,800,800,.3);w.update(1/60,800,800,null);if(w.effect==='laugh')assert.ok(w.particles.every(p=>p.type!=='drop'));if(firstRain===null&&w.particles.some(p=>p.type==='drop'))firstRain=(i+1)/60;}
  assert.ok(firstRain!==null&&firstRain<=.28,style);assert.equal(w.effect,'smile');assert.equal(w.pendingEffect,null);assert.equal(w.rockets.length,0);
 }
});
test('a just-opened burst remains visible briefly when the expression relaxes',()=>{const w=new StickerWorld(rng(3));w.requestEffect('laugh');w.burst(300,100,1,'chrysanthemum');w.requestEffect('neutral');for(let i=0;i<20;i++)w.update(.02,800,800,null);assert.equal(w.effect,'laugh');assert.ok(w.particles.length>0);for(let i=0;i<30;i++)w.update(.02,800,800,null);assert.equal(w.effect,'neutral');assert.equal(w.particles.length,0);});
test('normal head jitter no longer cancels a committed shell at the exact exclusion boundary',()=>{
 for(const [width,height]of[[390,844],[1280,720]])for(const style of['sticker','cinema','coherent']){const random=rng(71),w=new StickerWorld(random),rx=Math.min(width*.13,height*.14),head={left:width*.5-rx*1.1,right:width*.5+rx*1.1,top:height*.37-rx*1.4,bottom:height*.37+rx*1.4};w.setStyle(style);w.setEffect('laugh');const plan=planBurst(width,height,head,0,random);w.head=head;w.launch(plan.x,plan.y,width,height,plan.scale,plan);let bursts=0,blocked=0;
  for(let i=0;i<60;i++){const dx=Math.sin(i*1.3)*6,dy=Math.cos(i*.9)*6;w.head={left:head.left+dx,right:head.right+dx,top:head.top+dy,bottom:head.bottom+dy};w.update(1/60,width,height,null);for(const e of w.consumeEvents()){if(e.type==='burst')bursts++;if(e.type==='flight-blocked')blocked++;}}
  assert.equal(bursts,1,`${width} ${style}`);assert.equal(blocked,0);
 }
});
test('a real head obstruction emits a cancellation event so the app retries promptly',()=>{const w=new StickerWorld(rng(22));w.setEffect('laugh');const head={left:200,right:330,top:280,bottom:470},p=planBurst(640,844,head,0,rng(6));w.head=head;w.launch(p.x,p.y,640,844,p.scale,p);w.consumeEvents();w.head={left:p.x-40,right:p.x+40,top:p.y-50,bottom:p.y+50};for(let i=0;i<40;i++)w.update(.02,640,844,null);const events=w.consumeEvents();assert.equal(events.filter(e=>e.type==='flight-blocked').length,1);assert.equal(events.filter(e=>e.type==='burst').length,0);});
