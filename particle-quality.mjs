// Judge actual rendering work, rather than treating browser tab throttling as overload.
export class ParticleQuality {
  constructor(maximum=700) { this.maximum=maximum;this.limit=maximum;this.reset(); }
  reset() { this.active=false;this.slow=0;this.healthy=0;this.warmUntil=0; }
  sample({now,fps,drawMs,active,visible=true,gap=16}) {
    if(!active||!visible||gap>250){this.reset();return this.limit;}
    if(!this.active){this.active=true;this.warmUntil=now+4000;}
    if(now<this.warmUntil)return this.limit;
    if(fps<32&&drawMs>12){
      this.slow++;this.healthy=0;
      if(this.slow>=3){this.limit=Math.max(150,this.limit-80);this.slow=0;}
    }else if(fps>=40&&drawMs<8){
      this.healthy++;this.slow=0;
      if(this.healthy>=8){this.limit=Math.min(this.maximum,this.limit+80);this.healthy=0;}
    }else{this.slow=0;this.healthy=0;}
    return this.limit;
  }
}
const sample=(arr,n)=>Array.from({length:n},(_,i)=>arr[Math.floor(i*arr.length/n)]);
export function cinemaLayers(particles) {
  return [particles.filter(p=>!p.innerRay&&!p.cinemaDust),particles.filter(p=>p.innerRay),particles.filter(p=>p.cinemaDust)];
}
export function interleaveCinema(particles) {
  const groups=cinemaLayers(particles);if(!groups[1].length||!groups[2].length)return particles;
  const result=[];for(let i=0;i<Math.max(...groups.map(g=>g.length));i++)for(const group of groups)if(group[i])result.push(group[i]);return result;
}
export function thinCinema(particles,budget) {
  if(budget>=particles.length)return null;
  const groups=cinemaLayers(particles);if(!groups[1].length||!groups[2].length)return null;
  // Preserve every structural layer even at the minimum performance budget.
  const counts=groups.map((g,i)=>Math.min(g.length,Math.floor(budget*[.60,.16,.24][i])));
  while(counts.reduce((a,n)=>a+n,0)<budget){let filled=false;for(const i of[0,1,2])if(counts[i]<groups[i].length&&counts.reduce((a,n)=>a+n,0)<budget){counts[i]++;filled=true;}if(!filled)break;}
  return interleaveCinema(groups.flatMap((g,i)=>sample(g,counts[i])));
}
