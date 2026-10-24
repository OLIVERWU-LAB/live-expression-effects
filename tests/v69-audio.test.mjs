import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,statSync}from'node:fs';
import{SoundDesigner,MIX}from'../dist/sound.mjs';import{AUDIO_FILES}from'../dist/sound-assets.mjs';import{liveFiles}from'../tools/live-files.mjs';
function context(){
 const starts=[],params=()=>({value:0,setValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){},linearRampToValueAtTime(){}}),node=()=>({connect(){},disconnect(){}});
 return{currentTime:10,state:'running',destination:{},starts,createGain:()=>({...node(),gain:params()}),createDynamicsCompressor:()=>({...node(),threshold:params(),knee:params(),ratio:params(),attack:params(),release:params()}),createBiquadFilter:()=>({...node(),frequency:params(),Q:params()}),createStereoPanner:()=>({...node(),pan:params()}),createBufferSource(){const s={...node(),playbackRate:params(),start(when,offset){starts.push({source:s,when,offset,buffer:s.buffer,rate:s.playbackRate.value});},stop(){s.stopped=true;}};return s;},async decodeAudioData(){const data=new Float32Array(4800);data.fill(.2,400);return{duration:.1,length:4800,numberOfChannels:1,sampleRate:48000,getChannelData:()=>data};},async resume(){this.state='running';},async suspend(){this.state='suspended';}};
}
async function sound(){const c=context();let fetches=0;const s=new SoundDesigner({context:c,random:()=>.5,fetcher:async()=>{fetches++;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};}});assert.equal(await s.load(),true);return{s,c,get fetches(){return fetches;}};}
test('user clips and paper rustle are bundled under 240 KB',()=>{const files=liveFiles();let bytes=0;for(const file of Object.values(AUDIO_FILES)){assert.ok(files.includes(file));bytes+=statSync(new URL('../dist/'+file,import.meta.url)).size;}assert.ok(bytes<240000,bytes);});
test('audio fetch/decode is shared, bounded to two jobs, and never repeated during playback',async()=>{
 const c=context();let active=0,peak=0,fetches=0;const s=new SoundDesigner({context:c,fetcher:async()=>{fetches++;active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,1));active--;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};}});
 await Promise.all([s.load(),s.load(),s.load()]);assert.equal(fetches,6);assert.equal(peak,2);assert.ok(s.assetsReady);assert.ok(s.buffers.get('explode').offset>0,'leading silence is trimmed');
 for(let i=0;i<5;i++)s.handle([{type:'burst',style:'cinema',x:.5}]);await s.load();assert.equal(fetches,6);assert.ok(s.voices.size<=MIX.maxVoices);
});
test('main explosions get immediate explode and a 55 ms echo; small explosions never get the echo',async()=>{
 const {s,c}=await sound(),calls=[];s.play=(name,options)=>calls.push({name,...options});s.handle([{type:'burst',style:'cinema',x:.5}]);assert.deepEqual(calls.map(e=>e.name),['explode','fireworks2','shining']);assert.equal(calls[0].when,undefined);assert.ok(Math.abs(calls[1].when-c.currentTime-.055)<1e-6);
 calls.length=0;c.currentTime+=1;s.handle([{type:'crackle',style:'cinema',stage:2,x:.5}]);assert.deepEqual(calls.map(e=>e.name),['explode']);assert.ok(calls[0].rate>1&&calls[0].gain<.25);
 calls.length=0;c.currentTime+=.1;s.handle([{type:'burst',style:'flat',x:.5}]);assert.deepEqual(calls.map(e=>e.name),['explode']);calls.length=0;s.handle([{type:'crackle',style:'flat',stage:2,x:.5}]);assert.ok(calls.some(e=>e.name==='fireworks2'));
});
test('launch, real visual dissolve and gift contact use their assigned sampled textures',async()=>{
 const {s}=await sound(),calls=[];s.play=(name,options)=>calls.push({name,...options});s.handle([{type:'launch',style:'gift',duration:.6,x:.2},{type:'glitter',style:'cinema',x:.7},{type:'crackle',style:'gift',collision:true,x:.6}]);assert.deepEqual(calls.map(e=>e.name),['shoot','sparks','paper']);assert.ok(calls[2].duration<.3&&calls[2].highpass>0);assert.equal(calls[0].duration,.6);
});
test('dense events stay under the voice limit and stop cancels scheduled echoes as well',async()=>{
 const {s,c}=await sound();for(let i=0;i<80;i++){c.currentTime+=.05;s.handle([{type:'burst',style:'flat',x:.5}]);}assert.ok(s.voices.size<=24);assert.ok(c.starts.some(e=>e.when>10));const sources=[...s.voices];s.stopAll();assert.equal(s.voices.size,0);assert.ok(sources.every(e=>e.stopped));s.setEnabled(false);s.handle([{type:'burst',style:'cinema',x:.5}]);assert.equal(s.voices.size,0);
});
test('asset failure is visible and retry succeeds without silently accepting an incomplete sound bank',async()=>{
 let fail=true;const s=new SoundDesigner({context:context(),fetcher:async()=>({ok:!fail,status:503,arrayBuffer:async()=>new ArrayBuffer(1)})});assert.equal(await s.load(),false);assert.equal(s.assetsReady,false);assert.match(s.error,/503/);fail=false;assert.equal(await s.load(),true);assert.equal(s.assetsReady,true);assert.equal(s.error,null);
});

test('actual app keeps loading visible until audio assets are decoded',async()=>{
 const{execFileSync}=await import('node:child_process');const text=execFileSync(process.execPath,['--experimental-vm-modules',new URL('./helpers/v67-app-smoke.mjs',import.meta.url).pathname,'--audio-pending'],{encoding:'utf8',timeout:15000});assert.match(text,/Audio asset readiness gates/);
});

test('gift has no shimmering bed and glitter windows end instead of staying audible',async()=>{
 const{s,c}=await sound(),calls=[];s.play=(name,options)=>calls.push({name,...options});s.handle([{type:'burst',style:'gift',x:.5}]);assert.deepEqual(calls.map(e=>e.name),['explode','fireworks2']);calls.length=0;
 for(let i=0;i<20;i++){c.currentTime=10+i*.05;s.glitter({style:'cinema',x:.5});}
 assert.ok(calls.length<=2);assert.ok(calls.every(e=>e.duration<=.28&&e.gain<.07));const count=calls.length;c.currentTime=11.5;s.glitter({style:'cinema',x:.5});assert.equal(calls.length,count);
 calls.length=0;c.currentTime=13;s.big({style:'cinema',x:.5});assert.ok(calls.find(e=>e.name==='shining').duration<=.85);s.setScene('smile','gift');s.update(.1);assert.equal(s.ambient,null);
});
test('flat flower explosions vary volume and pitch rather than replaying an identical hit',async()=>{
 const{s,c}=await sound(),calls=[];let n=0;s.random=()=>((n++%7)/7);s.play=(name,options)=>calls.push({name,...options});for(let i=0;i<5;i++){c.currentTime+=.15;s.big({style:'flat',x:.5});}const hits=calls.filter(e=>e.name==='explode');assert.ok(new Set(hits.map(e=>e.gain)).size>1);assert.ok(new Set(hits.map(e=>e.rate)).size>1);
});
