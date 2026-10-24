import{clamp}from'./core.mjs?v=2b0ba957a1a8';
import{proceduralTexture}from'./sound-textures.mjs?v=2b0ba957a1a8';
// A shared, small noise buffer; filters run on the audio thread. No downloaded
// rain asset, main-thread audio callback, playback timer or per-drop voice.
export class RainAudio{
 constructor(context,output,random=Math.random,waterAsset=null,waterNormalization=1){this.waterAsset=waterAsset;this.waterNormalization=waterNormalization;this.context=context;this.output=output;this.random=random;this.voices=new Set();this.beds=[];this.seen=new WeakSet();this.lastAnalysis=-Infinity;this.lastHit=-Infinity;this.lastPersonHit=-Infinity;this.lastWaterHit=-Infinity;}
 prepare(){
  if(this.buffer)return;const c=this.context,rate=Math.min(c.sampleRate||44100,48000),length=Math.round(rate*1.6),buffer=c.createBuffer(1,length,rate),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=this.random()*2-1;
  // Crossfade into the loop's preceding samples; the join has ordinary noise
  // amplitude rather than a repeated click or silence at the buffer boundary.
  const seam=Math.round(rate*.04);for(let i=0;i<seam;i++){const t=i/seam;data[length-seam+i]=data[length-seam+i]*(1-t)+data[i]*t;}
  this.buffer=buffer;this.loopStart=seam/rate;
 }
 voice({gain=0,pan=0,high=600,low=4500,loop=false,duration=.13,kind='noise'}={}){
  const c=this.context,source=c.createBufferSource(),g=c.createGain(),hp=c.createBiquadFilter(),lp=c.createBiquadFilter(),p=c.createStereoPanner?.();
  if(kind==='water')this.waterBuffer??=this.waterAsset?.buffer||proceduralTexture(c,'water',this.random);source.buffer=kind==='water'?this.waterBuffer:this.buffer;if(kind==='water'){gain*=this.waterNormalization;source.playbackRate.value=.97+this.random()*.06;}source.loop=loop;source.loopStart=this.loopStart;source.loopEnd=source.buffer.duration;hp.type='highpass';hp.frequency.value=high;hp.Q.value=.5;lp.type='lowpass';lp.frequency.value=low;lp.Q.value=.5;g.gain.setValueAtTime(0,c.currentTime);
  source.connect(hp);hp.connect(lp);lp.connect(g);if(p){p.pan.value=pan;g.connect(p);p.connect(this.output);}else g.connect(this.output);
  const v={source,gain:g.gain,nodes:[source,hp,lp,g,...(p?[p]:[])],loop,kind,level:0,when:c.currentTime,peak:gain,duration};this.voices.add(v);source.onended=()=>this.release(v);
  source.start(c.currentTime,kind==='water'?(this.waterAsset?.offset||0):this.loopStart+this.random()*(this.buffer.duration-this.loopStart-duration));
  if(!loop){g.gain.linearRampToValueAtTime(gain,c.currentTime+.006);g.gain.setValueAtTime(gain,c.currentTime+duration*.45);g.gain.linearRampToValueAtTime(0,c.currentTime+duration);v.end=c.currentTime+duration+.02;source.stop(v.end);}
  return v;
 }
 release(v){if(!this.voices.delete(v))return;for(const n of v.nodes)try{n.disconnect();}catch{}this.beds=this.beds.filter(b=>b!==v);}
 stop(fade=.28){const now=this.context.currentTime;for(const v of this.voices){if(v.fading)continue;v.fading=true;if(v.gain.cancelAndHoldAtTime)v.gain.cancelAndHoldAtTime(now);else{const age=Math.max(0,now-v.when),held=v.loop?v.level:age<.006?v.peak*age/.006:v.peak*clamp((v.duration-age)/(v.duration*.55));v.gain.cancelScheduledValues(now);v.gain.setValueAtTime(held,now);}v.gain.linearRampToValueAtTime(0,now+fade);v.end=now+fade+.01;try{v.source.stop(v.end);}catch{}}this.beds=[];}
 update(world,enabled){
  const now=this.context.currentTime;for(const v of this.voices)if(v.end<=now)this.release(v);
  if(!enabled||world?.effect!=='smile'){this.stop();return;}if(now-this.lastAnalysis<.05)return;this.lastAnalysis=now;
  let drops=0,hit=null;const width=world?.viewport?.width||1,height=world?.viewport?.height||Infinity;
  for(const p of world?.particles||[]){if(p.type!=='drop'||p.life<=0||p.delay>0||p.x<0||p.x>width||p.y<0||p.y>height)continue;
   if(!p.generation)drops++;else if((p.contactSpray||p.giftSplash||p.flatRound)&&!this.seen.has(p)){this.seen.add(p);const person=p.hitRegion&&p.hitRegion!=='water',oldPerson=hit?.hitRegion&&hit.hitRegion!=='water';if(!hit||person&&!oldPerson||!!person===!!oldPerson&&p.size>hit.size)hit=p;}
  }
  if(drops===0){this.stop();return;}this.prepare();
  if(!this.beds.length&&this.voices.size<4)this.beds=[this.voice({loop:true,pan:-.3,high:450,low:4300}),this.voice({loop:true,pan:.4,high:2200,low:8500})];
  const density=clamp(Math.sqrt(drops/110),.35,1),swell=1+.035*Math.sin(now*.91)+.025*Math.sin(now*1.73);
  this.beds.forEach((v,i)=>{v.level=(i?.035:.15)*density*swell;v.gain.setTargetAtTime(v.level,now,.14);});
  // Aggregate beads; reserve the audible contact for the person, not the pool.
  const person=hit?.hitRegion&&hit.hitRegion!=='water';
  if(hit&&now-(person?this.lastPersonHit:this.lastWaterHit)>(person?.17:.26)&&this.voices.size<6){this.lastHit=now;if(person)this.lastPersonHit=now;else this.lastWaterHit=now;this.voice({kind:'water',gain:person?.22+Math.min(hit.size,8)*.008:.075+Math.min(hit.size,8)*.004,pan:clamp((hit.x/width-.5)*1.4,-.7,.7),high:180,low:9000,duration:this.waterAsset?.buffer ? .24+this.random()*.025 : .10+this.random()*.035});}
 }
}
