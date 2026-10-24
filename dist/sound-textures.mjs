// Small one-shot PCM textures, created once. No oscillator sweeps for ascent:
// its sound is a breath of burning air, rather than a pitched cartoon whistle.
export function proceduralTexture(context,kind,random=Math.random){
 const duration=kind==='rise'?1.1:kind==='paper-soft'?.29:.15,rate=Math.min(context.sampleRate||44100,48000),buffer=context.createBuffer(1,Math.ceil(duration*rate),rate),out=buffer.getChannelData(0);let smooth=0,previous=0;
 for(let i=0;i<out.length;i++){
  const t=i/rate,white=random()*2-1;smooth+=.17*(white-smooth);const hiss=white-smooth;let value;
  if(kind==='rise'){const flutter=.82+.11*Math.sin(t*63)+.07*Math.sin(t*113);value=(smooth*.8+hiss*.22)*flutter*Math.min(1,t/.035)*Math.min(1,(duration-t)/.12);}
  else if(kind==='paper-soft'){const puff=(c,w)=>Math.exp(-(((t-c)/w)**2)),crinkle=.7*puff(.055,.032)+puff(.14,.045)+.6*puff(.22,.036);value=(smooth*.4+hiss*.27)*crinkle*Math.min(1,t/.018)*Math.min(1,(duration-t)/.04);}
  else{const phase=2*Math.PI*(1500*t+300*.025*(1-Math.exp(-t/.025))),wet=Math.sin(phase)+.22*Math.sin(phase*2.37);value=(wet*.40+hiss*.12)*Math.exp(-t*30)*Math.min(1,t/.004)*Math.min(1,(duration-t)/.02);}
  // Remove DC and enforce a soft, zero-ended buffer even when resampled.
  previous+=.002*(value-previous);out[i]=value-previous;
 }
 out[0]=0;out[out.length-1]=0;return buffer;
}
