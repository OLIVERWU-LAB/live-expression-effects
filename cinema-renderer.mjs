import {RefinedCinemaRenderer} from './cinema-refined-renderer.mjs?v=b71ed6cff27a';
import {OriginalCinemaRenderer} from './cinema-original-renderer.mjs?v=b71ed6cff27a';
import {particleVisibility} from './particle-visibility.mjs?v=b71ed6cff27a';
import {HandGlowRenderer} from './handglow.mjs?v=b71ed6cff27a';
import {clamp} from './core.mjs?v=b71ed6cff27a';
import {mixHex} from './emission.mjs?v=b71ed6cff27a';
const TAU=Math.PI*2;
export class CinemaRenderer{
 constructor(){this.glows=new Map();this.heads=new Map();this.hand=new HandGlowRenderer();this.original=new OriginalCinemaRenderer();this.refined=new RefinedCinemaRenderer();}
 glow(color){if(this.glows.has(color))return this.glows.get(color);if(this.glows.size>=32)this.glows.delete(this.glows.keys().next().value);const c=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(80,80):Object.assign(document.createElement('canvas'),{width:80,height:80}),g=c.getContext('2d'),a=g.createRadialGradient(40,40,0,40,40,40);a.addColorStop(0,color+'d9');a.addColorStop(.18,color+'a0');a.addColorStop(.42,color+'39');a.addColorStop(1,color+'00');g.fillStyle=a;g.fillRect(0,0,80,80);this.glows.set(color,c);return c;}
 // A single cached emitter: a broad hot core falls continuously into coloured light.
 // No separately drawn tiny disc or large translucent halo around the head.
 head(color){
  if(this.heads.has(color))return this.heads.get(color);
  if(this.heads.size>=32)this.heads.delete(this.heads.keys().next().value);
  const c=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(80,80):Object.assign(document.createElement('canvas'),{width:80,height:80}),g=c.getContext('2d'),a=g.createRadialGradient(40,40,0,40,40,40);
  a.addColorStop(0,mixHex(color,'#FFFAF2',.94));a.addColorStop(.28,mixHex(color,'#FFFAF2',.88));a.addColorStop(.48,mixHex(color,'#FFFAF2',.62));a.addColorStop(.62,color+'E8');a.addColorStop(.82,color+'50');a.addColorStop(1,color+'00');
  g.fillStyle=a;g.fillRect(0,0,80,80);this.heads.set(color,c);return c;
 }
 beam(g,p,color,alpha,width){
  const mesh=cinemaTrailGeometry(p,width);if(mesh.points.length<2||alpha<.002)return;
  const last=mesh.points.at(-1),tint=p.trailTint||color,body=g.createLinearGradient(p.x,p.y,last.x,last.y);
  // Both cross-section layers have the same hue. White belongs only to the head.
  body.addColorStop(0,tint);body.addColorStop(.08,tint);body.addColorStop(.42,tint+'C0');body.addColorStop(.78,tint+'54');body.addColorStop(1,tint+'00');
  g.save();g.globalCompositeOperation='screen';g.fillStyle=body;
  const fill=(shape,strength)=>{g.globalAlpha=clamp(alpha*strength);g.beginPath();g.moveTo(p.x,p.y);for(const q of shape.left.slice(1))g.lineTo(q.x,q.y);for(const q of [...shape.right.slice(1)].reverse())g.lineTo(q.x,q.y);g.closePath();g.fill();};
  fill(mesh,.28);fill(cinemaTrailGeometry(p,width*.52),.95);g.restore();
 }
 movingHead(g,p,color,alpha,size){
  const r=Math.max(1.6,size*3.5),heading=Math.atan2(p.vy||0,p.vx||0);
  g.save();g.translate(p.x,p.y);g.rotate(heading);g.globalCompositeOperation='screen';g.globalAlpha=clamp(alpha*1.3);
  // Elongated along the real velocity, with a restrained transverse bright width.
  g.drawImage(this.head(color),-r*1.12,-r*.82,r*2.24,r*1.64);g.restore();
 }
 fragments(g,p,age,alpha,size){
  if(alpha<.002)return;const count=p.ringBlob?3:2,late=clamp((age/p.maxLife-.45)/.4),color=mixHex(p.tint,'#FFF4D4',.22);
  g.save();g.translate(p.x,p.y);g.fillStyle=color;
  for(let k=0;k<count;k++){
   const a=p.seed+k*2.39996,spread=(2+late*9)*Math.sqrt(p.scale||1),r=Math.max(.8,size*(p.ringBlob?.58:.62)),blink=.22+.78*Math.sin(age*17+p.seed+k*1.9)**2;
   g.save();g.translate(Math.cos(a)*spread,Math.sin(a)*spread+late*late*4);g.rotate(a+age*.45);g.globalAlpha=alpha*blink*.20;const glowSize=r*3.2;g.drawImage(this.glow(p.tint),-glowSize,-glowSize,glowSize*2,glowSize*2);g.globalAlpha=alpha*blink;
   g.beginPath();g.moveTo(-r,0);g.quadraticCurveTo(-r*.2,-r*.7,r*.95,-r*.2);g.lineTo(r*.45,r*.65);g.quadraticCurveTo(-r*.3,r*.5,-r,0);g.fill();g.restore();
  }g.restore();
 }
 // Four curved points, with a transient longer rear point; later fragments are round.
 repriseLight(g,x,y,r,color,alpha,round=false,tail=0){
  if(alpha<.002)return;g.save();g.translate(x,y);g.globalAlpha=clamp(alpha*1.75);
  if(round){
   const light=g.createRadialGradient(r*.15,-r*.08,0,0,0,r*1.12);
   light.addColorStop(0,mixHex(color,'#FFF9E8',.65));light.addColorStop(.14,mixHex(color,'#FFF9E8',.40));light.addColorStop(.45,mixHex(color,'#FFF9E8',.08));light.addColorStop(.80,color);light.addColorStop(1,color+'00');g.fillStyle=light;g.beginPath();g.arc(0,0,r,0,TAU);
  }else{
   const back=r*(1+tail),light=g.createLinearGradient(r,0,-back,0);
   light.addColorStop(0,mixHex(color,'#FFF9E8',.72));light.addColorStop(.18,mixHex(color,'#FFF9E8',.52));light.addColorStop(.38,color);light.addColorStop(.72,color+'A0');light.addColorStop(1,color+'00');g.fillStyle=light;
   g.beginPath();g.moveTo(r,0);g.quadraticCurveTo(r*.18,r*.14,0,r*.78);g.quadraticCurveTo(-r*.16,r*.12,-back,0);g.quadraticCurveTo(-r*.16,-r*.12,0,-r*.78);g.quadraticCurveTo(r*.18,-r*.14,r,0);
  }g.closePath();g.fill();g.restore();
 }
 reprise(g,p){
  const age=p.maxLife-p.life,e=cinemaRepriseEnvelope(p),color=p.tint,r=p.size*.76,tail=cinemaRepriseTail(age);
  if(tail>.001&&e.shape>.001)this.beam(g,p,color,e.alpha*e.shape*e.brightness*tail,p.size*.23);
  g.save();g.translate(p.x,p.y);g.save();g.rotate(Math.atan2(p.vy||0,p.vx||0));
  if(e.shape>.001)this.repriseLight(g,0,0,r,color,e.alpha*e.shape*e.brightness,false,tail*2.4);
  g.restore();g.rotate(p.angle+age*.18);
  for(let k=0;k<3;k++){
   const a=p.seed*.17+k/3*TAU,offset=e.split*(4+8*e.progress)*(.78+.22*Math.sin(p.seed+k*1.7)),x=Math.cos(a)*offset,y=Math.sin(a)*offset+e.progress*e.progress*5,blink=.28+.72*(.5+.5*Math.sin(age*(p.blinkRate||8)+p.seed*2.17+k*1.8))**2;
   if(e.scraps>.001)this.repriseLight(g,x,y,r*.49,color,e.alpha*e.scraps*blink,true);
   if(e.dust>.001){const rr=Math.max(.7,p.size*.19),light=e.alpha*e.dust*blink;g.globalAlpha=light*.24;g.drawImage(this.glow(color),x-rr*2.3,y-rr*2.3,rr*4.6,rr*4.6);g.globalAlpha=light;g.fillStyle=mixHex(color,'#FFF9DF',.15);g.beginPath();g.arc(x,y,rr,0,TAU);g.fill();if(blink>.90){g.globalAlpha=light*.65;g.fillRect(x-rr*2.2,y-.3,rr*4.4,.6);g.fillRect(x-.3,y-rr*2.2,.6,rr*4.4);}}
  }g.restore();
 }

