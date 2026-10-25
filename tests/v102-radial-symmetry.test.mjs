import test from 'node:test';
import assert from 'node:assert/strict';
import {flatShell,flatChildren,ACTIVE_FLAT_PATTERNS} from '../dist/flat-fireworks.mjs';
import {thinFlat,prioritizeFlat} from '../dist/flat-budget.mjs';
import {flatRandom} from '../dist/flat-placement.mjs';
import {StickerWorld} from '../dist/effects.mjs';

function paired(ps){
 for(const p of ps.filter(p=>p.flatRadialIndex!=null)){
  const opposite=(p.flatRadialIndex+p.flatRadialCount/2)%p.flatRadialCount;
  const q=ps.find(q=>q.flatRole===p.flatRole&&q.flatBand===p.flatBand&&!!q.crownSatellite===!!p.crownSatellite&&q.flatRadialIndex===opposite);
  assert.ok(q,`missing opposite of ${p.flatRole}/${p.flatBand}/${p.flatRadialIndex}`);
  assert.ok(Math.abs(p.vx+q.vx)<1e-8&&Math.abs(p.vy+q.vy)<1e-8,'opposite rays must launch with equal and opposite velocity');
  assert.equal(p.x,q.x);assert.equal(p.y,q.y);assert.equal(p.gravity,q.gravity);assert.equal(p.drag,q.drag);
 }
}
test('all retained flat forms start radially symmetric, including phone and minimum-budget thinning',()=>{
 for(const pattern of ACTIVE_FLAT_PATTERNS)for(const seed of[1,11,71])for(const scale of[.46,1]){
  const random=flatRandom(seed),parents=flatShell(400,180,scale,random,pattern).particles;
  for(const parent of parents){
   parent.vx=330;parent.vy=-250;const full=flatChildren(parent,random);paired(full);
   for(const density of[.12,.3,.65,1])for(const budget of[21,30,65]){
    const chosen=prioritizeFlat(thinFlat(full.map(p=>({...p,flatMobile:true,flatDensity:density}))),budget);
    assert.ok(chosen.length<=budget);assert.ok(chosen.some(p=>p.flatRing));assert.ok(chosen.some(p=>p.whiteFlash));paired(chosen);
   }
  }
 }
});
test('gift rain has the flat rain slant and enters along the upstream edge without enlarging drops',()=>{
 for(const[width,height]of[[390,844],[1280,720]]){
  const w=new StickerWorld(flatRandom(9));w.setStyle('gift');w.setEffect('smile');w.viewport={width,height};w.limit=700;
  w.rain(1/60,width,height,1);assert.ok(w.particles.slice(0,24).every(p=>p.x>=0&&p.angle===-.23&&p.vx>0));
  w.particles=[];let side=0,top=0;
  for(let i=0;i<240;i++){w.rain(1/60,width,height,1);for(const p of w.particles){assert.equal(p.angle,-.23);assert.ok(p.vx>0);if(p.x===-24)side++;else{assert.equal(p.y,-45);top++;}}w.particles=[];}
  assert.ok(side>0&&top>side,'both entry edges supply the slanted rain field');
 }
});
