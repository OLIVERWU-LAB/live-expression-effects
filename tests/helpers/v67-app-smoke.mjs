import{SourceTextModule,SyntheticModule,createContext,runInContext}from'node:vm';import{readFileSync}from'node:fs';import assert from'node:assert/strict';
const root=new URL('../../dist/',import.meta.url),elements=new Map(),callbacks=[],workers=[];
class Element{constructor(){this.hidden=false;this.dataset={};this.style={};this.listeners={};this.classList={add(){},remove(){},toggle(){},contains(){return false;}};this.value=35;this.readyState=2;this.currentTime=1;this.videoWidth=640;this.videoHeight=480;}getBoundingClientRect(){return{width:390,height:844};}setAttribute(){}addEventListener(k,fn){this.listeners[k]=fn;}removeEventListener(k,fn){if(this.listeners[k]===fn)delete this.listeners[k];}async play(){}pause(){}click(){return this.listeners.click?.({});}}
const ids=new Set([...readFileSync(new URL('index.html',root),'utf8').matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
const el=id=>{if(!ids.has(id))return null;if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
const styles=['cinema','gift','flat'].map(style=>{const e=new Element();e.dataset.style=style;return e;});let time=0,giftResolve,diagnostic,timerGlobal;
function checkedSetTimeout(...args){assert.ok(this==null||this===timerGlobal,'Native timer receiver must be global');return setTimeout(...args);}
function checkedClearTimeout(...args){assert.ok(this==null||this===timerGlobal,'Native timer receiver must be global');return clearTimeout(...args);}
const hintTest=process.argv.includes('--neutral-hint');
const fault=process.argv.includes('--ui-fault'),audioPending=process.argv.includes('--audio-pending');let finishAudio;const earlyTap=process.argv.includes('--early-tap'),sequence=[];
class Renderer{constructor(){this.drawMs=2;this.gift={ready:false,error:null,load(){if(this.ready)return Promise.resolve(true);return new Promise(r=>giftResolve=()=>{this.ready=true;r(true);});}};}resize(){}draw(){}}
class Sound{constructor(){this.enabled=false;this.assetsReady=!audioPending;this.total=6;this.loaded=this.assetsReady?6:0;this.voices=new Set();}setEnabled(){}setScene(){}stopAll(){}handle(){}update(){}async load(){if(this.assetsReady)return true;return new Promise(resolve=>finishAudio=()=>{this.assetsReady=true;this.loaded=6;this.onstate?.();resolve(true);});}async unlock(){sequence.push('audio');return true;}async resume(){}pause(){}}
const context=createContext({console,URL,URLSearchParams,Blob,Math,Promise,performance:{now:()=>time},setTimeout:checkedSetTimeout,clearTimeout:checkedClearTimeout,matchMedia:()=>({matches:false}),localStorage:{getItem(key){return key==='expression-visual-style'?'gift':null;},setItem(){}},document:{hidden:false,getElementById:el,querySelectorAll:s=>s.includes('data-style')?styles:[],addEventListener(){},createElement:()=>new Element()},window:{Worker:true,createImageBitmap:true,OffscreenCanvas:true,addEventListener(){}},navigator:{clipboard:{writeText:async text=>diagnostic=JSON.parse(text)},permissions:{query:async()=>({state:'prompt'})},mediaDevices:{getUserMedia:async()=>{sequence.push('camera');return{getTracks:()=>[],getVideoTracks:()=>[{readyState:'live',addEventListener(){}}]};}}},isSecureContext:true,location:{search:'?start'},requestAnimationFrame:f=>callbacks.push(f),ResizeObserver:class{observe(){}},Worker:class{constructor(){this.posts=[];workers.push(this);}postMessage(data){this.posts.push(data);}terminate(){}},createImageBitmap:async()=>({close(){}})});
timerGlobal=new SourceTextModule('export const value=globalThis',{context});await timerGlobal.link(()=>{});await timerGlobal.evaluate();timerGlobal=timerGlobal.namespace.value;
const exportsModule=obj=>{const m=new SyntheticModule(Object.keys(obj),function(){for(const[k,v]of Object.entries(obj))this.setExport(k,v);},{context});return m;};
if(earlyTap){runInContext(readFileSync(new URL('camera-entry.js',root),'utf8'),context);el('start-camera').click();assert.deepEqual(sequence,['camera']);assert.equal(el('start-camera').disabled,true);}
const app=new SourceTextModule(readFileSync(new URL('app.mjs',root),'utf8'),{context,initializeImportMeta:meta=>meta.url=new URL('app.mjs',root).href});
await app.link(async specifier=>specifier==='./vision-session.mjs'?new SourceTextModule(readFileSync(new URL(specifier,root),'utf8'),{context}):specifier==='./camera-frame.mjs'?exportsModule({cameraFrameReader:()=>async()=>({close(){}})}):specifier==='./renderer.mjs'?exportsModule({Renderer}):specifier==='./sound.mjs'?exportsModule({SoundDesigner:Sound}):exportsModule(await import(new URL(specifier,root))));await app.evaluate();assert.equal(el('stage').dataset.style,'cinema','a stored gift preference must not override the default');
// Exercise a direct first click, without entering preview or resuming a previous engine.
if(fault)el('live-dot').classList.add=()=>{throw Error('Injected session UI failure');};
if(!earlyTap)el('start-camera').click();for(let i=0;i<20;i++)await Promise.resolve();
assert.equal(workers.length,1,'first camera click must request recognition');assert.equal(sequence.filter(v=>v==='camera').length,1);assert.equal(sequence[0],'camera');if(earlyTap)console.log('First tap before app download is consumed once; permission precedes audio.');
assert.equal(workers[0].posts[0].type,'init');
await el('loading-diagnostics').click();
assert.equal(diagnostic.source,'camera');assert.notEqual(diagnostic.phase,'idle');
assert.ok(diagnostic.events.some(e=>e.type==='recognition-requested'));
if(fault){
 assert.match(diagnostic.startupError,/Injected session UI failure/);
 assert.equal(el('loading-retry').hidden,false);
 el('live-dot').classList.add=()=>{};el('stop-camera').click();
 console.log('Direct camera boot starts its worker even when the session UI throws; error is visible and retryable.');
}else{
 workers[0].onmessage({data:{type:'ready'}});workers[0].onmessage({data:{type:'models-ready'}});
 for(let i=0;i<20;i++)await Promise.resolve();
 time=200;callbacks.shift()(time);for(let i=0;i<20;i++)await Promise.resolve();
 const coldFrame=workers[0].posts.find(p=>p.type==='frame');assert.ok(coldFrame,'cold camera boot begins inference');
 workers[0].onmessage({data:{type:'result',frameId:coldFrame.frameId,inferenceMs:35,smile:hintTest?0:.4,face:Array.from({length:478},()=>({x:.5,y:.4,z:0}))}});

 assert.equal(workers.length,2);assert.equal(el('loading').hidden,false,'auxiliary tracking must finish before the loading notice clears');workers[1].onmessage({data:{type:'ready'}});workers[1].onmessage({data:{type:'models-ready'}});workers[1].onmessage({data:{type:'segmentation-ready'}});workers[1].onmessage({data:{type:'hands-ready'}});time=400;el('camera').currentTime=2;callbacks.shift()(time);for(let i=0;i<20;i++)await Promise.resolve();const trackingFrame=workers[1].posts.find(p=>p.type==='frame');assert.ok(trackingFrame);workers[1].onmessage({data:{type:'result',frameId:trackingFrame.frameId,inferenceMs:10,mask:null,hands:[]}});if(audioPending){assert.equal(el('loading').hidden,false);assert.match(el('loading-copy').textContent,/正在准备音效/);finishAudio();await Promise.resolve();console.log('Audio asset readiness gates the experience after face recognition is ready.');}assert.equal(el('loading').hidden,true);
 if(hintTest){
  const answered=new Map();answered.set(workers[0],coldFrame.frameId);answered.set(workers[1],trackingFrame.frameId);
  const tick=async(at,smile,face=true)=>{time=at;el('camera').currentTime=at/1000;callbacks.shift()(at);for(let i=0;i<20;i++)await Promise.resolve();for(const[widx,w]of workers.entries()){const frame=[...w.posts].reverse().find(p=>p.type==='frame');if(frame&&answered.get(w)!==frame.frameId){answered.set(w,frame.frameId);w.onmessage({data:{type:'result',frameId:frame.frameId,inferenceMs:30,smile,face:widx===0&&face?Array.from({length:478},()=>({x:.5,y:.4,z:0})):null,mask:null,hands:[]}});}}};
  for(let t=500;t<=1500;t+=100)await tick(t,0);assert.equal(el('smile-hint').hidden,false,'recognized neutral face gets one concise invitation');assert.equal(el('smile-hint').textContent??'笑一笑吧','笑一笑吧');
  for(let t=1600;t<=2100;t+=100)await tick(t,.35);assert.equal(el('smile-hint').hidden,true,'a smile removes the invitation');
  for(let t=2200;t<=3500;t+=100)await tick(t,0,false);assert.equal(el('smile-hint').hidden,true,'no face uses the separate face hint, not a smile request');console.log('Neutral face invitation appears after settling, hides on smile and never replaces the face hint.');
 }
 el('stop-camera').click();assert.equal(el('smile-hint').hidden,true);
 console.log('Direct cold camera boot requests recognition and accepts a first face result.');
}