 draw(g,world){if(world.style==='glow'){this.hand.draw(g,world);return;}if(world.particles.some(p=>p.refinedCinema)||world.blooms.some(b=>b.refinedCinema))this.refined.draw(g,{...world,particles:world.particles.filter(p=>p.refinedCinema),blooms:world.blooms.filter(b=>b.refinedCinema)});if(world.particles.some(p=>p.classicCinema&&!p.refinedCinema)||world.blooms.some(b=>b.classicCinema&&!b.refinedCinema))this.original.draw(g,{...world,particles:world.particles.filter(p=>p.classicCinema&&!p.refinedCinema),blooms:world.blooms.filter(b=>b.classicCinema&&!b.refinedCinema)});g.save();g.globalCompositeOperation='lighter';g.lineCap='round';g.lineJoin='round';
  for(const p of world.particles){if(!p.cinematic||p.classicCinema||p.delay>0)continue;const age=p.maxLife-p.life,remaining=clamp(p.life/p.maxLife),color=p.tint;
   if(p.ringBlob){this.reprise(g,p);continue;}
   const burn=Math.min(1,age/.025)*Math.pow(remaining,.70),flicker=p.cinemaDust?(.28+.72*Math.pow(Math.max(0,Math.sin(age*23+p.seed)),3)):.83+.17*Math.sin(age*14+p.seed),light=clamp(particleVisibility(p)*1.18*burn*flicker*(p.luminosity||1)*clamp((age-.06)/.10)),size=p.size*(.35+.65*Math.pow(remaining,.6));
   if(p.cinemaDust){
    const split=cinemaErosion(p),lit=clamp(particleVisibility(p)*clamp(age/.12)*clamp(p.life/.65)*(.32+.88*Math.sin(age*29+p.seed)**2)*(p.luminosity??1)),r=Math.max(.75,p.size*(.9+.1*remaining));
    g.globalAlpha=lit*(1-split);g.drawImage(this.head(color),p.x-r*2,p.y-r*2,r*4,r*4);
    if(split<.5&&Math.sin(age*29+p.seed)>.94){g.globalAlpha=lit*.65;g.fillRect(p.x-r*2,p.y-.35,r*4,.7);g.fillRect(p.x-.35,p.y-r*2,.7,r*4);}this.fragments(g,p,age,lit*split,r);continue;}

   this.beam(g,p,color,light,Math.max(.38,size*.55));
   this.movingHead(g,p,p.trailTint||color,light,size);
  }
  for(const b of world.blooms)if(b.referenceCinema&&!b.classicCinema)this.flash(g,b);
  g.restore();
 }
 launches(g,world,w,h){if(world.style!=='cinema'){this.hand.launches(g,world,w,h);return;}const original=(world.rockets||[]).filter(r=>['cinema-original','cinema-refined'].includes(r.pattern));if(original.length)this.original.launches(g,{...world,rockets:original},w,h);this.hand.launches(g,{...world,rockets:(world.rockets||[]).filter(r=>!['cinema-original','cinema-refined'].includes(r.pattern))},w,h);}

