import test from 'node:test';
import assert from 'node:assert/strict';
import {StickerWorld} from '../dist/effects.mjs';
import {planLiveFirework,fireworkLaunchBusy,fireworkLaunchGap} from '../dist/firework-playback.mjs';
import {flatRandom,flatViewportScale} from '../dist/flat-placement.mjs';
import {ACTIVE_FLAT_PATTERNS,drawFlatFireworks} from '../dist/flat-fireworks.mjs';

test('safe flat ascents stay near vertical rather than connecting opposite screen corners',()=>{
 for(const[width,height,top]of[[1280,720,160],[960,576,180],[390,844,160],[390,844,260]])for(const center of[.3,.5,.7])for(let side=0;side<2;side++)for(let seed=0;seed<8;seed++){
  const half=width<650?82:125,head={left:width*center-half,right:width*center+half,top,bottom:top+250};
  const p=planLiveFirework({style:'flat'},width,height,head,side,flatRandom(seed));assert.ok(p,JSON.stringify({width,center,side}));
  assert.equal(p.scale,flatViewportScale(width,height));assert.ok(Math.abs(p.x-p.launchX)<=Math.min(width*.16,(height+22-p.y)*.25)+1e-7);
  const w=new StickerWorld(flatRandom(1));w.setStyle('flat');w.setEffect('laugh');w.head=head;assert.ok(w.launch(p.x,p.y,width,height,p.scale,p));const rocket=w.rockets[0];
  for(let frame=0;frame<10;frame++){const y=rocket.y;w.update(rocket.duration/12,width,height,null);assert.ok(rocket.y<y,'ascent must keep rising');assert.ok(rocket.x>=Math.min(rocket.sx,rocket.tx)-1e-7&&rocket.x<=Math.max(rocket.sx,rocket.tx)+1e-7);}
 }
});

test('overlapping flat volleys admit every ring, every radial band and white glints within the device limit',()=>{
 let totalFlowers=0;
 for(const[width,height,top]of[[1280,720,240],[390,844,260]])for(const limit of[150,420,650])for(const fps of[15,60])for(const pattern of ACTIVE_FLAT_PATTERNS){
  const w=new StickerWorld(flatRandom(3));w.setStyle('flat');w.setEffect('laugh');w.setPattern(pattern);w.limit=limit;w.viewport={width,height};w.head={left:width*.38,right:width*.62,top,bottom:top+200};
  const fit=w.fitBatch.bind(w);let births=0,drawnRings=0;w.fitBatch=(particles,share)=>{
   const chosen=fit(particles,share),admitted=new Set([...chosen,...w.pendingParticles]);const groups=new Map();
   for(const p of particles.filter(p=>p.cascadeChild)){if(!groups.has(p.emitterId))groups.set(p.emitterId,[]);groups.get(p.emitterId).push(p);}
   for(const flower of groups.values()){
    births++;const kept=flower.filter(p=>admitted.has(p)),ring=flower.find(p=>p.flatRing);assert.ok(admitted.has(ring),`${width}/${limit}/${fps}/${pattern}: ring lost`);
    assert.ok(kept.some(p=>p.whiteFlash),'each flower keeps ending glints');
    const required=new Set(flower.filter(p=>!p.flatFine&&p.flatRole!=='dust'&&p.flatBand!=null).map(p=>p.flatRole+':'+p.flatBand));
    for(const band of required)assert.ok(kept.some(p=>p.flatRole+':'+p.flatBand===band),'radial band lost: '+band);
    let strokes=0;const g=new Proxy({stroke(){if(this.globalAlpha>0)strokes++;}},{get:(o,k)=>o[k]??(()=>{})});
    drawFlatFireworks(g,{particles:[{...ring,delay:0,life:ring.maxLife-.35}]});assert.ok(strokes>0,'admitted ring must really render');drawnRings++;
   }
   return chosen;
  };
  let index=0,next=0,expectedFlowers=0;const random=flatRandom(9);
  for(let frame=0;frame<fps*12;frame++){
   const t=frame/fps;if(t<8&&t>=next&&!fireworkLaunchBusy(w)){const p=planLiveFirework(w,width,height,w.head,index,random);if(p&&w.launch(p.x,p.y,width,height,p.scale,p)){index++;next=t+fireworkLaunchGap('flat',random)/1000;}}
   const slices=Math.ceil(60/fps);for(let n=0;n<slices;n++)w.update(1/fps/slices,width,height,null);
   for(const e of w.consumeEvents())if(e.type==='burst')expectedFlowers+=e.flowerCount;assert.ok(w.particles.length<=limit);assert.equal(w.pendingParticles.length,0,'no flowers delayed by a full particle pool');
  }
  assert.ok(index>=5);assert.equal(births,expectedFlowers);assert.equal(drawnRings,births);assert.equal(w.particles.length,0);totalFlowers+=births;
 }
 assert.ok(totalFlowers>=600);
});
