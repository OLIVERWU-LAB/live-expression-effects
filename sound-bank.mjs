import {AUDIO_URLS} from './sound-assets.mjs?v=ba6e7831e1b4';
// Decode once before the show. Playback only creates lightweight source nodes;
// no fetch, decoding, JS timer, convolution or per-particle sound work here.
export const MIX=Object.freeze({master:.38,maxVoices:24,echoDelay:.055,decodeConcurrency:2});
export class SoundDesigner {
 constructor({context=null,output=null,random=Math.random,fetcher=(...args)=>globalThis.fetch(...args)}={}){
  Object.assign(this,{context,output,random,fetcher});this.enabled=true;this.authorized=false;this.voices=new Set();this.voiceInfo=new Map();this.buffers=new Map();this.normalization=new Map();this.assetsReady=false;this.loading=false;this.error=null;this.loaded=0;this.promise=null;this.effect='neutral';this.style='cinema';this.ambient=null;this.last=new Map();this.glitterUntil=0;this.nextGlitterAt=0;this.onstate=null;
  if(context)this.initialize();
 }
 initialize(){
  if(this.master)return;
  if(!this.context){const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)throw Error('当前浏览器不支持音效播放');this.context=new Context({latencyHint:'interactive'});}
  const c=this.context;this.master=c.createGain();this.master.gain.value=this.enabled?MIX.master:0;
  this.compressor=c.createDynamicsCompressor();Object.assign(this.compressor.threshold,{value:-12});this.compressor.knee.value=12;this.compressor.ratio.value=8;this.compressor.attack.value=.002;this.compressor.release.value=.18;this.master.connect(this.compressor);this.compressor.connect(this.output||c.destination);
  c.onstatechange=()=>this.onstate?.();
 }
 get total(){return Object.keys(AUDIO_URLS).length;}
 get ready(){return this.assetsReady&&this.context?.state==='running';}
 async load(){
  if(this.assetsReady)return true;if(this.promise)return this.promise;
  this.loading=true;this.error=null;this.loaded=0;this.onstate?.();
  this.promise=(async()=>{
   await Promise.resolve();
   try{
    this.initialize();const pending=new Map(),keys=Object.keys(AUDIO_URLS);let index=0;
    const decode=async()=>{while(index<keys.length){const name=keys[index++],response=await this.fetcher(AUDIO_URLS[name],{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`音效下载失败：${name}（${response.status}）`);const bytes=await response.arrayBuffer(),buffer=await this.context.decodeAudioData(bytes);pending.set(name,buffer);this.loaded=pending.size;this.onstate?.();}};
    // allSettled prevents a slow failed batch racing the user's next retry.
    const result=await Promise.allSettled(Array.from({length:MIX.decodeConcurrency},decode));for(const r of result)if(r.status==='rejected')throw r.reason;
    for(const[name,buffer]of pending){
     let peak=0,first=buffer.length;for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i++)peak=Math.max(peak,Math.abs(data[i]));}
     const threshold=Math.max(.00001,peak*.008);for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<Math.min(first,data.length);i++)if(Math.abs(data[i])>threshold){first=i;break;}}
     this.buffers.set(name,{buffer,offset:Math.max(0,first/buffer.sampleRate-.002)});this.normalization.set(name,Math.min(64,.8/Math.max(.001,peak)));
    }
    this.assetsReady=true;return true;
   }catch(error){this.error=String(error.message||error);return false;}
   finally{this.loading=false;this.promise=null;this.onstate?.();}
  })();return this.promise;
 }
 async unlock(){
  // Call resume synchronously inside the click gesture, before waiting for files.
  try{this.initialize();this.authorized=true;const resume=this.enabled&&this.context.state!=='running'?this.context.resume():Promise.resolve();const loaded=this.load();await Promise.all([resume,loaded]);this.onstate?.();return this.ready;}catch(error){this.error=String(error.message||error);this.onstate?.();return false;}
 }
 setEnabled(value){this.enabled=!!value;if(this.master){const t=this.context.currentTime;this.master.gain.cancelScheduledValues(t);this.master.gain.setTargetAtTime(value?MIX.master:0,t,.015);}if(!value)this.stopAll();this.onstate?.();}

 release(source,stop=false){const info=this.voiceInfo.get(source);if(!info)return;this.voiceInfo.delete(source);this.voices.delete(source);if(stop)try{source.stop();}catch{}for(const n of[source,...info.nodes])try{n.disconnect();}catch{}if(this.ambient===source)this.ambient=null;}
 allow(key,interval){const now=this.context.currentTime;if(now-(this.last.get(key)??-Infinity)<interval)return false;this.last.set(key,now);return true;}
 stopAll(){for(const source of [...this.voices])this.release(source,true);this.last.clear();}
 pause(){this.stopAll();if(this.context?.state==='running')this.context.suspend().catch(()=>{});}
 async resume(){if(this.authorized&&this.enabled&&this.context?.state==='suspended')try{await this.context.resume();}catch{}this.onstate?.();}
}
