import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{WaterSurface,StickerWorld}from'../dist/effects.mjs';import{drawWaterSurface}from'../dist/water-renderer.mjs';import{personRimGain}from'../dist/optics.mjs';import{ExpressionController}from'../dist/core.mjs';
const rng=s=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296),read=p=>readFileSync(new URL('../dist/'+p,import.meta.url),'utf8');
test('camera uses the established face blendshapes, full silhouette and hands with unchanged thresholds',()=>{
 const worker=read('vision.worker.js'),app=read('app.mjs');assert.match(app,/cameraFrameReader\(480\)/);assert.match(app,/cameraFrameReader\(320\)/);assert.match(app,/role:'geometry'/);assert.ok(!app.includes('compact.worker'));
 assert.match(worker,/score\('mouthSmileLeft'\) \+ score\('mouthSmileRight'\)/);for(const token of['ImageSegmenter.createFromOptions','HandLandmarker.createFromOptions','outputConfidenceMasks: true','minFaceDetectionConfidence: .55'])assert.ok(worker.includes(token));
 const c=new ExpressionController();for(let t=0;t<=700;t+=50)c.sample(.35,t);assert.equal(c.state,'smile');for(let t=750;t<=1300;t+=50)c.sample(.6,t);assert.equal(c.state,'laugh');
 assert.equal(personRimGain('gift'),0);assert.equal(personRimGain('flat'),0);assert.equal(personRimGain('cinema'),1.6);
});
test('water retains smooth curves without decorative short waves or old high-frequency distortion',()=>{
 const water=new WaterSurface();water.level=80;water.impact(170,390,15);water.update(.15,844,true);let strokes=0,curves=0;const noop=()=>{},g=new Proxy({stroke(){strokes++;},bezierCurveTo(){curves++;},createLinearGradient(){return{addColorStop(){}};}},{get:(o,k)=>o[k]||noop});drawWaterSurface(g,water,390,844,false);assert.equal(strokes,1);assert.equal(curves,48);
 for(let x=0;x<390;x+=.25)assert.ok(Math.abs(water.surface(x,390,844)-water.surface(x+.25,390,844))<.3);assert.ok(!read('renderer.mjs').includes('i < 7'));assert.ok(!read('optics.mjs').includes('uv.y*110.'));
});
test('flat drops hitting water make a few round, rising splashes and never recurse',()=>{
 const world=new StickerWorld(rng(3));world.setStyle('flat');world.setEffect('smile');world.water.level=85;world.add({type:'drop',x:195,y:748,vx:40,vy:650,size:18,life:3,maxLife:3,generation:0,volume:18**3,angle:0,variant:0,touched:0,spin:0});let found=[];
 for(let i=0;i<10;i++){world.update(.016,390,844,null);const parts=world.particles.filter(p=>p.generation>0);if(parts.length){found=parts;break;}}
 assert.ok(found.length>=2&&found.length<=4);assert.ok(found.every(p=>p.flatRound&&p.vy<0&&p.noRecollision&&p.size<=8.5&&p.hitRegion==='water'));for(let i=0;i<80;i++)world.update(.016,390,844,null);assert.equal(world.particles.length,0);
});
test('mobile rain starts populated and maintains dense falling primary drops within the budget',()=>{
 for(const style of['flat','cinema']){const world=new StickerWorld(rng(4));world.setStyle(style);world.setEffect('smile');world.limit=300;world.rain(.016,390,844,.35);assert.ok(world.particles.filter(p=>p.y>0&&p.y<844).length>=20);let visible=[];for(let f=0;f<300;f++){world.rain(1/60,390,844,.35);world.update(1/60,390,844,null);if(f>90)visible.push(world.particles.filter(p=>!p.generation&&p.x>=0&&p.x<390&&p.y>0&&p.y<844).length);assert.ok(world.particles.length<=300);}assert.ok(visible.reduce((a,b)=>a+b)/visible.length>42,style);}
});
