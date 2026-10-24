import {clamp} from './core.mjs';
import {AUDIO_URLS} from './sound-assets.mjs';
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
 play(name,{when=this.context?.currentTime,gain=.5,rate=1,pan=0,duration,offset,highpass=0,lowpass=0,priority=1,loop=false}={}){
  if(!this.enabled||!this.ready||when===undefined)return null;const asset=this.buffers.get(name);if(!asset)return null;
  if(this.voices.size>=MIX.maxVoices){const victim=[...this.voiceInfo].find(([,v])=>v.priority<priority);if(!victim)return null;this.release(victim[0],true);}
  const c=this.context,s=c.createBufferSource(),g=c.createGain(),nodes=[g];s.buffer=asset.buffer;s.playbackRate.value=rate;s.loop=loop;let end=s;
  for(const[type,hz]of[['highpass',highpass],['lowpass',lowpass]])if(hz){const f=c.createBiquadFilter();f.type=type;f.frequency.value=hz;f.Q.value=.5;end.connect(f);end=f;nodes.push(f);}
  end.connect(g);const p=c.createStereoPanner?.();if(p){p.pan.value=clamp(pan,-.75,.75);g.connect(p);p.connect(this.master);nodes.push(p);}else g.connect(this.master);
  when=Math.max(c.currentTime,when);offset=offset??asset.offset;
  const seconds=loop?Infinity:Math.min(duration??Infinity,(asset.buffer.duration-offset)/rate),level=gain*this.normalization.get(name);
  g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(level,when+.003);
  if(!loop){const fade=Math.min(.055,seconds*.24);g.gain.setValueAtTime(level,when+Math.max(.004,seconds-fade));g.gain.linearRampToValueAtTime(0,when+seconds);}
  this.voices.add(s);this.voiceInfo.set(s,{nodes,priority});s.onended=()=>this.release(s);
  s.start(when,offset);if(!loop)s.stop(when+seconds+.005);return s;
 }
 release(source,stop=false){const info=this.voiceInfo.get(source);if(!info)return;this.voiceInfo.delete(source);this.voices.delete(source);if(stop)try{source.stop();}catch{}for(const n of[source,...info.nodes])try{n.disconnect();}catch{}if(this.ambient===source)this.ambient=null;}
 allow(key,interval){const now=this.context.currentTime;if(now-(this.last.get(key)??-Infinity)<interval)return false;this.last.set(key,now);return true;}
 launch(e){this.play('shoot',{gain:.32,pan:(e.x-.5)*1.2,offset:.38,rate:1.35,duration:e.duration||.65,priority:3});}
 big(e){
  const flat=e.style==='flat',pan=(e.x-.5)*1.2,now=this.context.currentTime;
  this.play('explode',{gain:flat?.29+this.random()*.18:.72,rate:flat?.90+this.random()*.26:1,pan,priority:4});
  this.play('fireworks2',{when:now+MIX.echoDelay,gain:flat?.10+this.random()*.07:.24,pan:pan*.7,rate:flat?.90+this.random()*.24:.94+this.random()*.10,priority:2});
  // Gift pieces do not shimmer. Keep other styles' bed short and leave silence
  // between successive shells instead of overlapping whole 3-second clips.
  if(e.style!=='gift'&&this.allow('shining',flat?.48:2.0))this.play('shining',{when:now+.025,gain:flat?.065:.09,rate:.95,pan:pan*.5,duration:flat?.55:.85,priority:1});
 }
 small(e){if(!this.allow('small',.045))return;this.play('explode',{gain:e.style==='flat'?.13+this.random()*.12:.12+this.random()*.06,rate:1.12+this.random()*.30,pan:(e.x-.5)*1.3,duration:.48,priority:3});}
 glitter(e){
  if(e.style==='gift')return;const now=this.context.currentTime;
  if(now>=this.glitterUntil){if(now<this.nextGlitterAt)return;this.glitterUntil=now+.32;this.nextGlitterAt=now+1.8;}
  if(!this.allow('sparks',.18))return;
  this.play('sparks',{gain:e.style==='flat'?.045:.055,pan:(e.x-.5)*1.1,rate:.88+this.random()*.12,duration:Math.min(.28,this.glitterUntil-now+.035),priority:1});
 }
 confetti(e){if(!this.allow('paper',.10))return;this.play('paper',{gain:.10+this.random()*.035,rate:.96+this.random()*.25,duration:.17+this.random()*.07,highpass:320,lowpass:8500,pan:(e.x-.5)*1.2,priority:2});}
 handle(events){
  if(!this.ready||!this.enabled)return;
  for(const e of events){if(e.type==='launch')this.launch(e);
   else if(e.type==='burst'){if(e.style==='flat')this.small(e);else this.big(e);}
   else if(e.type==='crackle'){if(e.style==='gift'&&e.collision)this.confetti(e);else if(e.style==='flat'&&e.stage===2)this.big(e);else if(e.stage>=3)this.glitter(e);else this.small(e);}
   else if(e.type==='glitter')this.glitter(e);
  }
 }
 setScene(effect,style){if(effect!==this.effect||style!==this.style){this.ambientStop();this.effect=effect;this.style=style;}}
 update(){} // The supplied clips are event sounds, never an endless ambience loop.
 ambientStop(){if(this.ambient)this.release(this.ambient,true);this.ambient=null;}
 stopAll(){for(const source of [...this.voices])this.release(source,true);this.ambient=null;this.last.clear();this.glitterUntil=0;this.nextGlitterAt=0;}
 pause(){this.stopAll();if(this.context?.state==='running')this.context.suspend().catch(()=>{});}
 async resume(){if(this.authorized&&this.enabled&&this.context?.state==='suspended')try{await this.context.resume();}catch{}this.onstate?.();}
}
