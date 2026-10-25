import test from 'node:test';
import assert from 'node:assert/strict';
import {StickerWorld} from '../dist/effects.mjs';
import {planLiveFirework,fireworkLaunchBusy,fireworkLaunchGap} from '../dist/firework-playback.mjs';
import {flatRandom,flatFlowerSites,flatSitesClear} from '../dist/flat-placement.mjs';
import {cinemaShell} from '../dist/reference-bursts.mjs';
import {ACTIVE_FLAT_PATTERNS} from '../dist/flat-fireworks.mjs';

test('desktop head offsets preserve both launch sides and complete safe flat bouquets',()=>{
 for(const center of [.3,.5,.7])for(const index of [0,1]){
  const w=new StickerWorld(flatRandom(17));w.setStyle('flat');
  const head={left:1280*center-125,right:1280*center+125,top:240,bottom:500};
  const layout=planLiveFirework(w,1280,720,head,index,flatRandom(31));assert.ok(layout);
  assert.ok(Math.abs(layout.x-layout.launchX)<=1280*.16);
  assert.ok(Math.abs(layout.x-layout.launchX)/(720+22-layout.y)<=.25+1e-10);
  // Prefer alternating halves while keeping ascent aligned with its safe apex.
  assert.equal(layout.requestedSide,index?'right':'left');
  assert.ok(flatSitesClear(flatFlowerSites(layout.scale,layout.flatSeed,layout.flatSpreadScale),layout.x,layout.y,layout.scale,head,1280,720));
 }
});
test('all styles alternate launch origins on desktop and phone without steering their radial particles',()=>{
 for(const style of ['cinema','gift','flat'])for(const [width,height,top] of [[960,576,238],[390,844,260]]){
  const w=new StickerWorld(flatRandom(3));w.setStyle(style);
  const head={left:width*.38,right:width*.62,top,bottom:top+180};
  for(let index=0;index<4;index++){
   const p=planLiveFirework(w,width,height,head,index,flatRandom(index+7));assert.ok(p,style);
   assert.equal(p.requestedSide,index%2?'right':'left');
   if(style==='flat')assert.ok(Math.abs(p.x-p.launchX)<=Math.min(width*.16,(height+22-p.y)*.25)+1e-8);
   else assert.equal(p.launchX,index%2?width-Math.max(24,width*.1):Math.max(24,width*.1));
  }
 }
});
test('new cinematic rays collide at the first swept crossing, before the former delay and while rising',()=>{
 for(const vy of [-25,30]){
  const w=new StickerWorld(flatRandom(31));w.setStyle('cinema');w.setEffect('laugh');
  const p={...cinemaShell('cinema-shell',95,120,.6,flatRandom(2)).particles.find(p=>!p.cinemaDust),x:95,y:120,vx:260,vy,delay:0,collisionDelay:.65};w.particles=[p];
  w.update(1/30,220,260,[{x:100,y:20},{x:190,y:20},{x:190,y:220},{x:100,y:220}]);
  assert.equal(w.collisions,1);assert.ok(p.hasCollided&&p.wallAge<.1&&p.x<100);
  for(let i=0;i<6;i++)w.update(1/60,220,260,null);assert.equal(w.collisions,1);
 }
});
test('continuous flat playback overlaps launches and includes all three forms without resetting live particles',()=>{
 const w=new StickerWorld(flatRandom(86));w.setStyle('flat');w.setEffect('laugh');w.viewport={width:960,height:576};
 w.head={left:411,right:533,top:238,bottom:383};w.limit=650;
 const random=flatRandom(209),starts=[],forms=new Set();let next=.1,index=0,overlaps=0;
 for(let frame=0;frame<18*60;frame++){
  const time=frame/60;
  if(time>=next&&!fireworkLaunchBusy(w)){
   const p=planLiveFirework(w,960,576,w.head,index,random);
   if(p&&w.launch(p.x,p.y,960,576,p.scale,p)){
    if(w.particles.length)overlaps++;starts.push(time);index++;next=time+fireworkLaunchGap(w.style,random)/1000;
   }
  }
  w.update(1/60,960,576,null);if(w.lastPattern)forms.add(w.lastPattern);w.events.length=0;
  assert.ok(w.particles.length<=650);
 }
 assert.ok(starts.length>=10);assert.ok(overlaps>=8);
 assert.deepEqual([...forms].sort(),[...ACTIVE_FLAT_PATTERNS].sort());
 for(let i=1;i<starts.length;i++)assert.ok(starts[i]-starts[i-1]>=1.4&&starts[i]-starts[i-1]<=1.52);
});
