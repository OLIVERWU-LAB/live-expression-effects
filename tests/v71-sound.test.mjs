// Historical checks for the rejected v71 synthesis prototype, not the live sound engine.
import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{SoundDesigner,MIX}from'../dist/sound-program-rejected.mjs';import{synthesizeTexture,SYNTH_TEXTURES,envelopeValue}from'../dist/audio-synthesis.mjs';import{liveFiles}from'../tools/live-files.mjs';
const rng=s=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
function context(){
 const starts=[],sources=[],nodes=[],params=()=>({value:0,events:[],setValueAtTime(v,t){this.events.push(['set',v,t]);},setTargetAtTime(v,t,tau){this.events.push(['target',v,t,tau]);},cancelScheduledValues(t){this.events=this.events.filter(e=>e[2]<t);},linearRampToValueAtTime(v,t){this.events.push(['linear',v,t]);},exponentialRampToValueAtTime(v,t){this.events.push(['exponential',v,t]);}}),node=()=>{const n={connect(){},disconnect(){this.disconnected=true;}};nodes.push(n);return n;};
 const c={currentTime:10,state:'running',destination:{},starts,sources,nodes,allocations:0,createGain:()=>({...node(),gain:params()}),createDynamicsCompressor:()=>({...node(),threshold:params(),knee:params(),ratio:params(),attack:params(),release:params()}),createBiquadFilter:()=>({...node(),frequency:params(),Q:params()}),createStereoPanner:()=>({...node(),pan:params()}),createBuffer(channels,length,sampleRate){c.allocations++;const data=new Float32Array(length);return{duration:length/sampleRate,length,sampleRate,numberOfChannels:1,getChannelData:()=>data};},createBufferSource(){const source={...node(),playbackRate:params(),start(when){starts.push({when,source});},stop(when){this.stopAt=when;}};sources.push(source);return source;},async resume(){this.state='running';},async suspend(){this.state='suspended';},advance(time){this.currentTime=time;for(const source of sources)if(source.stopAt<=time&&!source.ended){source.ended=true;source.onended?.();}}};return c;
}
async function setup(){const c=context(),s=new SoundDesigner({context:c,random:rng(31)});await s.load();return{s,c};}
const glints=(n=90)=>({particles:Array.from({length:n},(_,i)=>({cinemaDust:true,life:1.3,maxLife:2,size:1,seed:i,x:80+i,delay:0})),viewport:{width:390,height:844},simulationTime:1});
test('program textures have finite, zero-ended waveforms and less than 400KB mono PCM; no live audio downloads',async()=>{
 let bytes=0;for(const name of Object.keys(SYNTH_TEXTURES)){const samples=synthesizeTexture(name);bytes+=samples.byteLength;assert.equal(samples[0],0);assert.equal(samples.at(-1),0);assert.ok(samples.every(v=>Number.isFinite(v)&&Math.abs(v)<=1));assert.ok(samples.some(v=>Math.abs(v)>.05));}assert.ok(bytes<400000,bytes);assert.ok(!liveFiles().includes('audio-synthesis.mjs'));
 const{s,c}=await setup();await Promise.all([s.load(),s.load()]);assert.equal(c.allocations,4);assert.ok(s.assetsReady);for(let i=0;i<10;i++){s.handle([{type:'burst',style:'cinema',x:.5}]);c.advance(c.currentTime+.5);}assert.equal(c.allocations,4);
});
test('big and small explosions follow actual stages; flat flowers vary pitch, volume and position',async()=>{
 const{s,c}=await setup(),calls=[];s.play=(name,o)=>calls.push({name,...o});s.handle([{type:'burst',style:'cinema',scale:.9,x:.2}]);assert.equal(calls[0].name,'boom');assert.ok(calls[1].when>c.currentTime+.07);assert.ok(calls[1].gain<calls[0].gain*.2);calls.length=0;c.advance(11);s.handle([{type:'crackle',style:'cinema',stage:2,x:.8}]);assert.equal(calls.length,1);assert.ok(calls[0].rate>1.2&&calls[0].gain<.25);calls.length=0;
 for(let i=0;i<5;i++){c.advance(12+i*.16);s.handle([{type:'crackle',style:'flat',stage:2,x:.15+i*.17}]);}const hits=calls.filter(v=>v.name==='boom'&&v.priority===4);assert.equal(hits.length,5);assert.equal(new Set(hits.map(v=>v.rate)).size,5);assert.equal(new Set(hits.map(v=>v.gain)).size,5);assert.equal(new Set(hits.map(v=>v.pan)).size,5);
});
test('sparkle requires visible glints, changes density with their brightness and ends with silence',async()=>{
 const{s,c}=await setup(),calls=[];s.play=(name,o)=>calls.push({name,...o});s.setScene('laugh','cinema');s.handle([{type:'burst',style:'cinema',x:.5}]);calls.length=0;
 for(let i=0;i<12;i++){c.advance(10.05+i*.06);s.update(.06,{particles:[]});}assert.equal(calls.length,0);
 c.advance(11);s.glitter({style:'cinema',x:.5});for(let i=0;i<20;i++){c.advance(11+i*.06);s.update(.06,glints());}assert.ok(calls.length>=3&&calls.length<=5);assert.ok(calls.every(v=>v.gain<=.04));assert.ok(new Set(calls.map(v=>v.rate)).size>1);const done=calls.length;c.advance(14);s.update(.1,glints());assert.equal(calls.length,done);
});
test('gift never creates glitter and only contact spawns a procedural paper fold',async()=>{
 const{s,c}=await setup(),calls=[];s.play=(name,o)=>calls.push({name,...o});s.setScene('laugh','gift');s.handle([{type:'burst',style:'gift',x:.5},{type:'glitter',style:'gift',x:.5}]);s.update(.1,glints());assert.deepEqual(calls.map(v=>v.name),['boom','boom']);calls.length=0;c.advance(11);s.handle([{type:'crackle',style:'gift',collision:true,x:.7}]);assert.equal(calls.length,1);assert.equal(calls[0].name,'paper');assert.ok(calls[0].highpass>0&&calls[0].lowpass>0);
});
test('every voice decays smoothly before stopping and switching fades current and future echoes',async()=>{
 const{s,c}=await setup();s.setScene('laugh','cinema');s.handle([{type:'burst',style:'cinema',x:.5}]);const sources=[...s.voiceInfo.keys()];assert.equal(sources.length,2);for(const[source,v]of s.voiceInfo){assert.ok(v.gain.events.some(e=>e[0]==='exponential'&&e[1]<.001));assert.equal(v.gain.events.at(-1)[1],0);assert.ok(source.stopAt>v.when+v.duration);}
 c.advance(10.03);s.stopAll();assert.equal(s.voices.size,0);assert.ok(sources.every(source=>source.stopAt<=10.13));for(const v of s.voiceInfo.values())assert.equal(v.gain.events.at(-1)[1],0);c.advance(11);assert.equal(s.voiceInfo.size,0);assert.ok(sources.every(source=>source.disconnected));assert.equal(envelopeValue(2,1,.5),0);
});
test('the voice count is bounded during dense animation and all nodes end after long playback',async()=>{
 const{s,c}=await setup();s.setScene('laugh','flat');let peak=0;for(let i=0;i<500;i++){c.advance(10+i*.04);s.handle([{type:'crackle',style:'flat',stage:2,x:.5}]);s.update(.04,glints(150));peak=Math.max(peak,s.voices.size);assert.ok(s.voices.size<=MIX.maxVoices);assert.ok(s.voiceInfo.size<=MIX.maxVoices);}
 c.advance(40);assert.equal(s.voices.size,0);assert.equal(s.voiceInfo.size,0);assert.ok(peak>6);assert.ok(c.sources.every(v=>v.ended));
});
test('small explosions scale with volume and launch duration is bounded by the actual rocket flight',async()=>{
 const{s,c}=await setup();s.launch({duration:.65,x:.3});const entry=[...s.voiceInfo.values()][0];assert.ok(Math.abs(entry.duration-.75)<.001);assert.ok(entry.nodes.some(n=>n.frequency?.events.some(e=>e[0]==='exponential')));s.setEnabled(false);const before=c.starts.length;s.handle([{type:'burst',style:'cinema',x:.5}]);assert.equal(c.starts.length,before);c.advance(11);assert.equal(s.voiceInfo.size,0);
});
