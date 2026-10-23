import test from 'node:test';import assert from 'node:assert/strict';import{StickerWorld}from'../dist/effects.mjs';import{ACTIVE_PATTERNS,shellParticles,boundsDistance}from'../dist/pyro.mjs';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('all five paper openings use the chrysanthemum component size and population; derived openings retain its geometry',()=>{
 for(const pattern of ACTIVE_PATTERNS){const p=shellParticles(pattern,900,200,1,false,rng(22)).particles;assert.ok(p.length>=68&&p.length<=84);assert.ok(p.every(p=>p.size>=13&&p.size<=26&&p.type==='star'&&[4,5,6].includes(p.starPoints)));}
 const geom=p=>p.map(p=>[p.x,p.y,p.vx,p.vy,p.size,p.type,p.variant]);const base=geom(shellParticles('chrysanthemum',900,200,1,false,rng(3)).particles);for(const p of['chrysanthemum-double','chrysanthemum-inner'])assert.deepEqual(geom(shellParticles(p,900,200,1,false,rng(3)).particles),base);
});
test('base and heart fire once; willow and outer reprise use finite descending second flowers',()=>{
 for(const style of['sticker','coherent','cinema'])for(const pattern of['chrysanthemum','heart','willow','chrysanthemum-double']){
  const w=new StickerWorld(rng(71));w.setStyle(style);w.setEffect('laugh');w.burst(900,300,.8,pattern);let second=0,descended=false;
  for(let i=0;i<450;i++){const carriers=w.particles.filter(p=>p.carrier);w.update(.02,1800,1600,null);for(const e of w.consumeEvents())if(e.type==='crackle'){second++;assert.equal(e.stage,2);descended ||=carriers.some(p=>p.life<=0&&p.vy>22);}
   assert.ok(w.particles.length<=700&&w.blooms.length<=80);assert.ok(w.particles.filter(p=>p.secondary).every(p=>!p.carrier&&!p.flowerCarrier&&!p.flowerAt&&!p.splitAt));}
  if(['chrysanthemum','heart'].includes(pattern))assert.equal(second,0);else assert.ok(second>0&&second<=8&&descended);assert.equal(w.particles.length,0);assert.equal(w.afterglows.length,0);
 }
});
test('inner reprise fires once at the same centre, later and smaller than its paper outer shell',()=>{
 const w=new StickerWorld(rng(15));w.setStyle('coherent');w.setEffect('laugh');w.burst(900,240,1,'chrysanthemum-inner');for(let i=0;i<30;i++)w.update(.02,1800,1500,null);assert.ok(w.particles.every(p=>!p.secondary));let events=0;
 for(let i=0;i<16;i++){w.update(.02,1800,1500,null);events+=w.consumeEvents().filter(e=>e.inner).length;}
 const outer=w.particles.filter(p=>!p.secondary),inner=w.particles.filter(p=>p.secondary),radius=ps=>Math.max(...ps.map(p=>Math.hypot(p.x-900,p.y-240)));
 assert.equal(events,1);assert.ok(inner.length>0);assert.ok(radius(inner)<radius(outer)*.75);assert.ok(w.blooms.some(b=>b.secondary&&b.x===900&&b.y===240));assert.equal(new Set(inner.map(p=>p.tint)).size,1);
 for(let i=0;i<400;i++)w.update(.02,1800,1500,null);assert.equal(w.innerBursts.length,0);assert.equal(w.particles.length,0);
});
test('new inner stage is budget bounded, checks head clearance and cancels on explicit changes',()=>{
 for(const style of['sticker','coherent','cinema']){const w=new StickerWorld(rng(10));w.limit=150;w.setStyle(style);w.setEffect('laugh');w.burst(900,200,1,'chrysanthemum-inner');let seen=false;for(let i=0;i<200;i++){w.update(.02,1800,1500,null);seen ||=w.particles.some(p=>p.secondary);assert.ok(w.particles.length<=150);}assert.ok(seen);}
 for(const action of['head','clear','effect','style']){const w=new StickerWorld(rng(5));w.setEffect('laugh');w.burst(900,200,1,'chrysanthemum-inner');w.consumeEvents();if(action==='head')w.head={left:850,right:950,top:150,bottom:250};if(action==='clear')w.clear();if(action==='effect')w.setEffect('smile');if(action==='style')w.setStyle('coherent');for(let i=0;i<60;i++)w.update(.02,1800,1500,null);assert.equal(w.consumeEvents().filter(e=>e.inner).length,0);assert.equal(w.innerBursts.length,0);}
});

test('relaxing during the new inner flight still shows its second round in all materials',()=>{for(const style of['sticker','coherent','cinema']){const w=new StickerWorld(rng(15));w.setStyle(style);w.setPattern('chrysanthemum-inner');w.requestEffect('laugh');w.launch(700,180,1400,1400);for(let i=0;i<8;i++)w.update(.02,1400,1400,null);w.requestEffect('neutral');let inner=0;for(let i=0;i<180;i++){w.update(.02,1400,1400,null);inner+=w.consumeEvents().filter(e=>e.inner).length;}assert.equal(inner,1);assert.equal(w.effect,'neutral');assert.equal(w.innerBursts.length,0);}});

test('paper stars contain four, five and six points, with no rectangular confetti',()=>{for(const name of ACTIVE_PATTERNS){const p=shellParticles(name,0,0,1,false,rng(12)).particles;assert.deepEqual([...new Set(p.map(p=>p.starPoints))].sort(),[4,5,6]);assert.ok(p.every(p=>p.type==='star'));}});
