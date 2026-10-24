import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{runInNewContext}from'node:vm';import{webcrypto}from'node:crypto';import{cameraFrameReader}from'../dist/camera-frame.mjs';import{VisionSession}from'../dist/vision-session.mjs';
const base=new URL('../dist/',import.meta.url),pause=()=>new Promise(r=>setTimeout(r,0));
test('video bitmap failure uses one reusable canvas and preserves portrait aspect ratio',async()=>{
 let conversions=0,allocations=0,draws=0;const read=cameraFrameReader(480,{bitmap:async()=>{conversions++;throw Error('Video bitmap unsupported');},canvas:(w,h)=>{allocations++;return{width:w,height:h,getContext:()=>({drawImage(){draws++;}}),transferToImageBitmap:()=>({width:w,height:h})};}}),video={videoWidth:480,videoHeight:640};
 assert.deepEqual(await read(video),{width:480,height:640});await read(video);assert.equal(conversions,1);assert.equal(allocations,1);assert.equal(draws,2);
});
test('all compressed assets decompress to exactly the existing runtime and models; actual WASM compiles',async()=>{
 const scope={self:{},URL,Blob,Response,DecompressionStream,Uint8Array,crypto:webcrypto,performance,setTimeout,clearTimeout,AbortController};scope.self.location={href:'https://example.test/project/vision.worker.js'};scope.self.VISION_ASSETS={compressed:'https://example.test/project/vendor/compressed/'};runInNewContext(readFileSync(new URL('vision-pack.js',base),'utf8'),scope);runInNewContext(readFileSync(new URL('vision-download.js',base),'utf8'),scope);
 for(const [name,entry]of Object.entries(scope.self.VISION_PACK)){const events=[],bytes=await scope.self.loadVisionAsset('https://example.test/vendor/'+name,async url=>new Response(readFileSync(new URL('vendor/compressed/'+name+'.gz',base)),{headers:{'content-length':entry.packedBytes}}),e=>events.push(e),'wasm');const path=name.startsWith('vision_wasm')?'vendor/wasm/':'vendor/';assert.deepEqual(Buffer.from(bytes),readFileSync(new URL(path+name,base)));assert.ok(events.at(-1).loaded===entry.packedBytes);if(name==='vision_wasm_internal.wasm')assert.ok(await WebAssembly.compile(bytes));}
});
test('asset corruption is rejected explicitly and a missing packed file falls back to the original',async()=>{
 const data=Buffer.from('model'),sha=Buffer.from(await webcrypto.subtle.digest('SHA-256',data)).toString('hex'),scope={self:{location:{href:'https://test/worker.js'},VISION_ASSETS:{compressed:'https://test/compressed/'},VISION_PACK:{'model.task':{bytes:data.length,sha256:sha}}},URL,Blob,Response,DecompressionStream,Uint8Array,crypto:webcrypto,performance,setTimeout,clearTimeout,AbortController};runInNewContext(readFileSync(new URL('vision-download.js',base),'utf8'),scope);
 let calls=0;const bytes=await scope.self.loadVisionAsset('./model.task',async()=>++calls===1?new Response(null,{status:404}):new Response(data));assert.equal(calls,2);assert.deepEqual(Buffer.from(bytes),data);await assert.rejects(scope.self.loadVisionAsset('./model.task',async()=>new Response('wrong')),/校验失败/);
});
function worker(hungGeometry=false){
 const messages=[],calls=[],api={FilesetResolver:{forVisionTasks:async()=>({wasmLoaderPath:'https://test/vendor/wasm/vision_wasm_internal.js',wasmBinaryPath:'https://test/vendor/wasm/vision_wasm_internal.wasm'})},FaceLandmarker:{createFromOptions:async()=>{calls.push('face');return{detectForVideo:()=>({faceLandmarks:[[{}]],faceBlendshapes:[{categories:[{categoryName:'mouthSmileLeft',score:.8},{categoryName:'mouthSmileRight',score:.8}]}]})};}},ImageSegmenter:{createFromOptions:async()=>{calls.push('geometry');if(hungGeometry)return new Promise(()=>{});return{getLabels:()=>['background','person']};}},HandLandmarker:{createFromOptions:async()=>{calls.push('hands');return{};}}};
 const scope={fetch:async()=>new Response(new Uint8Array([1,2,3])),location:{href:'https://test/project/vision.worker.js'},VISION_ASSETS:{runtime:'./vendor/vision_bundle.cjs',model:'https://test/vendor/face_landmarker.task',wasm:'https://test/vendor/wasm'},caches:{open:()=>new Promise(()=>{})},performance,postMessage:d=>messages.push(d),importScripts(url){if(url.startsWith('blob:'))scope.module.exports=api;},URL,Blob,Response,Uint8Array,Math,setTimeout:(fn,ms)=>setTimeout(fn,ms===1200?0:ms),clearTimeout,loadVisionAsset:async(url,fetcher)=>new Uint8Array(await(await fetcher(url)).arrayBuffer())};scope.self=scope;runInNewContext(readFileSync(new URL('vision.worker.js',base),'utf8'),scope);return{scope,messages,calls};
}
test('mandatory face startup completes even when Cache Storage never responds, without loading auxiliary models',async()=>{
 const w=worker();await w.scope.onmessage({data:{type:'init',role:'face'}});assert.deepEqual(w.calls,['face']);assert.ok(w.messages.some(m=>m.type==='ready'));assert.ok(w.messages.some(m=>m.type==='models-ready'));assert.ok(w.messages.some(m=>m.phase==='face-create'));
 await w.scope.onmessage({data:{type:'frame',frameId:17,timestamp:1000,bitmap:{close(){}}}});assert.ok(w.messages.some(m=>m.type==='result'&&m.frameId===17&&m.smile===.8));
});
test('a hung auxiliary worker cannot block face results in the independently initialized face worker',async()=>{
 const face=worker(),geometry=worker(true);await face.scope.onmessage({data:{type:'init',role:'face'}});geometry.scope.onmessage({data:{type:'init',role:'geometry'}});for(let i=0;i<8;i++)await pause();assert.ok(geometry.calls.includes('geometry'));assert.ok(!geometry.messages.some(m=>m.type==='ready'));
 for(let i=0;i<20;i++)await face.scope.onmessage({data:{type:'frame',frameId:i,timestamp:1000+i*100,bitmap:{close(){}}}});assert.equal(face.messages.filter(m=>m.type==='result').length,20);
});
test('continuing download progress keeps initialization alive beyond 90 seconds, bounded to five minutes',()=>{
 let now=0,next=0;const timers=new Map(),worker={postMessage(){},terminate(){}},session=new VisionSession({createWorker:()=>worker,createBitmap:()=>{},now:()=>now,setTimer:(fn,ms)=>{timers.set(++next,{fn,at:now+ms});return next;},clearTimer:id=>timers.delete(id)});session.start().catch(()=>{});
 for(let i=1;i<=12;i++){now=i*10000;worker.onmessage({data:{type:'progress',phase:'wasm',loaded:i*10000,total:4000000}});assert.equal(session.worker,worker);assert.ok([...timers.values()].some(t=>t.at>now));}
 now=290000;worker.onmessage({data:{type:'progress',phase:'wasm'}});assert.equal([...timers.values()][0].at,300000);session.dispose();
});

test('compressed requests reuse complete legacy model cache entries before making a network request',async()=>{
 const w=worker(),calls=[];w.scope.VISION_PACK={'face_landmarker.task':{}};w.scope.caches={open:async()=>({match:async url=>{calls.push(url);return url==='https://test/project/vendor/face_landmarker.task'?new Response('cached-model'):null;}})};const response=await w.scope.fetch('https://test/project/vendor/compressed/face_landmarker.task.gz');assert.equal(await response.text(),'cached-model');assert.equal(calls.length,2);
});
