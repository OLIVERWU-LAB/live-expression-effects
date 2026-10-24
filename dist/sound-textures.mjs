// Cached, zero-ended PCM. A soft tonal launch and short damped water resonances.
export function proceduralTexture(context,kind,random=Math.random){
 const duration=kind==='rise'?1.1:kind==='paper-soft'?.29:.15,rate=Math.min(context.sampleRate||44100,48000),buffer=context.createBuffer(1,Math.ceil(duration*rate),rate),out=buffer.getChannelData(0);let smooth=0,previous=0;
 for(let i=0;i<out.length;i++){
  const t=i/rate,white=random()*2-1;smooth+=.17*(white-smooth);const hiss=white-smooth;let value;
  if(kind==='rise'){const phase=2*Math.PI*(720*t+1050*t*t),envelope=Math.sin(Math.PI*t/duration)**1.5;value=(Math.sin(phase)*.46+Math.sin(phase*2)*.035+smooth*.018)*envelope;}
  else if(kind==='paper-soft'){const puff=(c,w)=>Math.exp(-(((t-c)/w)**2)),crinkle=.7*puff(.055,.032)+puff(.14,.045)+.6*puff(.22,.036);value=(smooth*.4+hiss*.27)*crinkle*Math.min(1,t/.018)*Math.min(1,(duration-t)/.04);}
  else{const phase=2*Math.PI*(2450*t+65*.008*(1-Math.exp(-t/.008))),wet=Math.sin(phase)*Math.exp(-t*62)+.30*Math.sin(2*Math.PI*3820*t)*Math.exp(-t*95);value=(wet*.5+hiss*.055*Math.exp(-t*150))*Math.min(1,t/.0015)*Math.min(1,(duration-t)/.018);}
  // Remove DC and enforce a soft, zero-ended buffer even when resampled.
  previous+=.002*(value-previous);out[i]=value-previous;
 }
 out[0]=0;out[out.length-1]=0;return buffer;
}
