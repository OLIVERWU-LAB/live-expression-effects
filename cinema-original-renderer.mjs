// Archived v35 drawing, with pressure-fade compatibility and isolated subclass hooks.
import {HandGlowRenderer} from './handglow.mjs?v=c5a4e5600643';
import {clamp} from './core.mjs?v=c5a4e5600643';
import {mixHex} from './emission.mjs?v=c5a4e5600643';
import {ringEnvelope} from './cinema-original-particles.mjs?v=c5a4e5600643';
import {particleVisibility} from './particle-visibility.mjs?v=c5a4e5600643';
const TAU=Math.PI*2;
export class OriginalCinemaRenderer{
 constructor(){this.glows=new Map();this.hand=new HandGlowRenderer();}
 glow(color){if(this.glows.has(color))return this.glows.get(color);if(this.glows.size>=32)this.glows.delete(this.glows.keys().next().value);const c=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(80,80):Object.assign(document.createElement('canvas'),{width:80,height:80}),g=c.getContext('2d'),a=g.createRadialGradient(40,40,0,40,40,40);a.addColorStop(0,color+'d9');a.addColorStop(.18,color+'a0');a.addColorStop(.42,color+'39');a.addColorStop(1,color+'00');g.fillStyle=a;g.fillRect(0,0,80,80);this.glows.set(color,c);return c;}
 beam(g,p,color,alpha,width,continuous=false,hotMix=.57,hotComposite=null){
  const points=[{x:p.x,y:p.y}],cap=p.filament?66:105;let distance=0;
  for(const q of p.trail||[]){const a=points.at(-1),d=Math.hypot(q.x-a.x,q.y-a.y);if(d<.12)continue;if(distance+d>cap){const t=(cap-distance)/d;points.push({x:a.x+(q.x-a.x)*t,y:a.y+(q.y-a.y)*t});break;}points.push(q);distance+=d;}
  if(points.length<2)return;
  const hotColor=mixHex(color,'#FFF1DD',hotMix);
  // Taper each segment. A thin hot spine and bounded coloured sheath replace a
  // broad blurry halo; sampled points break up as burning stars cool.
  for(let i=points.length-1;i>0;i--){const t=1-i/points.length,a=points[i],b=points[i-1],fade=t*t*(a.tailAlpha??1),broken=!continuous&&p.maxLife-p.life>.42&&Math.sin(i*2.1+p.seed)> .77;if(broken)continue;
   g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.strokeStyle=color;g.globalAlpha=alpha*fade*.90;g.lineWidth=width*(.55+t)*2.30;g.stroke();g.strokeStyle=hotColor;g.globalAlpha=alpha*fade;g.lineWidth=Math.max(.35,width*t*.78);if(hotComposite){const blend=g.globalCompositeOperation;g.globalCompositeOperation=hotComposite;g.stroke();g.globalCompositeOperation=blend;}else g.stroke();
  }
 }
 draw(g,world){if(world.style==='glow'){this.hand.draw(g,world);return;}g.save();g.globalCompositeOperation='lighter';g.lineCap='round';g.lineJoin='round';
  for(const p of world.particles){if(!p.cinematic||p.delay>0)continue;const age=p.maxLife-p.life,remaining=clamp(p.life/p.maxLife),color=p.tint;
   if(p.ringBlob){this.reprise(g,p,world);continue;}
   const burn=Math.min(1,age/.025)*Math.pow(remaining,.70),flicker=p.cinemaDust?(.28+.72*Math.pow(Math.max(0,Math.sin(age*23+p.seed)),3)):.83+.17*Math.sin(age*14+p.seed),light=particleVisibility(p)*1.18*burn*flicker*(p.luminosity||1)*clamp((age-.06)/.10),size=p.size*(.35+.65*Math.pow(remaining,.6));
   if(p.cinemaDust){this.strobe(g,p,color,age,remaining);continue;}

   this.beam(g,p,color,light,Math.max(.65,size));
   this.rayHead(g,p,color,light,size);
  }
  for(const b of world.blooms)if(b.referenceCinema)this.flash(g,b);
  g.restore();
 }
 strobe(g,p,color,age,remaining){
    const lit=particleVisibility(p)*clamp(age/.12)*clamp(p.life/.50)*(.55+.45*Math.sin(age*29+p.seed)**2),r=Math.max(.75,p.size*(.9+.1*remaining));
    g.globalAlpha=lit*.55;g.drawImage(this.glow(color),p.x-r*3.2,p.y-r*3.2,r*6.4,r*6.4);
    g.globalAlpha=lit;g.fillStyle=mixHex(color,'#FFFFFF',.20);g.beginPath();g.arc(p.x,p.y,r,0,TAU);g.fill();
    if(Math.sin(age*29+p.seed)>.94){g.globalAlpha=lit*.65;g.fillRect(p.x-r*2,p.y-.35,r*4,.7);g.fillRect(p.x-.35,p.y-r*2,.7,r*4);}
 }
 reprise(g,p){
  const age=p.maxLife-p.life,env=ringEnvelope(p),size=p.size*env.scale,r=size*3.4,color=p.tint;
  g.globalAlpha=particleVisibility(p)*env.alpha*.60;g.drawImage(this.glow(color),p.x-r,p.y-r,r*2,r*2);g.save();g.translate(p.x,p.y);g.rotate(p.angle+age*.35);g.globalAlpha=particleVisibility(p)*env.alpha;g.fillStyle=mixHex(color,'#FFF1B4',.28);g.beginPath();g.ellipse(0,0,size*(1.03+.16*Math.sin(age*8+p.seed)),size*.83,0,0,TAU);g.fill();g.restore();
 }
 rayHead(g,p,color,light,size){
  const r=Math.max(4.5,size*5.5);g.globalAlpha=light*.65;g.drawImage(this.glow(color),p.x-r,p.y-r,r*2,r*2);
   g.globalAlpha=light;g.fillStyle=mixHex(color,'#FFF7E4',.62);g.beginPath();g.ellipse(p.x,p.y,Math.max(.65,size*.78),Math.max(.65,size*.78),0,0,TAU);g.fill();
 }
 launches(g,world,w,h){
  if(world.style==='glow'){this.hand.launches(g,world,w,h);return;}
  const rockets=world.rockets.filter(r=>r.pattern?.startsWith('cinema-'));if(!rockets.length)return;
  g.save();const b=world.head;if(b){g.beginPath();g.rect(-100,-100,w+200,h+200);g.moveTo(b.right+12,(b.top+b.bottom)/2);g.ellipse((b.left+b.right)/2,(b.top+b.bottom)/2,(b.right-b.left)/2+12,(b.bottom-b.top)/2+12,0,0,TAU);g.clip('evenodd');}
  g.globalCompositeOperation='screen';g.lineCap='round';
  for(const r of rockets){const q=[{x:r.x,y:r.y}];let length=0;for(const a of r.trail||[]){const d=Math.hypot(a.x-q.at(-1).x,a.y-q.at(-1).y);if(d<.15)continue;if(length+d>48)break;q.push(a);length+=d;}if(q.length>1){const last=q.at(-1),grad=g.createLinearGradient(r.x,r.y,last.x,last.y);grad.addColorStop(0,'#fff3c5ef');grad.addColorStop(.3,'#ffd58a9b');grad.addColorStop(1,'#ffbd6200');g.strokeStyle=grad;g.lineWidth=2.0;g.beginPath();g.moveTo(r.x,r.y);for(const a of q)g.lineTo(a.x,a.y);g.stroke();}
   const alpha=clamp(r.age/.05);g.globalAlpha=alpha*.65;g.drawImage(this.glow('#FFE9BC'),r.x-9,r.y-9,18,18);g.globalAlpha=alpha;g.fillStyle='#FFFAE6';g.beginPath();g.ellipse(r.x,r.y,1.8,2.6,0,0,TAU);g.fill();}
  g.restore();
 }
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
