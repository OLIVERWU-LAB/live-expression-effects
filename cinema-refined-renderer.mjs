import{refinedDissolveStart}from'./cinema-refined-particles.mjs?v=503ad3f29326';
import{OriginalCinemaRenderer}from'./cinema-original-renderer.mjs?v=503ad3f29326';import{ringEnvelope}from'./cinema-original-particles.mjs?v=503ad3f29326';import{particleVisibility}from'./particle-visibility.mjs?v=503ad3f29326';import{clamp}from'./core.mjs?v=503ad3f29326';import{mixHex}from'./emission.mjs?v=503ad3f29326';
const TAU=Math.PI*2;
const canvas=(w,h)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
const phase=(seed,salt)=>.5+.5*Math.sin(seed*1.731+salt);
// Change appearance without changing particle data or random sampling.
const rayTints=new Map();
function rayTint(color){
 if(rayTints.has(color))return rayTints.get(color);
 const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),luma=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722,tint='#'+rgb.map(v=>Math.round(clamp(luma+(v-luma)*1.10,0,255)).toString(16).padStart(2,'0')).join('');
 if(rayTints.size>=32)rayTints.delete(rayTints.keys().next().value);rayTints.set(color,tint);return tint;
}
export function refinedRayLook(p,color,width){return{color:rayTint(color),width:width*(p.innerRay?1.06:p.filament?1.10:1.14),hotMix:p.innerRay?.35:.46};}
export function refinedDissolve(p,shellAge){const age=p.maxLife-p.life,start=refinedDissolveStart(p),duration=.28+.14*phase(p.seed,7.1),u=clamp((shellAge-start)/duration),split=u*u*(3-2*u);return{age,start,split,elapsed:Math.max(0,shellAge-start),alpha:particleVisibility(p)*ringEnvelope(p).alpha};}
export function refinedStrobeWhite(p){const age=p.maxLife-p.life,start=.68+.24*phase(p.seed,1.7),u=clamp((age-start)/.82);return u*u*(3-2*u);}
export function refinedGlintAlpha(p,e,k){const lead=.02+.12*phase(p.seed,3.8)+.05*phase(p.seed+k*2.3,6.1),fade=.32+.30*phase(p.ringGroup??p.seed,2.5),blink=.19+.81*(.5+.5*Math.sin(e.age*(8+(p.seed%5))+p.seed*2.17+k*2.1))**2;return clamp(particleVisibility(p)*clamp((p.life-lead)/fade)*e.split*blink*1.35);}
// Late burning wake only: keep the head and early geometry fixed. No physics/RNG changes.
export function refinedFlameTrail(p){
 const age=p.maxLife-p.life,onset=p.innerRay?.92:.72,mature=clamp((age-onset)/.48);
 if(!mature||p.ringBlob||p.cinemaDust||!p.trail?.length)return p.trail;
 const seed=p.seed||0,root=Math.sqrt(p.scale||1),cap=p.filament?66:105,axis=Math.atan2(p.vy||0,p.vx||1),nx=-Math.sin(axis),ny=Math.cos(axis);
 let distance=0,last=p;
 return p.trail.map(q=>{
  distance+=Math.hypot(q.x-last.x,q.y-last.y);last=q;
  const s=Math.min(distance,cap),away=clamp((s-3)/32),wave=Math.sin(s*.145-age*11+seed)*.68+Math.sin(s*.077-age*7+seed*1.7)*.32;
  const offset=wave*(p.innerRay?4.8:6.2)*root*mature*away;
  // Smooth, seeded cooling patches widen near the old end, not periodic missing rays.
  const cool=clamp((age-(p.innerRay?1.18:.98))/.42),old=clamp(s/50),noise=.5+.5*Math.sin(s*.24+seed*4.1-age*5.3)*Math.sin(s*.103-seed+age*3.1),dark=clamp((noise-.39)/.21);
  return{...q,x:q.x+nx*offset,y:q.y+ny*offset,tailAlpha:1-cool*old*.96*dark};
 });
}
export class RefinedCinemaRenderer extends OriginalCinemaRenderer{
 constructor(){super();this.cones=new Map();this.dots=new Map();}
 cone(color){
  if(this.cones.has(color))return this.cones.get(color);if(this.cones.size>=32)this.cones.delete(this.cones.keys().next().value);
  const c=canvas(96,64),g=c.getContext('2d');g.translate(64,32);
  const path=()=>{g.beginPath();g.moveTo(5,0);g.bezierCurveTo(5,-8,-4,-10,-7,-6);g.lineTo(-27,0);g.lineTo(-7,6);g.bezierCurveTo(-4,10,5,8,5,0);g.closePath();};
  // Blur is baked once, around the conical silhouette rather than a large round halo.
  g.shadowColor=color;g.shadowBlur=8;g.globalAlpha=.45;g.fillStyle=color;path();g.fill();g.shadowBlur=0;g.globalAlpha=1;
  const light=g.createLinearGradient(5,0,-27,0);light.addColorStop(0,mixHex(color,'#FFFAEF',.62));light.addColorStop(.16,mixHex(color,'#FFFAEF',.48));light.addColorStop(.50,mixHex(color,'#FFFAEF',.10));light.addColorStop(.85,color+'55');light.addColorStop(1,color+'00');g.fillStyle=light;path();g.fill();this.cones.set(color,c);return c;
 }
 dot(color){
  if(this.dots.has(color))return this.dots.get(color);if(this.dots.size>=32)this.dots.delete(this.dots.keys().next().value);
  const c=canvas(48,48),g=c.getContext('2d'),light=g.createRadialGradient(24,24,0,24,24,24);light.addColorStop(0,mixHex(color,'#FFFAEF',.85));light.addColorStop(.30,mixHex(color,'#FFFAEF',.58));light.addColorStop(.46,color+'EF');light.addColorStop(.65,color+'44');light.addColorStop(1,color+'00');g.fillStyle=light;g.fillRect(0,0,48,48);this.dots.set(color,c);return c;
 }
 // Retain the original broad coloured sheath, hot spine, round joins and sampled
 // luminance, with a small width increase and less whitening in the hot spine.
 beam(g,p,color,alpha,width){const look=refinedRayLook(p,color,width),trail=refinedFlameTrail(p);super.beam(g,trail===p.trail?p:{...p,trail},look.color,alpha,look.width,true,look.hotMix,'screen');}
 rayHead(g,p,color,alpha,size){const f=Math.max(.045,size/7.5);g.save();g.translate(p.x,p.y);g.rotate(Math.atan2(p.vy||0,p.vx||0));g.globalCompositeOperation='screen';g.globalAlpha=clamp(alpha*1.20);g.drawImage(this.cone(refinedRayLook(p,color,1).color),-64*f,-32*f,96*f,64*f);g.restore();}
 strobe(g,p,color,age,remaining){
  const white=refinedStrobeWhite(p),lit=particleVisibility(p)*clamp(age/.12)*clamp(p.life/.50)*(.55+.45*Math.sin(age*29+p.seed)**2),r=Math.max(.75,p.size*(.9+.1*remaining)),warm='#FFF8EE';
  if(white<1){g.globalAlpha=lit*.55*(1-white);g.drawImage(this.glow(color),p.x-r*3.2,p.y-r*3.2,r*6.4,r*6.4);}
  if(white>0){g.globalAlpha=lit*.55*white;g.drawImage(this.glow(warm),p.x-r*3.2,p.y-r*3.2,r*6.4,r*6.4);}
  g.globalAlpha=lit;g.fillStyle=mixHex(mixHex(color,warm,white),'#FFFFFF',.20);g.beginPath();g.arc(p.x,p.y,r,0,TAU);g.fill();
  if(Math.sin(age*29+p.seed)>.94){g.globalAlpha=lit*.65;g.fillRect(p.x-r*2,p.y-.35,r*4,.7);g.fillRect(p.x-.35,p.y-r*2,.7,r*4);}
 }
 reprise(g,p,world){
  const shellAge=Math.max(0,(world.simulationTime??(p.maxLife-p.life))-(p.shellStartedAt??0)),e=refinedDissolve(p,shellAge);if(e.split===0){super.reprise(g,p);return;}
  const env=ringEnvelope(p),size=p.size*env.scale,r=size*3.4,color=p.tint;
  if(e.split<1){g.globalAlpha=e.alpha*.60*(1-e.split);g.drawImage(this.glow(color),p.x-r,p.y-r,r*2,r*2);g.save();g.translate(p.x,p.y);g.rotate(p.angle+e.age*.35);g.globalAlpha=e.alpha*(1-e.split);g.fillStyle=mixHex(color,'#FFF1B4',.28);g.beginPath();g.ellipse(0,0,size*(1.03+.16*Math.sin(e.age*8+p.seed)),size*.83,0,0,TAU);g.fill();g.restore();}
  const root=Math.sqrt(p.scale||1),drift=(1-Math.exp(-e.elapsed*1.8))/1.8;
  for(let k=0;k<3;k++){const a=p.seed*.37+k*2.39996,speed=(10+7*(.5+.5*Math.sin(p.seed+k*1.7)))*root,x=p.x+Math.cos(a)*speed*drift,y=p.y+Math.sin(a)*speed*drift+7*e.elapsed*e.elapsed*root,dotRadius=Math.max(.65,p.size*(.36+.06*Math.sin(p.seed+k))),outer=dotRadius*2.6;g.globalAlpha=refinedGlintAlpha(p,e,k);g.drawImage(this.dot(color),x-outer,y-outer,outer*2,outer*2);}
 }
}
