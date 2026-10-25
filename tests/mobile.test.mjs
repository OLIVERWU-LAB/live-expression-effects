import{fitFlatViewport}from'../dist/flat-budget.mjs';
import test from'node:test';import assert from'node:assert/strict';
import{VisionSession}from'../dist/vision-session.mjs';import{StickerWorld}from'../dist/effects.mjs';import{ACTIVE_FLAT_PATTERNS}from'../dist/flat-fireworks.mjs';import{personRimGain}from'../dist/optics.mjs';import{loadGiftBank,loadGiftImage}from'../dist/gift-loader.mjs';import{rainRate}from'../dist/rain-style.mjs';
const rng=s=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296),flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function harness(bitmap=async()=>({close(){}})){
 let now=0,id=0;const timers=new Map(),workers=[],events=[],errors=[],states=[];
 const session=new VisionSession({createBitmap:bitmap,createWorker:()=>{const w={posts:[],dead:false,postMessage(d){this.posts.push(d);},terminate(){this.dead=true;},emit(data){this.onmessage({data});}};workers.push(w);return w;},onEvent:e=>events.push(e),onError:(e,p)=>errors.push(p),onState:s=>states.push(s),setTimer:(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;},clearTimer:id=>timers.delete(id)});
 return{session,workers,events,errors,states,async ready(){const p=session.start();workers.at(-1).emit({type:'ready'});workers.at(-1).emit({type:'models-ready'});await p;},async advance(ms){const end=now+ms;while(true){const entry=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;now=entry[1].at;timers.delete(entry[0]);entry[1].fn();await flush();}now=end;await flush();}};
}
test('recognition restarts automatically after a hung frame, rejects late results, and keeps one active worker',async()=>{
 const h=harness();await h.ready();const old=h.workers[0];assert.equal(h.session.capture({},{}),true);assert.equal(h.session.capture({},{}),false);await flush();const first=old.posts.at(-1);await h.advance(12000);assert.ok(old.dead);assert.equal(h.session.ready,false);assert.ok(h.states.at(-1).recovering);await h.advance(750);assert.equal(h.workers.length,2);const current=h.workers[1];current.emit({type:'ready'});current.emit({type:'models-ready'});old.emit({type:'result',frameId:first.frameId});assert.equal(h.events.filter(e=>e.type==='result').length,0);h.session.capture({},{});await flush();current.emit({type:'result',frameId:current.posts.at(-1).frameId,inferenceMs:40});assert.equal(h.session.pending,false);assert.equal(h.session.attempt,0);assert.equal(h.workers.filter(w=>!w.dead).length,1);
});
test('isolated bad camera frames are dropped; three consecutive failures trigger recovery',async()=>{
 const h=harness(async()=>{throw Error('Frame unavailable');});await h.ready();for(let i=0;i<3;i++){h.session.capture({});await flush();if(i<2)assert.ok(h.session.ready);}assert.equal(h.errors.filter(p=>p==='dropped-frame').length,2);assert.equal(h.session.ready,false);await h.advance(750);assert.equal(h.workers.length,2);
});
test('background pause cancels retries and a late bitmap cannot clear a new frame watchdog',async()=>{
 const resolve=[];let closed=0;const h=harness(()=>new Promise(r=>resolve.push(r)));await h.ready();h.session.capture({});await flush();h.session.pause();h.session.resume();h.session.capture({});await flush();resolve[0]({close(){closed++;}});await flush();assert.equal(closed,1);assert.equal(h.session.pending,true);await h.advance(12000);h.session.pause();await h.advance(30000);assert.equal(h.workers.length,1);h.session.resume();await flush();assert.equal(h.workers.length,2);
});
test('optional model startup has a grace period, then normal inference returns to a bounded timeout',async()=>{
 const h=harness(),p=h.session.start();h.workers[0].emit({type:'ready'});await p;h.session.capture({});await flush();await h.advance(8000);assert.ok(h.session.ready);h.workers[0].emit({type:'models-ready'});await h.advance(12000);assert.equal(h.session.ready,false);await h.advance(750);assert.equal(h.workers.length,2);
});
test('repeated initialization failures keep recovering with bounded backoff until the worker succeeds',async()=>{
 const h=harness();h.session.start().catch(()=>{});for(let i=0;i<7;i++){h.workers.at(-1).emit({type:'error',phase:'init',message:'Temporary model failure'});await h.advance(8000);}assert.equal(h.workers.length,8);h.workers.at(-1).emit({type:'ready'});h.workers.at(-1).emit({type:'models-ready'});assert.equal(h.session.ready,true);h.session.capture({});await flush();h.workers.at(-1).emit({type:'result',frameId:h.session.frameId});assert.equal(h.session.attempt,0);
});
test('all portrait rain fields are populated across their width without exceeding the low particle budget',()=>{
 for(const [width,height]of[[360,780],[390,844],[430,932]])for(const style of['cinema','gift','flat']){const w=new StickerWorld(rng(31));w.limit=150;w.setStyle(style);w.setEffect('smile');let counts=[];const sectors=new Set();for(let i=0;i<480;i++){w.rain(1/60,width,height,.35);w.update(1/60,width,height,null);assert.ok(w.particles.length<=150);if(i>120){const visible=w.particles.filter(p=>p.type==='drop'&&!p.generation&&p.x>=0&&p.x<width&&p.y>0&&p.y<height);counts.push(visible.length);for(const p of visible)if(p.y>height*.5)sectors.add(Math.floor(p.x/width*6));}}const mean=counts.reduce((a,b)=>a+b)/counts.length;assert.ok(mean>=30,`${style}/${width}: ${mean}`);assert.equal(sectors.size,6,style+' lower coverage');}
 assert.equal(rainRate('gift',1000,700,.35),1.4*(1000/24)*.96);
});
test('every flat flower keeps all three or four carriers and inner layers on portrait at every budget and frame cadence',()=>{
 for(const limit of[150,350,700])for(const key of ACTIVE_FLAT_PATTERNS)for(const dt of[1/60,1/30]){const w=new StickerWorld(rng(31));w.limit=limit;w.setStyle('flat');w.setEffect('laugh');w.burst(195,150,.74,key);let wait=0;const layers=new Set();for(let i=0;i<Math.ceil(6/dt);i++){const before=[...w.particles];w.update(dt,390,844,null);for(const p of before)if(p.flatRole!=='dust'&&!p.flatFine){assert.equal(p.retireRemaining,undefined);if(!w.particles.includes(p))assert.ok(p.life<=0,'live structure was culled');}for(const p of w.particles)if(p.innerPetal)layers.add(p.petalLayer||2);wait=Math.max(wait,w.pendingParticles.length);assert.ok(w.particles.length<=limit);}assert.equal(w.events.filter(e=>e.stage===2).length,w.lastFlatFlowerCount,`${key}/${limit}`);if(key==='flat-petals')assert.ok(layers.has(2)&&layers.has(3));assert.equal(wait,0,'no delayed structural births');assert.equal(w.particles.length,0);}
});
test('flat emitters outside the narrow viewport are retained until they emit instead of dropping a whole flower',()=>{
 const w=new StickerWorld(rng(31));w.setStyle('flat');w.setEffect('laugh');w.burst(-170,160,.74,'flat-petals');for(let i=0;i<300;i++)w.update(.02,390,844,null);assert.equal(w.events.filter(e=>e.stage===2).length,5);
});
test('person reflection is disabled for flat and enhanced for realistic fireworks',()=>{assert.equal(personRimGain('flat'),0);assert.equal(personRimGain('cinema'),1.6);assert.equal(personRimGain('gift'),0);});
test('gift loading caps concurrent decodes, releases partial images on failure and allows a clean retry',async()=>{
 const entries=Array.from({length:25},(_,i)=>({key:String(i),url:String(i)}));let active=0,peak=0,closed=0;
 const load=async url=>{active++;peak=Math.max(peak,active);await flush();active--;if(url==='5')throw Error('network');return{close(){closed++;}};};await assert.rejects(loadGiftBank(entries,96,load));assert.ok(peak<=4);assert.ok(closed>=5);assert.equal(active,0);assert.equal((await loadGiftBank(entries,96,async()=>({}))).size,25);
});
test('mobile atlas decode preserves pose count while bounding the decoded tile to 96 pixels',async()=>{
 const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap;let options;const bytes=new Uint8Array(24),view=new DataView(bytes.buffer);view.setUint32(0,0x89504e47);view.setUint32(16,2048);view.setUint32(20,128);
 globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob([bytes])});globalThis.createImageBitmap=async(blob,o)=>(options=o,{width:o.resizeWidth,height:o.resizeHeight});try{const image=await loadGiftImage('test.png',96);assert.equal(image.width/image.height,16);assert.deepEqual(options,{resizeHeight:96,resizeWidth:1536,resizeQuality:'high'});}finally{globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;}
});

