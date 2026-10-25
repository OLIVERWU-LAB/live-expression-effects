import test from 'node:test';
import assert from 'node:assert/strict';
import {StickerWorld} from '../dist/effects.mjs';
import {flatShell,flatChildren,ACTIVE_FLAT_PATTERNS} from '../dist/flat-fireworks.mjs';
import {flatRandom} from '../dist/flat-placement.mjs';
import {planLiveFirework} from '../dist/firework-playback.mjs';

function equalGaps(ps){
 const groups=new Map();
 for(const p of ps.filter(p=>p.flatRadialIndex!=null&&!p.flatFine&&p.flatRole!=='dust')){
  const key=[p.emitterId,p.clusterIndex,p.flatBand].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);
 }
 for(const group of groups.values()){
  const angles=group.map(p=>(Math.atan2(p.vy,p.vx)+Math.PI*2)%(Math.PI*2)).sort((a,b)=>a-b),step=Math.PI*2/angles.length;
  assert.ok(angles.length>=2);
  for(let i=0;i<angles.length;i++)assert.ok(Math.abs(((angles[(i+1)%angles.length]-angles[i]+Math.PI*2)%(Math.PI*2))-step)<1e-8,`unequal visible gaps in ${group[0].pattern}/${group[0].flatBand}/${group.length}`);
 }
}
test('real admitted radial layers have equal adjacent angular gaps, including both rounds of phone thinning',()=>{
 for(const pattern of ACTIVE_FLAT_PATTERNS)for(const limit of[150,420,650]){
  const w=new StickerWorld(flatRandom(3));w.setStyle('flat');w.setEffect('laugh');w.limit=limit;w.viewport={width:390,height:844};
  const parent=flatShell(195,100,.46,flatRandom(8),pattern).particles[0],children=flatChildren(parent,flatRandom(11)).map(p=>({...p,flatMobile:true,flatDensity:Math.max(.12,(limit-20)/700)}));
  const kept=w.fitBatch(children,.7);equalGaps(kept);assert.equal(w.pendingParticles.length,0);assert.ok(kept.some(p=>p.flatRing));assert.ok(kept.some(p=>p.whiteFlash));
  if(pattern==='flat-star-crown'){const crown=kept.filter(p=>p.outerGlints&&p.flatRole==='star');assert.equal(crown.length,limit>=420?8:4);assert.ok(!kept.some(p=>p.crownSatellite));}
 }
});
test('actual four flower births keep visibly separated centres and a uniform full bloom scale',()=>{
 const counts=new Set();
 for(const[width,height,top]of[[390,844,160],[390,844,260],[1280,720,160],[1280,720,240]])for(const center of[.3,.5,.7])for(let seed=0;seed<4;seed++){
  const head={left:width*center-(width<650?82:125),right:width*center+(width<650?82:125),top,bottom:top+250},w=new StickerWorld(flatRandom(seed));w.setStyle('flat');w.setEffect('laugh');w.setPattern('flat-star-crown');w.viewport={width,height};w.head=head;w.limit=width<650?420:650;
  const plan=planLiveFirework(w,width,height,head,seed,flatRandom(seed+31));assert.ok(plan);assert.ok(plan.flatSpreadScale>=plan.scale*.58);assert.ok(w.launch(plan.x,plan.y,width,height,plan.scale,plan));
  const births=new Map();let expected;
  for(let f=0;f<360;f++){w.update(1/60,width,height,null);for(const e of w.consumeEvents())if(e.type==='burst')expected=e.flowerCount;for(const p of w.particles)if(p.cascadeChild&&!births.has(p.clusterIndex))births.set(p.clusterIndex,p);assert.equal(w.pendingParticles.length,0);assert.ok(w.particles.length<=w.limit);}
  assert.equal(births.size,expected);assert.equal(expected,4);counts.add(expected);
  const ps=[...births.values()];for(let i=0;i<ps.length;i++){assert.ok(Math.abs(ps[i].scale-plan.scale*.78)<1e-9);for(let j=i+1;j<ps.length;j++)assert.ok(Math.hypot(ps[i].birthX-ps[j].birthX,ps[i].birthY-ps[j].birthY)>90*plan.scale,'flower centres clustered together');}
  assert.equal(w.particles.length,0);
 }
 assert.deepEqual([...counts].sort(),[4]);
});
test('white chips continue flickering visibly after coloured heads finish, then clear completely',()=>{
 for(const pattern of ACTIVE_FLAT_PATTERNS){
  const w=new StickerWorld(flatRandom(11));w.setStyle('flat');w.setEffect('laugh');w.particles=flatChildren(flatShell(600,200,.8,flatRandom(8),pattern).particles[0],flatRandom(9));let lastColor=0,lastWhite=0;
  for(let f=0;f<360;f++){w.update(1/60,1280,720,null);if(w.particles.some(p=>!p.flatFine&&!p.whiteFlash&&p.flatRole!=='ring'))lastColor=f/60;if(w.particles.some(p=>p.whiteFlash&&p.life>.06))lastWhite=f/60;}
  assert.ok(lastWhite-lastColor>=.35&&lastWhite-lastColor<=1.1,`${pattern}: white finish ${lastWhite-lastColor}`);assert.equal(w.particles.length,0);
 }
});