 flash(g,b){
  const t=b.age;if(t>.38)return;const alpha=clamp(t/.012)*Math.exp(-Math.max(0,t-.13)*17),r=b.size*(.20+.95*(1-Math.exp(-t*16))),color='#FFD338';g.save();g.translate(b.x,b.y);g.globalCompositeOperation='screen';
  g.globalAlpha=alpha*.60;g.drawImage(this.glow(color),-r*1.7,-r*1.7,r*3.4,r*3.4);
  // The reference's gold shock ring, four unequal sharp axes and low curved arc.
  g.strokeStyle='#FFEC70';g.globalAlpha=alpha;g.lineWidth=Math.max(1.4,12.0*(1-t/.38));g.beginPath();g.arc(0,0,r*.72,0,TAU);g.stroke();
  g.strokeStyle='#FFF8C7';g.lineWidth=Math.max(.7,2*(1-t/.38));g.beginPath();g.arc(0,0,r*.72,-.20,Math.PI*1.18);g.stroke();
  for(let i=0;i<8;i++){const a=i/8*TAU+(i%2?.08:0),length=r*(i%2?.56:1.14),cross=r*.035;g.save();g.rotate(a);g.beginPath();g.moveTo(0,-cross);g.quadraticCurveTo(length*.36,-cross*.6,length,0);g.quadraticCurveTo(length*.36,cross*.6,0,cross);g.closePath();g.fillStyle=i%2?color:'#FFF5B0';g.globalAlpha=alpha*(i%2?.6:1);g.fill();g.restore();}
  g.globalAlpha=alpha*.92;g.strokeStyle='#FFF1AC';g.lineWidth=2.8;g.beginPath();g.ellipse(0,r*.87,r*.86,r*.17,-.08,.02,Math.PI*.98);g.stroke();
  for(let i=0;i<8;i++){const a=i/8*TAU+b.seed*.07,rr=r*(.40+.65*(.5+.5*Math.sin(i*3+b.seed)));g.save();g.translate(Math.cos(a)*rr,Math.sin(a)*rr);g.rotate(a);g.fillStyle='#FFE441';g.globalAlpha=alpha*.62;g.fillRect(-1.6,-3,3.2,6);g.restore();}
  g.globalAlpha=alpha;g.fillStyle='#FFF4A4';g.beginPath();g.arc(0,0,Math.max(1.4,r*.095),0,TAU);g.fill();g.restore();
 }
}

