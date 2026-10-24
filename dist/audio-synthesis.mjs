// Small procedural textures, prepared once. No recordings, downloads or decoding.
export const SYNTH_RATE=22050;
export const SYNTH_TEXTURES=Object.freeze({air:1.25,boom:1.8,chime:.64,paper:.34});
const TAU=Math.PI*2;
const randomFor=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
export function synthesizeTexture(kind,sampleRate=SYNTH_RATE){
 const duration=SYNTH_TEXTURES[kind];if(!duration)throw Error('Unknown procedural sound: '+kind);
 const data=new Float32Array(Math.ceil(duration*sampleRate)),random=randomFor({air:71,boom:571,chime:2071,paper:3171}[kind]);let low=0,body=0,phase=0;
 for(let i=0;i<data.length;i++){
  const t=i/sampleRate,u=t/duration,noise=random()*2-1;low+=.075*(noise-low);body+=.018*(noise-body);let v=0;
  if(kind==='air'){
   const frequency=360+1120*(1-(1-u)**1.6);phase+=TAU*frequency/sampleRate;
   v=(noise-low)*.23+low*.75+Math.sin(phase+Math.sin(t*27)*.15)*.055;
  }else if(kind==='boom'){
   phase+=TAU*(36+99*Math.exp(-t*18))/sampleRate;
   const crack=noise*Math.exp(-t*34)*.24,thump=Math.sin(phase)*Math.exp(-t*8)*.24,roar=(low*2.3+body*3.8)*Math.exp(-t*3.6);
   v=Math.tanh((crack+thump+roar)*1.6)*.88;
  }else if(kind==='chime'){
   // Inharmonic, damped partials: a tiny bright grain, never a sustained bell bed.
   v=Math.sin(TAU*1640*t)*Math.exp(-t*14)*.33+Math.sin(TAU*2427*t)*Math.exp(-t*20)*.16+Math.sin(TAU*3544*t)*Math.exp(-t*27)*.07+(noise-low)*Math.exp(-t*42)*.025;
  }else{
   const fold=.55+.45*Math.sin(t*77+Math.sin(t*34)*2.1),decay=Math.exp(-t*13);
   v=((noise-low)*.24+low*.35)*fold*decay;
  }
  const attack=Math.min(1,t/(kind==='boom'?.002:.008)),release=Math.min(1,(duration-t)/.025);
  data[i]=v*attack*release;
 }
 data[0]=data[data.length-1]=0;return data;
}
export function envelopeValue(age,duration,level,attack=.008){
 if(age<=0||age>=duration)return 0;if(age<attack)return level*age/attack;
 const knee=duration*.52;if(age<=knee)return level*Math.pow(.22,(age-attack)/Math.max(.001,knee-attack));return level*.22*Math.pow(.0001/.22,(age-knee)/Math.max(.001,duration-knee));
}
