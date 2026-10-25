import test from'node:test';import assert from'node:assert/strict';import{refinedCinemaShell,refinedCinemaChildren,REFINED_CINEMA_PALETTES,refinedPaletteIndex}from'../dist/cinema-refined-particles.mjs';import{refinedStrobeWhite,refinedDissolve,refinedGlintAlpha}from'../dist/cinema-refined-renderer.mjs';import{originalCinemaShell,originalCinemaChildren,RING_HUES}from'../dist/cinema-original-particles.mjs';import{StickerWorld}from'../dist/effects.mjs';
const rng=s=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296),seeds=[1972,0,251,682,1112,1542];
test('all six restored original palettes preserve original colours, trajectories and random sequence',()=>{
 for(const[index,seed]of seeds.entries()){
  const r=rng(seed),oldR=rng(seed),s=refinedCinemaShell(500,270,.9,r),old=originalCinemaShell(500,270,.9,oldR),palette=REFINED_CINEMA_PALETTES[index];
  assert.equal(r(),oldR());assert.equal(s.particles.length,366);assert.equal(s.tint,old.tint);assert.equal(s.tint,palette.outer);
  assert.ok(s.particles.every(v=>v.refinedPalette===index));assert.ok(s.particles.filter(v=>v.innerRay).every(v=>v.tint===palette.inner));
  for(let i=0;i<366;i++)for(const key of['tint','vx','vy','size','life'])assert.equal(s.particles[i][key],old.particles[i][key],key);
  const carriers=s.particles.filter(v=>v.ringCarrier);assert.equal(carriers.length,18);assert.equal(new Set(carriers.map(v=>v.repriseTint)).size,1);
  for(const carrier of carriers){const children=refinedCinemaChildren(carrier,rng(2)),original=originalCinemaChildren(carrier,rng(2));assert.ok(children.every((v,i)=>v.tint===carrier.repriseTint&&v.tint===original[i].tint));}
 }
});
test('first-wave fine strobes smoothly change from colour to white with independent transition times',()=>{
 for(const seed of[1,4,17,81]){const p={seed,maxLife:2.7};assert.equal(refinedStrobeWhite({...p,life:2.3}),0);assert.equal(refinedStrobeWhite({...p,life:.8}),1);const values=[.5,.8,1.1,1.4,1.8].map(age=>refinedStrobeWhite({...p,life:p.maxLife-age}));assert.ok(values.every((v,i)=>i===0||v>=values[i-1]));}assert.notEqual(refinedStrobeWhite({seed:1,maxLife:2.7,life:1.5}),refinedStrobeWhite({seed:4,maxLife:2.7,life:1.5}));
});
test('circular fragments remain alive and visibly blink after their split, then fade rather than vanish immediately',()=>{
 const shell=refinedCinemaShell(500,270,.9,rng(31)),carrier=shell.particles.find(p=>p.ringCarrier),children=refinedCinemaChildren(carrier,rng(31));for(const p of children){assert.ok(p.fragmentLinger>=.48&&p.fragmentLinger<=.70);const shellTime=3.45,age=shellTime-.85,current={...p,life:p.maxLife-age},e=refinedDissolve(current,shellTime);assert.equal(e.split,1);assert.ok(current.life>.25);assert.ok([0,1,2].some(k=>refinedGlintAlpha(current,e,k)>.15));const end={...current,life:0};assert.equal(refinedGlintAlpha(end,e,0),0);}
});
test('extended reprises stay bounded during continuous emission at low and full quality, and completely clear',()=>{
 for(const limit of[150,700]){const w=new StickerWorld(rng(31));w.setStyle('cinema');w.setPattern('cinema-refined');w.setEffect('laugh');w.limit=limit;for(let i=0;i<900;i++){if(i%75===0&&i<450)w.burst(900,280,.9);w.update(.02,1800,1800,null);assert.ok(w.particles.length<=limit&&w.pendingParticles.length<=limit);assert.ok(w.particles.every(p=>Number.isFinite(p.x+p.y)));}assert.equal(w.particles.length,0);assert.equal(w.pendingParticles.length,0);}
});

test('a sparse set of ending glints survives the next overlapping launch instead of disappearing together under pressure',()=>{const w=new StickerWorld(rng(31));w.setStyle('cinema');w.setPattern('cinema-refined');w.setEffect('laugh');for(let i=0;i<355;i++){if(i%150===0)w.burst(900,280,.9);w.update(.01,1800,1800,null);}const first=w.particles.filter(p=>p.ringBlob&&p.shellStartedAt===0&&p.ringAnchor);assert.ok(first.length>=24);assert.ok(first.every(p=>p.retireRemaining==null));assert.ok(first.some(p=>refinedGlintAlpha(p,refinedDissolve(p,w.simulationTime),0)>.10));assert.ok(w.particles.length<=700);});

test('playback retains the original palette diversity without isolated off-colour reprise sites',()=>{
 const counts=Array(6).fill(0),secondary=new Set();
 for(let i=0;i<600;i++){
  const seed=i*73,s=refinedCinemaShell(500,270,1,rng(seed)),carriers=s.particles.filter(p=>p.ringCarrier);counts[carriers[0].refinedPalette]++;
  const tints=new Set(carriers.flatMap(p=>refinedCinemaChildren(p,rng(i)).map(c=>c.tint)));
  assert.equal(tints.size,1,'every reprise site in one shell must share a colour');secondary.add([...tints][0]);
 }
 assert.ok(counts.every(n=>n>70&&n<130));assert.equal(secondary.size,RING_HUES.length);
 for(let i=0;i<6;i++)assert.equal(refinedPaletteIndex((i+.5)/6),i);
});
