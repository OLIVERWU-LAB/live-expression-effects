import {particleVisibility} from './particle-visibility.mjs?v=ce2650cbc6cf';
import {clamp} from './core.mjs?v=ce2650cbc6cf';
import {mixHex} from './emission.mjs?v=ce2650cbc6cf';
const TAU=Math.PI*2;
// Cached rough-edged luminous ink: discrete chunks, never a copy of cinema rays.
export class HandGlowRenderer{
 constructor(){this.tiles=new Map();}
 tile(color,star=false,variant=0){const key=color+star+variant;if(this.tiles.has(key))return this.tiles.get(key);if(this.tiles.size>=64)this.tiles.delete(this.tiles.keys().next().value);
  const c=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(96,96):Object.assign(document.createElement('canvas'),{width:96,height:96}),g=c.getContext('2d');
  const halo=g.createRadialGradient(48,48,8,48,48,46);halo.addColorStop(0,color+'b0');halo.addColorStop(.46,color+'48');halo.addColorStop(1,color+'00');g.fillStyle=halo;g.fillRect(0,0,96,96);g.translate(48,48);
  const path=(r)=>{g.beginPath();const n=star?10:40;for(let i=0;i<n;i++){const a=i/n*TAU-Math.PI/2,rr=star?(i%2?r*.42:r):r*(1+.12*Math.sin(a*5+variant)+.075*Math.sin(a*9+variant*2));i?g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();};
  path(star?24:23);g.fillStyle=color;g.fill();path(star?18:18);g.fillStyle=mixHex(color,'#FFF9D7',.36);g.fill();this.tiles.set(key,c);return c;
 }
 draw(g,world){g.save();g.globalCompositeOperation='screen';g.lineCap='round';g.lineJoin='round';
  for(const p of world.particles){if(!p.handDrawn||p.delay>0)continue;const age=p.maxLife-p.life,t=age/p.maxLife,fade=particleVisibility(p)*clamp(age/.055)*clamp(p.life/.45),color=p.tint,variant=Math.floor(p.seed)%3;
   if(p.handRole==='comet'&&p.trail.length>1){g.strokeStyle=color;g.lineWidth=p.size*.65;g.globalAlpha=fade*.6;g.beginPath();g.moveTo(p.x,p.y);for(const q of p.trail.slice(0,5))g.lineTo(q.x,q.y);g.stroke();}
   const lobe=p.handRole==='lobe',shrink=lobe?(.6+.4*clamp(p.life/.6)):1,r=p.size*2.05*shrink;
   g.globalAlpha=fade*(p.handRole==='cinder'?.45+.55*Math.sin(age*16+p.seed)**2:1);g.save();g.translate(p.x,p.y);g.rotate(p.angle+Math.sin(age*7+p.seed)*.08);
   // Late lobe erosion becomes three short irregular scraps, not a uniformly fading circle.
   if(lobe&&t>.50){const split=clamp((t-.50)/.28);g.globalAlpha*=1-split*.25;for(let k=0;k<3;k++){const a=k/3*TAU+p.seed,offset=split*p.size*.7,rr=r*(.56-split*.12);g.drawImage(this.tile(color,false,(variant+k)%3),Math.cos(a)*offset-rr,Math.sin(a)*offset-rr,rr*2,rr*2);}}
   else g.drawImage(this.tile(color,p.handRole==='star',variant),-r,-r,2*r,2*r);g.restore();
  }
  for(const b of world.blooms){if(b.age>.30)continue;const t=b.age,r=(12+46*(1-Math.exp(-t*18))),fade=clamp(t/.015)*clamp((.30-t)/.18);g.globalAlpha=fade;g.drawImage(this.tile(b.tint||'#FFCC55',true),b.x-r,b.y-r,r*2,r*2);}
  g.restore();
 }
 launches(g,world,w,h){g.save();const b=world.head;if(b){g.beginPath();g.rect(-100,-100,w+200,h+200);g.moveTo(b.right+12,(b.top+b.bottom)/2);g.ellipse((b.left+b.right)/2,(b.top+b.bottom)/2,(b.right-b.left)/2+12,(b.bottom-b.top)/2+12,0,0,TAU);g.clip('evenodd');}g.globalCompositeOperation='screen';g.lineCap='round';for(const r of world.rockets){if(r.delayRemaining>0)continue;const color='#FFCC63',points=[{x:r.x,y:r.y},...(r.trail||[])];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];g.globalAlpha=(1-i/points.length)*.8;g.strokeStyle=color;g.lineWidth=4*(1-i/points.length)+.7;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}g.globalAlpha=1;g.drawImage(this.tile(color,true),r.x-11,r.y-11,22,22);for(let i=2;i<points.length;i+=2){const p=points[i];g.globalAlpha=.6*(1-i/points.length);const size=4;g.drawImage(this.tile(color),p.x-size+Math.sin(i*4)*4,p.y-size,size*2,size*2);}}g.restore();}
}
