import { clamp } from './core.mjs?v=fcfd31a3784c';
// Original procedural sound design. No remote audio, microphone or decoding step.
export const MIX=Object.freeze({master:.30,maxVoices:48,sticker:{room:.42,send:.18},cinema:{room:1.65,send:.26}});
export class SoundDesigner {
 constructor({context=null,output=null,random=Math.random}={}) {
  this.context=context;this.output=output;this.random=random;this.enabled=true;this.authorized=false;this.voices=new Set();this.effect='neutral';this.style='sticker';this.ambient=null;this.tapClock=0;this.lastCrackle=-Infinity;this.onstate=null;
  if(context)this.initialize();
 }
 initialize(){
  if(this.master)return;const c=this.context;
  this.master=c.createGain();this.master.gain.value=this.enabled?MIX.master:0;
  this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-12;this.compressor.knee.value=14;this.compressor.ratio.value=5;this.compressor.attack.value=.004;this.compressor.release.value=.2;
  this.master.connect(this.compressor);this.compressor.connect(this.output||c.destination);
  this.noise=c.createBuffer(1,c.sampleRate*3,c.sampleRate);const n=this.noise.getChannelData(0);for(let i=0;i<n.length;i++)n[i]=this.random()*2-1;
  this.rooms={};this.convolvers={};this.impulses={};
  for(const style of ['sticker','cinema']){
   const profile=MIX[style],ir=c.createBuffer(2,Math.ceil(profile.room*c.sampleRate),c.sampleRate);
   for(let ch=0;ch<2;ch++){const data=ir.getChannelData(ch);let smooth=0;for(let i=0;i<data.length;i++){smooth=smooth*.45+(this.random()*2-1)*.55;data[i]=smooth*Math.exp(-i/data.length*6)*(i<300?i/300:1);}}
   const convolver=c.createConvolver(),send=c.createGain();convolver.buffer=ir;send.gain.value=profile.send;send.connect(convolver);convolver.connect(this.master);this.rooms[style]=send;this.convolvers[style]=convolver;this.impulses[style]=ir;
  }
  c.onstatechange=()=>this.onstate?.();
 }
 get ready(){return !!this.master&&this.context.state==='running';}
 async unlock(){
  if(!this.enabled)return false;
  try{if(!this.context){const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return false;this.context=new Context({latencyHint:'interactive'});this.initialize();}
   this.authorized=true;if(this.context.state==='suspended')await this.context.resume();this.onstate?.();return this.ready;
  }catch{this.onstate?.();return false;}
 }
 setEnabled(value){this.enabled=!!value;if(!this.context)return;
  const t=this.context.currentTime;this.master.gain.cancelScheduledValues(t);this.master.gain.setTargetAtTime(value?MIX.master:0,t,.018);
  if(!value)this.stopAll();this.onstate?.();
 }
 route(gain,pan,style=this.style){const c=this.context,panner=c.createStereoPanner?c.createStereoPanner():c.createGain();if(panner.pan)panner.pan.value=clamp(pan,-.8,.8);gain.connect(panner);panner.connect(this.master);panner.connect(this.rooms[style]);return panner;}
 envelope(param,t,attack,decay,level){param.setValueAtTime(.00001,t);param.exponentialRampToValueAtTime(Math.max(.00002,level),t+Math.max(.002,attack));param.exponentialRampToValueAtTime(.00001,t+attack+decay);}
 register(source,nodes,end){this.voices.add(source);source.onended=()=>{this.voices.delete(source);for(const n of [source,...nodes])try{n.disconnect();}catch{}};source.stop(end);}
 tone(t,duration,f0,f1,level,pan=0,type='sine',style=this.style){
  if(!this.context||this.voices.size>=MIX.maxVoices)return;const c=this.context,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+duration);this.envelope(g.gain,t,.006,duration-.006,level);o.connect(g);const p=this.route(g,pan,style);o.start(t);this.register(o,[g,p],t+duration+.01);
 }
 hiss(t,duration,level,frequency=2000,pan=0,{attack=.01,endFrequency=frequency,q=.7,type='bandpass',style=this.style}={}){
  if(!this.context||this.voices.size>=MIX.maxVoices)return;const c=this.context,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type=type;f.Q.value=q;f.frequency.setValueAtTime(frequency,t);f.frequency.exponentialRampToValueAtTime(Math.max(50,endFrequency),t+duration);this.envelope(g.gain,t,Math.min(attack,duration*.7),duration-Math.min(attack,duration*.7),level);s.connect(f);f.connect(g);const p=this.route(g,pan,style);s.start(t,this.random()*.8);this.register(s,[f,g,p],t+duration+.01);
 }
 launch(event,when=this.context?.currentTime){
  if(!this.enabled||!this.context||when===undefined)return;const pan=(event.x-.5)*1.4,duration=event.duration;
  if(!['cinema','glow'].includes(event.style)){
   this.hiss(when,duration*.8,.13,850,pan,{attack:.09,endFrequency:3200,q:1,style:'sticker'});
   this.tone(when+.03,duration*.82,350,1050,.045,pan,'sine','sticker');
  }else{
   this.hiss(when,.12,.36,180,pan,{attack:.008,endFrequency:90,type:'lowpass',style:'cinema'});
   this.hiss(when+.04,duration*.95,.23,700,pan,{attack:.13,endFrequency:2600,q:.8,style:'cinema'});
   this.tone(when+.04,duration*.85,510,1250,.024,pan,'sine','cinema');
  }
 }
 burst(event,when=this.context?.currentTime){
  if(!this.enabled||!this.context||when===undefined)return;const pan=clamp((event.x-.5)*1.4,-.8,.8);if(event.inner){this.hiss(when,.13,.22,2100,pan,{attack:.003,endFrequency:800,style:'cinema'});this.tone(when,.28,140,62,.15,pan,'sine','cinema');return;}
  if(!['cinema','glow'].includes(event.style)){
   this.hiss(when,.11,.36,1700,pan,{attack:.003,endFrequency:650,q:.7,style:'sticker'});
   this.tone(when,.16,330,95,.24,pan,'sine','sticker');
   const notes=event.pattern==='heart'?[659.25,830.61,987.77]:event.pattern==='orbit'?[783.99,1174.66,1567.98]:[880,1174.66,1479.98];
   notes.forEach((note,i)=>{this.tone(when+.045+i*.055,.32,note,note*.99,.060/(1+i*.2),pan+(i-1)*.10,'sine','sticker');this.tone(when+.045+i*.055,.13,note*2.76,note*2.74,.014,pan,'sine','sticker');});
  }else{
   // Airy attack + low body + distant decay, rather than a single sine "beep".
   this.hiss(when,.14,.64,2300,pan,{attack:.002,endFrequency:700,style:'cinema'});
   this.hiss(when+.012,.75,.57,220,pan,{attack:.014,endFrequency:70,type:'lowpass',style:'cinema'});
   this.hiss(when+.05,1.35,.14,620,pan,{attack:.055,endFrequency:260,q:.5,style:'cinema'});
   this.tone(when,.62,102,38,.53,pan,'sine','cinema');this.tone(when+.015,.35,157,55,.13,pan,'sine','cinema');
   const count=event.pattern==='willow'?11:event.pattern==='crossette'?5:7;
   for(let i=0;i<count;i++){const t=when+.2+this.random()*(event.pattern==='willow'?1.5:.85);this.hiss(t,.025+this.random()*.045,.07+this.random()*.06,1800+this.random()*3500,pan+(this.random()-.5)*.35,{attack:.002,endFrequency:900,style:'cinema'});}
  }
 }
 crackle(event,when=this.context?.currentTime){if(!this.enabled||!this.context||when-this.lastCrackle<.08)return;this.lastCrackle=when;const pan=(event.x-.5)*1.4;if(!['cinema','glow'].includes(event.style)){this.tone(when,.18,1100,740,.075,pan,'sine','sticker');this.hiss(when,.025,.1,2800,pan,{attack:.002,style:'sticker'});}else this.hiss(when,.075,.17,2800,pan,{attack:.002,endFrequency:1100,style:'cinema'});}
 handle(events){if(!this.enabled||!this.ready)return;for(const raw of events){const e=raw.style==='coherent'?{...raw,style:'sticker'}:raw;if(e.type==='launch')this.launch(e);if(e.type==='burst')this.burst(e);if(e.type==='crackle')this.crackle(e);}}
 ambientStart(){
  if(this.ambient||!this.ready||!this.enabled)return;const c=this.context,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;s.loop=true;f.type='lowpass';f.frequency.value=['cinema','glow'].includes(this.style)?4200:2200;s.connect(f);f.connect(g);g.connect(this.master);g.gain.setValueAtTime(0,c.currentTime);g.gain.setTargetAtTime(['cinema','glow'].includes(this.style)?.075:.020,c.currentTime,.3);s.start();this.ambient={s,f,g};
 }
 ambientStop(){if(!this.ambient)return;const a=this.ambient,t=this.context.currentTime;this.ambient=null;a.g.gain.cancelScheduledValues(t);a.g.gain.setTargetAtTime(0,t,.04);a.s.onended=()=>{for(const n of Object.values(a))n.disconnect();};a.s.stop(t+.25);}
 setScene(effect,style){style=['cinema','glow'].includes(style)?'cinema':'sticker';if(effect!==this.effect||style!==this.style){this.ambientStop();this.effect=effect;this.style=style;this.tapClock=0;}}
 update(dt){if(!this.enabled||!this.ready)return;if(this.effect==='smile'){this.ambientStart();this.tapClock+=dt;if(this.tapClock>(this.style==='sticker'?.36:.24)){this.tapClock=0;const t=this.context.currentTime,pan=(this.random()-.5)*1.4;
   if(this.style==='sticker')this.tone(t,.11,900+this.random()*700,470,.025,pan,'sine');
   else this.hiss(t,.023,.035,2000+this.random()*2500,pan,{attack:.002,endFrequency:1100});
  }}else this.ambientStop();}
 stopAll(){if(!this.context||!this.master)return;this.ambientStop();for(const source of this.voices)try{source.stop(this.context.currentTime+.01);}catch{}this.voices.clear();this.lastCrackle=-Infinity;for(const style of ['sticker','cinema']){this.rooms[style].disconnect();this.convolvers[style].disconnect();const cv=this.context.createConvolver();cv.buffer=this.impulses[style];this.rooms[style].connect(cv);cv.connect(this.master);this.convolvers[style]=cv;}}
 pause(){this.stopAll();if(this.context?.state==='running')this.context.suspend().catch(()=>{});}
 async resume(){if(this.authorized&&this.enabled&&this.context?.state==='suspended')try{await this.context.resume();}catch{}this.onstate?.();}
}