// Arc-length taper, one filled silhouette and no skipped segments or overlapping joints.
export function cinemaTrailGeometry(p,width=1){
 const points=[{x:p.x,y:p.y,d:0}],cap=p.ringBlob?32:p.filament?66:105;
 for(const q of p.trail||[]){const prev=points.at(-1),step=Math.hypot(q.x-prev.x,q.y-prev.y);if(step<.12)continue;const part=Math.min(1,(cap-prev.d)/step);points.push({x:prev.x+(q.x-prev.x)*part,y:prev.y+(q.y-prev.y)*part,d:prev.d+step*part});if(part<1||points.at(-1).d>=cap)break;}
 const total=points.at(-1).d,left=[],right=[];
 for(let i=0;i<points.length;i++){const q=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],len=Math.hypot(b.x-a.x,b.y-a.y)||1,w=width*1.65*Math.pow(1-q.d/(total||1),.85),nx=-(b.y-a.y)/len,ny=(b.x-a.x)/len;left.push({x:q.x+nx*w,y:q.y+ny*w});right.push({x:q.x-nx*w,y:q.y-ny*w});}
 return{points,left,right};
}
export function cinemaErosion(p){const t=(p.maxLife-p.life)/p.maxLife,u=clamp((t-.66)/.28);return u*u*(3-2*u);}

// Continuous, per-particle phases: transient tailed four-point spark -> three round lights -> glints.
export function cinemaRepriseEnvelope(p){
 const age=p.maxLife-p.life,t=clamp(age/p.maxLife),smooth=u=>{u=clamp(u);return u*u*(3-2*u);},start=Math.max(0,(p.erosionAt??.34)-.10),split=smooth((t-start)/.24),points=smooth((t-start-.24)/.23),pulse=.42+.58*(.5+.5*Math.sin(age*(p.blinkRate||8)+p.seed*2.17))**2;
 return{progress:t,split,points,shape:1-split,scraps:split*(1-points),dust:split*points,brightness:pulse,alpha:particleVisibility(p)*clamp(age/.08)*clamp(p.life/.58)*(p.luminosity??.7)};
}

// Only the opening beat carries a tail; it is gone before the shape splits.
export function cinemaRepriseTail(age){return clamp(age/.035)*Math.pow(clamp((.34-age)/.25),1.7);}
