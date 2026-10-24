import{SoundDesigner as SampledSoundDesigner}from'./sound-bank.mjs';
import{RainAudio}from'./rain-audio.mjs';
import{clamp}from'./core.mjs';import{particleVisibility}from'./particle-visibility.mjs';import{refinedDissolveStart}from'./cinema-refined-particles.mjs';
export const MIX=Object.freeze({master:.38,maxVoices:24,echoDelay:.065});
// Recorded launch, water, paper, booms and glitter are decoded before playback.
// Envelopes follow actual events; glitter never loops or repeats cut fragments.
export class SoundDesigner extends SampledSoundDesigner{
 constructor(options={}){super(options);this.shimmers=new Map();this.lastAnalysis=-Infinity;}
 async load(){return super.load();}
 play(name,{when=this.context?.currentTime,gain=.4,rate=1,pan=0,duration,offset,highpass=0,lowpass=0,priority=1,dynamic=false,fade=.16}={}){
  if(!this.enabled||!this.ready||when===undefined)return null;this.prune();const asset=this.buffers.get(name);if(!asset)return null;
  if(this.voices.size>=(priority<3?MIX.maxVoices-6:MIX.maxVoices))return null;
  const c=this.context,s=c.createBufferSource(),g=c.createGain(),nodes=[g];s.buffer=asset.buffer;s.playbackRate.value=rate;let end=s,filter;
  when=Math.max(c.currentTime,when);offset=offset??asset.offset;
  const seconds=Math.max(.05,Math.min(duration??Infinity,(asset.buffer.duration-offset)/rate)),level=gain*(this.normalization.get(name)||1);
  for(const[type,hz]of[['highpass',highpass],['lowpass',lowpass]])if(hz){const f=c.createBiquadFilter();f.type=type;f.frequency.value=hz;f.Q.value=.5;end.connect(f);end=f;nodes.push(f);if(type==='lowpass')filter=f.frequency;}
  end.connect(g);const p=c.createStereoPanner?.();if(p){p.pan.value=clamp(pan,-.75,.75);g.connect(p);p.connect(this.master);nodes.push(p);}else g.connect(this.master);
  g.gain.setValueAtTime(0,when);
  if(dynamic)g.gain.linearRampToValueAtTime(0,when+.015);
  else{g.gain.linearRampToValueAtTime(level,when+.006);g.gain.setValueAtTime(level,when+Math.max(.008,seconds-Math.min(fade,seconds*.48)));g.gain.linearRampToValueAtTime(0,when+seconds);}
  this.voices.add(s);this.voiceInfo.set(s,{nodes,gain:g.gain,panner:p?.pan,filter,level,currentLevel:dynamic?0:level,when,duration:seconds,priority,name,dynamic,lastLit:when});s.onended=()=>this.release(s);s.start(when,offset);s.stop(when+seconds+.008);return s;
 }
 release(source){const info=this.voiceInfo.get(source);if(!info)return;if(this.shimmers?.get(info.name)===source)this.shimmers.delete(info.name);super.release(source);}
 fade(source,seconds=.28){const v=this.voiceInfo.get(source);if(!v||v.fading)return;const now=this.context.currentTime;v.fading=true;v.stopAt=now+seconds+.008;if(v.gain.cancelAndHoldAtTime)v.gain.cancelAndHoldAtTime(now);else{v.gain.cancelScheduledValues(now);v.gain.setValueAtTime(now<v.when?0:v.currentLevel,now);}v.gain.linearRampToValueAtTime(0,now+seconds);try{source.stop(v.stopAt);}catch{}this.voices.delete(source);}
 prune(){const now=this.context?.currentTime??0;for(const[source,v]of this.voiceInfo)if(now>=(v.stopAt??v.when+v.duration+.02))this.release(source);}
 launch(e){this.play('launch',{gain:.14,rate:.98+this.random()*.04,duration:e.duration||.65,fade:.13,highpass:1200,lowpass:9500,pan:(e.x-.5)*1.2,priority:3});}
 big(e){const flat=e.style==='flat',gain=flat?.29+this.random()*.14:.68,rate=(flat?.95:.98)+this.random()*(flat?.13:.045),pan=(e.x-.5)*1.2;this.play('explode',{gain,rate,pan,priority:4,fade:.18});if(e.style!=='gift')this.shimmer(e,false);}
 small(e){if(!this.allow('small',.065))return;this.play('explode',{gain:(e.style==='flat'?.14:.11)+this.random()*.07,rate:1.06+this.random()*.16,highpass:180,lowpass:6000,pan:(e.x-.5)*1.3,priority:3,fade:.25});}
 shimmer(e,ending=true){if(e.style==='gift')return;const name='sparks',old=this.shimmers.get(name);if(old&&this.voiceInfo.has(old))return;if(!this.allow(name+'-start',1.4))return;const source=this.play(name,{gain:.030,rate:.98+this.random()*.065,pan:(e.x-.5),priority:1,dynamic:true,lowpass:6500,highpass:650});if(source)this.shimmers.set(name,source);}
 glitter(e){this.shimmer(e,true);}
 confetti(e){if(!this.allow('paper',.16))return;this.play('paperLight',{gain:(.14+this.random()*.025)/3,rate:.97+this.random()*.06,fade:.10,pan:(e.x-.5)*1.2,highpass:1700,lowpass:9500,priority:2});}
 handle(events){if(!this.ready||!this.enabled)return;for(const e of events){if(e.type==='launch')this.launch(e);else if(e.type==='burst'){if(e.style==='flat')this.small(e);else this.big(e);}else if(e.type==='crackle'){if(e.style==='gift'&&e.collision)this.confetti(e);else if(e.style==='flat'&&e.stage===2)this.big(e);else if(e.stage>=3)this.glitter(e);else this.small(e);}else if(e.type==='glitter')this.glitter(e);else if(e.type==='flight-blocked')for(const[source,v]of this.voiceInfo)if(v.name==='launch')this.fade(source,.18);}}
 update(dt,world){this.prune();if(!world||!this.ready||!this.enabled){this.rain?.stop();return;}this.rain??=new RainAudio(this.context,this.master,this.random,this.buffers.get('water'),this.normalization.get('water'));this.rain.update(world,true);const now=this.context.currentTime;if(now-this.lastAnalysis<.05)return;this.lastAnalysis=now;let lit=0,spreadX=0;
  if(this.style!=='gift')for(const p of world.particles){if(p.life<=0||p.delay>0||(world.viewport&&(p.x<0||p.x>world.viewport.width||p.y<0||p.y>world.viewport.height)))continue;let weight=0;const age=p.maxLife-p.life;
   if(p.cinemaDust)weight=clamp(age/.1)*clamp(p.life/.55)*(.45+.55*Math.sin(age*29+p.seed)**2);
   else if(p.ringBlob&&p.refinedCinema)weight=clamp(((world.simulationTime||0)-(p.shellStartedAt||0)-refinedDissolveStart(p))/.3)*clamp(p.life/.4)*(.2+.8*Math.sin(age*11+p.seed)**2);
   else if(p.flatFx&&(p.whiteFlash||p.flatTailSpark||p.openingGlint))weight=clamp(p.life/.35)*Math.max(0,Math.sin(age*17+p.seed))**2;
   weight*=particleVisibility(p);lit+=weight;spreadX+=p.x*weight;
  }
  for(const source of this.shimmers.values()){const v=this.voiceInfo.get(source);if(!v||v.fading)continue;if(lit<.7){if(now-v.lastLit>.18)this.fade(source,.38);continue;}v.lastLit=now;const density=clamp(lit/40),life=clamp((v.when+v.duration-now)/.45),target=v.level*(.35+.65*density)*life;v.currentLevel+=(target-v.currentLevel)*.32;v.gain.setTargetAtTime(v.currentLevel,now,.045);v.filter?.setTargetAtTime(4200+density*4300,now,.10);if(v.panner&&world.viewport)v.panner.setTargetAtTime(clamp((spreadX/lit/world.viewport.width-.5)*1.1,-.7,.7),now,.10);}
 }
 setScene(effect,style){if(effect!==this.effect||style!==this.style){this.rain?.stop();for(const[source,v]of this.voiceInfo)if(v.priority<3)this.fade(source,.30);this.effect=effect;this.style=style;}}
 ambientStop(){for(const[source,v]of this.voiceInfo)if(v.priority<3)this.fade(source,.30);}
 stopAll(){this.rain?.stop(.18);for(const source of [...this.voiceInfo.keys()])this.fade(source,.18);this.last.clear();}
}