test('portrait fits the launch as one composition and retains natural particle lifetimes and desktop scale',()=>{
 const plan={x:195,y:140,scale:.74,radius:152},layout=fitFlatViewport(plan,390,844);assert.equal(layout.x,plan.x);assert.ok(layout.y>=plan.y);assert.ok(layout.scale>.4);assert.equal(fitFlatViewport(plan,1200,800),plan);
 for(const key of ACTIVE_FLAT_PATTERNS)for(const seed of[1,7,31]){const w=new StickerWorld(rng(seed));w.setStyle('flat');w.setEffect('laugh');w.viewport={width:390,height:844};w.burst(layout.x,layout.y,layout.scale,key);const seen=new Set();for(let i=0;i<240;i++){const before=[...w.particles];w.update(1/60,390,844,null);for(const p of before)if(!w.particles.includes(p))assert.ok(p.life<=0,'leaving an edge must not delete a live component');for(const p of w.particles)if(p.clusterIndex!=null)seen.add(p.clusterIndex);}assert.equal(seen.size,w.lastFlatFlowerCount);}
});

test('an optional silhouette inference failure leaves real worker face results running',async()=>{
 const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm');const messages=[];let closed=0;const scope={fetch:async()=>{},location:{href:'https://example.test/vision.worker.js'},performance:{now:()=>100},postMessage:d=>messages.push(d),importScripts(){},URL,Blob,Uint8Array,Math};scope.self=scope;
 runInNewContext(readFileSync(new URL('../dist/vision.worker.js',import.meta.url),'utf8')+"\nfaceModel={detectForVideo(){return{faceLandmarks:[[{}]],faceBlendshapes:[{categories:[{categoryName:'mouthSmileLeft',score:.7},{categoryName:'mouthSmileRight',score:.7}]}]};}};segmenter={segmentForVideo(){throw Error('Optional model failed');},close(){}};",scope);
 for(let i=1;i<=2;i++)await scope.onmessage({data:{type:'frame',frameId:i,timestamp:1000+i*200,bitmap:{close(){closed++;}}}});
 assert.equal(messages.filter(m=>m.type==='segmentation-error').length,1);assert.equal(messages.filter(m=>m.type==='error').length,0);assert.equal(messages.filter(m=>m.type==='result'&&m.smile===.7).length,2);assert.equal(closed,2);
});
