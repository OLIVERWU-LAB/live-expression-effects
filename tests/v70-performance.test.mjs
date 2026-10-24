import test from'node:test';import assert from'node:assert/strict';import{readFileSync,statSync}from'node:fs';import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
import{planBurst,burstIsSafe}from'../dist/pyro.mjs';import{StickerWorld}from'../dist/effects.mjs';import{ACTIVE_FLAT_PATTERNS}from'../dist/flat-fireworks.mjs';import{prioritizeFlat,thinFlat,fitFlatViewport}from'../dist/flat-budget.mjs';import{performanceProfile}from'../dist/performance-profile.mjs';import{headPolygon}from'../dist/core.mjs';import{GIFT_BANKS}from'../dist/gift-banks.mjs';import{liveFiles}from'../tools/live-files.mjs';
const file=p=>new URL('../dist/'+p,import.meta.url),rng=s=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
test('normal close portrait heads have an immediate legal burst region; occupied sky remains blocked',()=>{
 for(const [w,h]of[[320,640],[390,844],[430,932]])for(const top of[100,160,220])for(let side=0;side<4;side++){const b={left:w*.25,right:w*.75,top,bottom:top+250},p=planBurst(w,h,b,side,rng(side));assert.ok(p,`${w}/${top}/${side}`);assert.ok(burstIsSafe(p,b));assert.ok(p.y>=28);}
 assert.equal(planBurst(320,640,{left:0,right:320,top:0,bottom:640}),null);
});
test('low budgets preserve radial coverage of every cluster instead of only the first flowers',()=>{
 const particles=[];for(let clusterIndex=0;clusterIndex<5;clusterIndex++)for(let flatBand=0;flatBand<2;flatBand++)for(let i=0;i<24;i++)particles.push({flatRole:'comet',clusterIndex,flatBand,angle:i/24*Math.PI*2,flatDensity:.18});
 for(const selected of[thinFlat(particles),prioritizeFlat(particles,60)])for(let c=0;c<5;c++)for(let b=0;b<2;b++){const group=selected.filter(p=>p.clusterIndex===c&&p.flatBand===b);assert.ok(group.length>=6);const sectors=new Set(group.map(p=>Math.floor((p.angle+.00001)/(Math.PI*2)*6)));assert.equal(sectors.size,6);}
});
test('portrait launch composition keeps five flowers mostly visible and finish at low frame cadence without queued births',()=>{
 for(const width of[320,390,430])for(const key of ACTIVE_FLAT_PATTERNS)for(const limit of[150,300,420]){
  const world=new StickerWorld(rng(31));world.setStyle('flat');world.setEffect('laugh');world.limit=limit;world.viewport={width,height:844};world.head={left:width*.28,right:width*.72,top:160,bottom:450};const plan=fitFlatViewport(planBurst(width,844,world.head,0,rng(3)),width,844,world.head);world.burst(plan.x,plan.y,plan.scale,key,.5,plan.flatSeed);const flowers=new Map();let queue=0;
  for(let f=0;f<180;f++){world.update(1/30,width,844,null);queue=Math.max(queue,world.pendingParticles.length);assert.ok(world.particles.length<=limit);for(const p of world.particles)if(p.clusterIndex!=null&&p.flatEmitAt==null&&!p.flatFine&&!['dust','ring'].includes(p.flatRole)&&p.life>.4&&p.delay<=0){if(!flowers.has(p.clusterIndex))flowers.set(p.clusterIndex,{seen:0,visible:0});const g=flowers.get(p.clusterIndex);g.seen++;if(p.x>=0&&p.x<=width&&p.y>=0&&p.y<844)g.visible++;}}
  assert.equal(world.events.filter(e=>e.stage===2).length,5,`${width}/${key}/${limit}`);assert.equal(flowers.size,5);for(const g of flowers.values())assert.ok(g.visible/g.seen>.90,`${width}/${key}/${limit}: ${g.visible/g.seen}`);assert.equal(queue,0);assert.equal(world.particles.length,0);
 }
});
test('mobile and low-core desktops have bounded initial pixels, particles and temporal tail samples',()=>{
 const mobile=performanceProfile({width:390,height:844,cores:8,memory:8}),low=performanceProfile({width:1280,height:720,cores:2,memory:2});assert.ok(mobile.particles<=420&&low.particles<=300);assert.ok(mobile.pixels<=550000&&low.pixels<=360000);assert.equal(mobile.trailStep,.032);assert.equal(low.matte,512);assert.equal(performanceProfile({reduced:true}).particles,180);
});
test('delivery retains exact original face, body and hand models in compressed form',()=>{
 const files=liveFiles();assert.ok(files.includes('vision.worker.js'));assert.ok(!files.some(p=>p.includes('compact')));assert.ok(!files.some(p=>/\.wasm$|\.task$/.test(p)));let total=0;
 for(const name of['face_landmarker.task','hand_landmarker.task','selfie_segmenter.tflite']){const path='vendor/compressed/'+name+'.gz';assert.ok(files.includes(path));const packed=readFileSync(file(path)),hashes={'face_landmarker.task':'64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff','hand_landmarker.task':'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1','selfie_segmenter.tflite':'191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b'};assert.equal(createHash('sha256').update(gunzipSync(packed)).digest('hex'),hashes[name]);total+=packed.length;}
 assert.ok(total<9400000);assert.ok(files.reduce((n,p)=>n+statSync(file(p)).size,0)<16500000);for(const p of['vendor/LICENSE-APACHE-2.0.txt','vendor/THIRD_PARTY_NOTICES.txt'])assert.ok(files.includes(p));
});
test('two shared gift atlases bound network and decoded memory and contain all live layout components',()=>{
 let bytes=0;for(const bank of Object.values(GIFT_BANKS)){const data=readFileSync(file(bank.url));assert.equal(data.subarray(0,4).toString(),'RIFF');assert.equal(data.subarray(8,12).toString(),'WEBP');bytes+=data.length;assert.equal(Object.keys(bank.items).length,31);for(const view of Object.values(bank.items)){assert.equal(view.tile,80);assert.ok(view.frames<=8);assert.ok(view.x+view.frames*80<=1920&&view.y+80<=880);}for(const kind of['star','bead','ring','ribbon','coil','fourstar','cube','triangle','cylinder','wave','capsule'])assert.ok(Object.keys(bank.items).some(k=>k.startsWith(kind)));}assert.ok(bytes<450000,bytes);assert.ok(2*1920*880*4<14000000);
});

test('flat camera drawing uses the native video without full-frame copies or WebGL uploads',async()=>{
 const {Renderer}=await import('../dist/renderer.mjs');let copies=0,uploads=0;const noop=()=>{},g=new Proxy({},{get:(o,k)=>o[k]||noop}),bg=new Proxy({clearRect(){copies++;},fillRect(){copies++;},drawImage(){copies++;}},{get:(o,k)=>o[k]||noop});
 const target={ctx:g,baseCtx:bg,width:390,height:844,night:0,lastTime:0,canvas:{style:{}},drawMs:0,optics:{canvas:{},lost:false,render(){uploads++;}},matteFrame:noop,rockets:noop,atmosphere:noop,lingering:noop,stickers:noop,occludeFireworks:noop,collisionForeground:noop,water:noop};const video={readyState:4,style:{},videoWidth:640,videoHeight:480};
 Renderer.prototype.draw.call(target,{style:'flat',effect:'laugh',water:{}},{time:16,camera:true,video});assert.equal(copies,0);assert.equal(uploads,0);assert.equal(target.canvas.style.visibility,'visible');assert.equal(target.optics.canvas.hidden,true);assert.match(video.style.filter,/brightness/);
});
