import {clamp} from './core.mjs';
import {particleVisibility} from './particle-visibility.mjs';
import {refinedDissolveStart} from './cinema-refined-particles.mjs';
import {SYNTH_RATE,SYNTH_TEXTURES,synthesizeTexture,envelopeValue} from './audio-synthesis.mjs';
export const MIX=Object.freeze({master:.38,maxVoices:18,echoDelay:.075});
// Sound follows visual events and the living sparkle population. No ambience loop,
// network, per-frame sample generation, or JavaScript playback timer.
export class SoundDesigner{
 constructor({context=null,output=null,random=Math.random}={}){
  Object.assign(this,{context,output,random});this.enabled=true;this.authorized=false;this.voices=new Set();this.voiceInfo=new Map();this.buffers=new Map();this.assetsReady=false;this.loading=false;this.error=null;this.loaded=0;this.promise=null;this.effect='neutral';this.style='cinema';this.last=new Map();this.onstate=null;this.lastAnalysis=-Infinity;this.nextGrainAt=0;this.window=null;this.ambient=null;
  if(context)this.initialize();
 }
 get total(){return Object.keys(SYNTH_TEXTURES).length;}
 get ready(){return this.assetsReady&&this.context?.state==='running';}
 initialize(){
  if(this.master)return;
  if(!this.context){const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)throw Error('当前浏览器不支持音效播放');this.context=new Context({latencyHint:'interactive'});}
  const c=this.context;this.master=c.createGain();this.master.gain.value=this.enabled?MIX.master:0;this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-12;this.compressor.knee.value=12;this.compressor.ratio.value=8;this.compressor.attack.value=.002;this.compressor.release.value=.18;this.master.connect(this.compressor);this.compressor.connect(this.output||c.destination);c.onstatechange=()=>this.onstate?.();
 }
 async load(){
  if(this.assetsReady)return true;if(this.promise)return this.promise;this.loading=true;this.error=null;this.onstate?.();
  this.promise=(async()=>{await Promise.resolve();try{this.initialize();for(const name of Object.keys(SYNTH_TEXTURES)){
   if(!this.buffers.has(name)){const samples=synthesizeTexture(name),buffer=this.context.createBuffer(1,samples.length,SYNTH_RATE);buffer.getChannelData(0).set(samples);this.buffers.set(name,buffer);}this.loaded=this.buffers.size;
  }this.assetsReady=true;return true;}catch(error){this.error=String(error.message||error);return false;}finally{this.loading=false;this.promise=null;this.onstate?.();}})();return this.promise;
 }
 async unlock(){try{this.initialize();this.authorized=true;const resumed=this.enabled&&this.context.state!=='running'?this.context.resume():Promise.resolve();await Promise.all([resumed,this.load()]);this.onstate?.();return this.ready;}catch(error){this.error=String(error.message||error);this.onstate?.();return false;}}
 setEnabled(value){this.enabled=!!value;if(this.master){const t=this.context.currentTime;this.master.gain.cancelScheduledValues(t);this.master.gain.setTargetAtTime(value?MIX.master:0,t,.02);}if(!value)this.stopAll();this.onstate?.();}
 play(name,{when=this.context?.currentTime,gain=.3,rate=1,pan=0,duration,lowpass=0,highpass=0,sweep=0,priority=1}={}){
  if(!this.enabled||!this.ready||when===undefined)return null;const buffer=this.buffers.get(name);if(!buffer)return null;
  // Reserve six voices for the rocket and physical explosions.
  if(this.voices.size>=(priority<3?MIX.maxVoices-6:MIX.maxVoices))return null;
  const c=this.context,s=c.createBufferSource(),g=c.createGain(),nodes=[g];s.buffer=buffer;s.playbackRate.value=rate;let end=s;
  when=Math.max(c.currentTime,when);const seconds=Math.max(.05,Math.min(duration??buffer.duration/rate,buffer.duration/rate)),attack=name==='air'?Math.min(.10,seconds*.22):name==='chime'?.008:.004;
  for(const[type,hz]of[['highpass',highpass],['lowpass',lowpass]])if(hz){const f=c.createBiquadFilter();f.type=type;f.frequency.setValueAtTime(hz,when);f.Q.value=.55;if(sweep&&type==='lowpass')f.frequency.exponentialRampToValueAtTime(Math.max(100,hz*sweep),when+seconds*.85);end.connect(f);end=f;nodes.push(f);}
  end.connect(g);const p=c.createStereoPanner?.();if(p){p.pan.value=clamp(pan,-.75,.75);g.connect(p);p.connect(this.master);nodes.push(p);}else g.connect(this.master);
  const level=clamp(gain,0,.95);g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(level,when+attack);g.gain.exponentialRampToValueAtTime(Math.max(.00001,level*.22),when+seconds*.52);g.gain.exponentialRampToValueAtTime(Math.max(.00001,level*.0001),when+seconds-.005);g.gain.linearRampToValueAtTime(0,when+seconds);
  this.voices.add(s);this.voiceInfo.set(s,{nodes,gain:g.gain,level,when,duration:seconds,attack,kind:name,priority});s.onended=()=>this.release(s);s.start(when);s.stop(when+seconds+.006);return s;
 }
 release(source){const info=this.voiceInfo.get(source);if(!info)return;this.voiceInfo.delete(source);this.voices.delete(source);for(const n of[source,...info.nodes])try{n.disconnect();}catch{}}
 fade(source,seconds=.09){
  const info=this.voiceInfo.get(source);if(!info||info.fading)return;const now=this.context.currentTime;info.fading=true;info.stopAt=now+seconds+.005;
  const held=envelopeValue(now-info.when,info.duration,info.level,info.attack);if(info.gain.cancelAndHoldAtTime)info.gain.cancelAndHoldAtTime(now);else{info.gain.cancelScheduledValues(now);info.gain.setValueAtTime(held,now);}info.gain.linearRampToValueAtTime(0,now+seconds);try{source.stop(now+seconds+.005);}catch{}this.voices.delete(source);
 }
 allow(key,interval){const now=this.context.currentTime;if(now-(this.last.get(key)??-Infinity)<interval)return false;this.last.set(key,now);return true;}
 launch(e){this.play('air',{gain:.20,rate:1.25/((e.duration||.65)+.10),duration:(e.duration||.65)+.10,lowpass:900,sweep:3.0,highpass:280,pan:(e.x-.5)*1.2,priority:3});}
 big(e){
  const flat=e.style==='flat',power=Math.sqrt(clamp(e.scale??.8,.2,1.5)),gain=(flat?.28:.67)*power*(.88+this.random()*.22),rate=(flat?.96:.88)+this.random()*(flat?.28:.17),pan=(e.x-.5)*1.2;
  this.play('boom',{gain,rate,pan,duration:flat?.85:1.35,lowpass:flat?3400:2700,highpass:28,priority:4});
  this.play('boom',{when:this.context.currentTime+MIX.echoDelay+this.random()*.025,gain:gain*.15,rate:rate*.79,pan:pan*.7,duration:flat?.65:1.05,lowpass:650,priority:3});
  if(e.style!=='gift')this.shimmer(e,false);
 }
 small(e){if(!this.allow('small',.045))return;this.play('boom',{gain:(e.style==='flat'?.15:.12)+this.random()*.075,rate:1.28+this.random()*.38,pan:(e.x-.5)*1.3,duration:.28+this.random()*.13,lowpass:4000,highpass:180,priority:3});}
 shimmer(e,ending=true){
  if(e.style==='gift')return;const now=this.context.currentTime;
  if(this.window&&now<this.window.end){if(ending)this.window.ending=true;return;}
  if(!this.allow('sparkle-window',ending?.65:.9))return;
  this.window={start:now,end:now+(ending?.9:.8),remaining:ending?5:5,ending,pan:(e.x-.5)*1.1};this.nextGrainAt=now+.015;
 }
 glitter(e){this.shimmer(e,true);}
 confetti(e){if(!this.allow('paper',.10))return;this.play('paper',{gain:.20+this.random()*.06,rate:.92+this.random()*.35,pan:(e.x-.5)*1.2,highpass:420,lowpass:6500,priority:2});}
 handle(events){
  if(!this.ready||!this.enabled)return;
  for(const e of events){if(e.type==='launch')this.launch(e);else if(e.type==='burst'){if(e.style==='flat')this.small(e);else this.big(e);}else if(e.type==='crackle'){if(e.style==='gift'&&e.collision)this.confetti(e);else if(e.style==='flat'&&e.stage===2)this.big(e);else if(e.stage>=3)this.glitter(e);else this.small(e);}else if(e.type==='glitter')this.glitter(e);else if(e.type==='flight-blocked')for(const[s,v]of this.voiceInfo)if(v.kind==='air')this.fade(s,.10);}
 }
 prune(){const now=this.context?.currentTime??0;for(const[source,v]of this.voiceInfo)if(now>=(v.stopAt??(v.when+v.duration+.015)))this.release(source);}
 update(dt,world){
  this.prune();
  if(!world||!this.ready||!this.enabled||this.style==='gift')return;const now=this.context.currentTime,w=this.window;if(now-this.lastAnalysis<.05)return;this.lastAnalysis=now;
  if(!w||now>w.end||w.remaining<=0||now<this.nextGrainAt)return;
  let visible=0,x=0;for(const p of world.particles){if(p.life<=0||p.delay>0||(world.viewport&&(p.x<0||p.x>world.viewport.width||p.y<0||p.y>world.viewport.height)))continue;let weight=0;const age=p.maxLife-p.life;
   if(p.cinemaDust)weight=clamp(age/.10)*clamp(p.life/.55)*(.45+.55*Math.sin(age*29+p.seed)**2);
   else if(p.ringBlob&&p.refinedCinema){const shellAge=(world.simulationTime||0)-(p.shellStartedAt||0);weight=clamp((shellAge-refinedDissolveStart(p))/.3)*clamp(p.life/.4)*(.2+.8*Math.sin(age*11+p.seed)**2);}
   else if(p.flatFx&&(p.whiteFlash||p.flatTailSpark||p.openingGlint))weight=clamp(p.life/.35)*Math.max(0,Math.sin(age*17+p.seed))**2;
   weight*=particleVisibility(p);visible+=weight;x+=p.x*weight;
  }
  if(visible<.8)return;const density=clamp(visible/35),pan=world.viewport?.width?(x/visible/world.viewport.width-.5)*1.2:w.pan;
  this.play(w.ending&&this.random()<.55?'paper':'chime',{gain:(w.ending?.028:.035)*(.55+density*.45),rate:(w.ending?.85:1.0)+this.random()*.5,pan,lowpass:w.ending?5200:6500,highpass:w.ending?1200:900,duration:w.ending?.24+this.random()*.12:.40+this.random()*.12,priority:1});
  w.remaining--;this.nextGrainAt=now+.10+(1-density)*.08+this.random()*.055;
 }
 setScene(effect,style){if(effect!==this.effect||style!==this.style){this.window=null;for(const[s,v]of this.voiceInfo)if(v.priority<3)this.fade(s,.12);this.effect=effect;this.style=style;}}
 ambientStop(){this.window=null;for(const[s,v]of this.voiceInfo)if(v.priority<3)this.fade(s,.12);}
 stopAll(){for(const source of [...this.voiceInfo.keys()])this.fade(source,.09);this.window=null;this.last.clear();this.nextGrainAt=0;}
 pause(){this.stopAll();if(this.context?.state==='running')this.context.suspend().catch(()=>{});}
 async resume(){if(this.authorized&&this.enabled&&this.context?.state==='suspended')try{await this.context.resume();}catch{}this.onstate?.();}
}
