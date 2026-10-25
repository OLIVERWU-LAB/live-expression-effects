import {drawWaterSurface,drawWaterRefraction} from './water-renderer.mjs?v=d9a23e4fa6e4';
import {performanceProfile} from './performance-profile.mjs?v=d9a23e4fa6e4';
import {particleVisibility} from './particle-visibility.mjs?v=d9a23e4fa6e4';
import {drawLineRain,drawFlatRain} from './rain-style.mjs?v=d9a23e4fa6e4';
import {drawFlatFireworks,drawFlatLaunch} from './flat-fireworks.mjs?v=d9a23e4fa6e4';
import {CinemaRenderer} from './cinema-renderer.mjs?v=d9a23e4fa6e4';
import {GiftRenderer} from './gift-renderer.mjs?v=d9a23e4fa6e4';
import {stickerBurstEnvelope} from './dandelion.mjs?v=d9a23e4fa6e4';
import { clamp, SMILE_ZONES } from './core.mjs?v=d9a23e4fa6e4';
import { fireworkEnvelope } from './effects.mjs?v=d9a23e4fa6e4';
import { Optics } from './optics.mjs?v=d9a23e4fa6e4';
import {fireworkLights} from './lighting.mjs?v=d9a23e4fa6e4';
import {EMBER_COLORS,emberPhase,mixHex} from './emission.mjs?v=d9a23e4fa6e4';
import { PAPER_COLORS, FIRE_COLORS, FIRE_LIGHTS } from './pyro.mjs?v=d9a23e4fa6e4';
export const lightColors=FIRE_LIGHTS;
const lightCSS=FIRE_COLORS,palette=PAPER_COLORS;
function makeCanvas(w, h) { const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas'); c.width = w; c.height = h; return c; }
function glow(color){const c=makeCanvas(96,96),g=c.getContext('2d'),d=g.createRadialGradient(48,48,0,48,48,48);d.addColorStop(0,mixHex(color,'#FFF0D6',.14));d.addColorStop(.055,color);d.addColorStop(.15,color+'c0');d.addColorStop(.38,color+'58');d.addColorStop(.70,color+'12');d.addColorStop(1,color+'00');g.fillStyle=d;g.fillRect(0,0,96,96);return c;}
function starPath(ctx, points = 4, outer = 26, inner = 8) {
  ctx.beginPath(); for (let i = 0; i < points * 2; i++) { const a = i / (points * 2) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? inner : outer; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath();
}
function sprite(type, variant, tint=null,points=4+variant%3) {
  const c = makeCanvas(128, 160), g = c.getContext('2d'); g.translate(64, 80); g.lineJoin = 'round'; g.lineCap = 'round';
  g.save(); g.translate(3, 5); shape(g, type, variant,points); g.fillStyle = '#080e15aa'; g.fill(); g.restore();
  shape(g, type, variant,points); g.strokeStyle = '#fcf9ee'; g.lineWidth = 10; g.stroke(); g.fillStyle = type === 'drop' ? ['#67DCE8', '#8DDFF7', '#94E9D4', '#84CFF1', '#B8EDEB'][variant] : (tint||palette[variant]); g.fill(); g.strokeStyle = '#18303b'; g.lineWidth = 2.6; g.stroke();
  if (type === 'drop') {
    g.strokeStyle = '#fff8'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(-6, -4); g.quadraticCurveTo(-16, 10, -10, 18); g.stroke();
    g.strokeStyle = '#1c667c66'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(7, 25); g.quadraticCurveTo(22, 18, 15, 6); g.stroke();
  } else {
    g.strokeStyle = '#14344455'; g.lineWidth = 1.7; g.beginPath(); g.moveTo(-5, -5); g.lineTo(5, 4); g.stroke();
  }
  return c;
}
function shape(g, type, variant,points=4+variant%3) {
  if (type === 'drop') { const tip=[2,-3,6,0,4][variant],left=[20,22,18,21,19][variant],right=[22,19,23,20,21][variant],bottom=[35,32,36,33,37][variant];g.beginPath();g.moveTo(tip,-34);g.bezierCurveTo(tip-6,-18,-left-5,1,-left,18);g.bezierCurveTo(-left+3,bottom+2,right-3,bottom,right,15);g.bezierCurveTo(right+3,2,tip+5,-17,tip,-34);g.closePath(); }
  else starPath(g,points,28,points===4?7:points===5?12:13);
}
export class Renderer {
  constructor(canvas) {
    this.cinema=new CinemaRenderer();this.gift=new GiftRenderer();this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.width = 1; this.height = 1;
    this.base = makeCanvas(1,1); this.baseCtx = this.base.getContext('2d');
    this.matte = makeCanvas(512,288); this.matteCtx = this.matte.getContext('2d'); this.rawMask = makeCanvas(1,1); this.rawOcclusion = makeCanvas(1,1); this.occlusion = makeCanvas(512,288); this.maskData = null; this.maskSignature = null;
    this.night = 0; this.lastTime = 0; this.drawMs = 0;
    this.glows=lightCSS.map(glow);this.launchGlow=glow('#FFFFFF');this.emberColors=EMBER_COLORS;this.emberGlows=this.emberColors.map(colors=>colors.map(glow));
    this.tintedSprites=new Map();this.tintGlows=new Map();this.paperGlows=palette.map(glow);this.atmosphereCache=new Map();
    try { const out = document.getElementById('optics'); this.optics = new Optics(out); canvas.style.visibility = 'hidden'; } catch (e) { console.warn('Optical composition unavailable; Canvas fallback',e); document.getElementById('optics').hidden = true; this.optics = null; }

    this.sprites = Object.fromEntries(['drop', 'star', 'confetti'].map(type => [type, Array.from({ length: 5 }, (_, i) => sprite(type, i))]));
  }
  resize(w, h) {
    const profile=this.profile||performanceProfile({width:w,height:h});
    const d=Math.min(devicePixelRatio||1,profile.dpr,Math.sqrt(profile.pixels/(w*h)));if(this.width===w&&this.height===h&&this.dpr===d)return;
    this.width=w;this.height=h;
    this.dpr=d;this.canvas.width=this.base.width=Math.round(w*d);this.canvas.height=this.base.height=Math.round(h*d);
    this.ctx.setTransform(d,0,0,d,0,0);this.baseCtx.setTransform(d,0,0,d,0,0);
    this.matte.width=profile.matte;this.matte.height=Math.max(1,Math.round(profile.matte*h/w));this.occlusion.width=this.matte.width;this.occlusion.height=this.matte.height;this.maskSignature=null;this.optics?.resize(w,h,d);
  }
  matteFrame(silhouette,polygon) {
    const g=this.matteCtx,w=this.matte.width,h=this.matte.height,og=this.occlusion.getContext('2d');
    // A new model mask or layout changes the matte. Preview polygons update with dragging.
    if(silhouette && this.maskSignature===silhouette)return;
    this.maskSignature=silhouette;g.clearRect(0,0,w,h);og.clearRect(0,0,w,h);
    if(silhouette) {
      const {mask,vw,vh}=silhouette;this.rawMask.width=this.rawOcclusion.width=mask.width;this.rawMask.height=this.rawOcclusion.height=mask.height;
      const mg=this.rawMask.getContext('2d'),ag=this.rawOcclusion.getContext('2d'),data=mg.createImageData(mask.width,mask.height),alpha=ag.createImageData(mask.width,mask.height);
      for(let i=0;i<mask.data.length;i++){const v=mask.alpha ? mask.alpha[i] : mask.data[i]?255:0;data.data.set([v,v,v,255],i*4);alpha.data.set([255,255,255,v],i*4);}mg.putImageData(data,0,0);ag.putImageData(alpha,0,0);
      const scale=Math.max(w/vw,h/vh);g.save();g.filter='blur(.7px)';g.translate(w,0);g.scale(-1,1);g.drawImage(this.rawMask,(w-vw*scale)/2,(h-vh*scale)/2,vw*scale,vh*scale);g.restore();og.save();og.filter='blur(.7px)';og.translate(w,0);og.scale(-1,1);og.drawImage(this.rawOcclusion,(w-vw*scale)/2,(h-vh*scale)/2,vw*scale,vh*scale);og.restore();
    } else if(polygon?.length) {g.save();g.scale(w/this.width,h/this.height);g.fillStyle='#fff';g.beginPath();polygon.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();g.fill();g.restore();og.drawImage(this.matte,0,0);}
  }
  draw(world, { time, camera, video, preview, strength, previewX, previewY, tracking, polygon, silhouette, hands }) {
    const started=performance.now(),g=this.ctx,w=this.width,h=this.height,bg=this.baseCtx;
    const dt=this.lastTime?Math.min(.05,(time-this.lastTime)/1000):.016;this.lastTime=time;
    this.night+=((world.effect==='laugh'?((['cinema','glow'].includes(world.style))?1:.58):0)-this.night)*(1-Math.exp(-dt/(world.effect==='laugh'?.5:.7)));
    const flat=world.style==='flat',simple=flat||world.style==='gift',nativeCamera=simple&&camera&&video?.readyState>=2;
    if(video?.style)video.style.filter=nativeCamera?`brightness(${1-this.night*.32})`:'';
    if(!nativeCamera){
    bg.clearRect(0,0,w,h);
    if(!nativeCamera&&camera&&video?.readyState>=2) {
      const scale=Math.max(w/video.videoWidth,h/video.videoHeight),vw=video.videoWidth*scale,vh=video.videoHeight*scale;
      bg.save();bg.translate(w,0);bg.scale(-1,1);bg.drawImage(video,(w-vw)/2,(h-vh)/2,vw,vh);bg.restore();
    } else {
      bg.fillStyle='#000';bg.fillRect(0,0,w,h);
      if(preview){this.ctx=bg;this.person(previewX*w,previewY*h,Math.min(w*.13,h*.14),strength);this.ctx=g;}
    }
    }
    g.clearRect(0,0,w,h);
    if(simple)drawWaterRefraction(g,camera?video:this.base,world.water,w,h,time,!!camera);

    const digital=['cinema','glow'].includes(world.style),lights=simple?[]:fireworkLights(world);
    this.matteFrame(silhouette,polygon);if(world.style!=='gift')this.rockets(world);this.atmosphere(lights,digital);this.lingering(world);
    if(world.style==='gift')this.gift.draw(g,world);else if(digital)this.digital(world,time);else this.stickers(world);
    if(world.effect==='laugh')this.occludeFireworks(world.head);
    if(world.effect==='laugh')this.collisionForeground(world);
    if(world.style==='gift')this.gift.launches(g,world,w,h);else if(['cinema','glow'].includes(world.style))this.cinema.launches(g,world,w,h);
    if(world.style==='gift')this.gift.water(g,world.water,w,h,time);else this.water(world.water,time,digital);
    if(world.pendingEffect==='smile'){
      // Fade the complete outgoing effect layer, including rockets and blooms.
      g.save();g.globalCompositeOperation='destination-in';g.globalAlpha=clamp(world.finishRemaining/.24);g.fillStyle='#fff';g.fillRect(0,0,w,h);g.restore();
    }
    if(tracking){g.save();if(hands){g.strokeStyle='#dfff7caa';g.lineWidth=1.1;for(const shape of hands.shapes){g.beginPath();shape.points.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();g.stroke();}}g.fillStyle='#dfff7c';g.strokeStyle='#dfff7caa';g.lineWidth=1.3;if(silhouette)for(const p of silhouette.boundaryPoints())g.fillRect(p.x-1,p.y-1,2,2);else if(polygon){g.setLineDash([4,5]);g.beginPath();polygon.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();g.stroke();}g.restore();}
    if(this.optics?.canvas)this.optics.canvas.hidden=simple;
    this.canvas.style.visibility=simple||!this.optics||this.optics.lost?'visible':'hidden';
    if(this.optics&&!this.optics.lost&&!simple)this.optics.render(this.base,this.canvas,this.matte,world,{night:this.night,time,width:w,height:h,lights,colors:['cinema','glow'].includes(world.style)?lightColors:PAPER_COLORS.map(c=>[parseInt(c.slice(1,3),16)/255,parseInt(c.slice(3,5),16)/255,parseInt(c.slice(5,7),16)/255])});
    else if(!nativeCamera){this.canvas.style.visibility='visible';g.save();g.globalCompositeOperation='destination-over';g.filter=`brightness(${1-this.night*.32})`;g.drawImage(this.base,0,0,w,h);g.restore();}
    this.drawMs=this.drawMs*.9+(performance.now()-started)*.1;
  }
  atmosphere(lights,digital){const g=this.ctx;g.save();g.globalCompositeOperation='lighter';for(const light of lights){const radius=Math.min(96,this.height*.14);g.globalAlpha=light.energy*(digital?.055:.025);const color='#'+light.color.map(v=>Math.round(v*15)*17).map(v=>v.toString(16).padStart(2,'0')).join('');if(!this.atmosphereCache.has(color)){if(this.atmosphereCache.size>=64)this.atmosphereCache.delete(this.atmosphereCache.keys().next().value);this.atmosphereCache.set(color,glow(color));}g.drawImage(this.atmosphereCache.get(color),light.x-radius,light.y-radius,radius*2,radius*2);}g.restore();}
  occludeFireworks(head){
    const g=this.ctx;g.save();g.globalCompositeOperation='destination-out';g.drawImage(this.occlusion,0,0,this.width,this.height);
    // A small extra head guard also covers hair when the model matte is soft or late.
    if(head){g.fillStyle='#fff';g.beginPath();g.ellipse((head.left+head.right)/2,(head.top+head.bottom)/2,(head.right-head.left)/2+8,(head.bottom-head.top)/2+8,0,0,Math.PI*2);g.fill();}
    g.restore();g.beginPath();
  }
  collisionForeground(world){
    if(!['gift','cinema','flat','glow'].includes(world.style))return;
    const particles=world.particles.filter(p=>p.hasCollided&&p.life>0&&!(p.flatFx&&p.flatRole==='ring'));if(!particles.length)return;const g=this.ctx,b=world.head;
    g.save();if(b){const cx=(b.left+b.right)/2,cy=(b.top+b.bottom)/2,rx=(b.right-b.left)*.405,ry=(b.bottom-b.top)*.405;g.beginPath();g.rect(-100,-100,this.width+200,this.height+200);g.moveTo(cx+rx,cy);g.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);g.clip('evenodd');g.beginPath();}
    const impacts={...world,particles,blooms:[]};if(world.style==='gift')this.gift.draw(g,impacts);else if(world.style==='flat')drawFlatFireworks(g,impacts);else this.cinema.draw(g,impacts);g.restore();g.beginPath();
  }
  stickers(world){
    const g=this.ctx;
    // Three distinct beats: a fast paper snap, a multicolour radial opening, then falling pieces.
    for(const p of world.particles){if(p.delay>0||p.flatFx)continue;const age=p.maxLife-p.life;
      if(world.style==='flat'&&p.type==='drop'){drawFlatRain(g,p);continue;}
      const drop=p.type==='drop',fade=particleVisibility(p)*(drop?Math.min(1,p.life/.25):clamp(p.life/.6)),birth=drop?1:.76+.24*clamp(age/.10);
      const size=p.size*birth*(drop?1:.75+.25*fade);if(!drop)this.paperTrail(p,fade);g.save();g.translate(p.x,p.y);g.rotate(p.angle);g.globalAlpha=fade;
      if(!drop&&!p.dot){g.globalCompositeOperation='lighter';g.globalAlpha=fade*.22;const radius=size*1.9;g.drawImage((p.tint?this.tintGlow(p.tint):this.paperGlows[p.variant]),-radius,-radius,radius*2,radius*2);g.globalCompositeOperation='source-over';g.globalAlpha=fade;}
      if(p.dot){const blink=p.micro?.28+.72*Math.pow(Math.max(0,Math.sin(age*19+p.seed)),2):1;g.globalAlpha=fade*blink;g.beginPath();g.arc(0,0,size,0,Math.PI*2);g.fillStyle=p.tint||palette[p.variant];g.strokeStyle='#fff5df';g.lineWidth=.6;g.stroke();g.fill();}
      else {let image=this.sprites[p.type][p.variant];if(!drop){const color=p.tint||palette[p.variant],points=p.starPoints||4+p.variant%3,key=points+color;if(!this.tintedSprites.has(key))this.tintedSprites.set(key,sprite('star',p.variant,color,points));image=this.tintedSprites.get(key);}g.drawImage(image,-size*1.1,-size*1.4,size*2.2,size*2.75);}g.restore();
    }
    for(const b of world.blooms)if(!b.flatFx)this.paperFlash(b);drawFlatFireworks(g,world);
  }
  paperFlash(b){
    const env=stickerBurstEnvelope(b.age,b.life);if(env.alpha<.002||env.scale<.01)return;
    const g=this.ctx,r=b.size*env.scale,color=b.tint||palette[b.variant],age=b.age/.30;
    g.save();g.translate(b.x,b.y);g.rotate((b.rotation||0)+env.twist);g.globalAlpha=env.alpha;g.lineJoin='round';g.lineCap='round';
    g.globalCompositeOperation='screen';g.globalAlpha=env.alpha*.16;g.drawImage(this.tintGlow(color),-r*1.12,-r*1.12,r*2.24,r*2.24);g.globalCompositeOperation='source-over';g.globalAlpha=env.alpha;
    // Uneven, solid comic rays and a hot central flash, based on the reference.
    g.beginPath();for(let i=0;i<22;i++){const a=i/22*Math.PI*2,rr=r*(i%2?.29+.07*Math.sin(i+b.seed):.66+.30*(.5+.5*Math.sin(i*2.1+b.seed)));i?g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fillStyle=color;g.strokeStyle=mixHex(color,'#FFF4CB',.45);g.lineWidth=b.secondary?1.7:2.5;g.stroke();g.fill();
    starPath(g,9,r*.40,r*.22);g.fillStyle=mixHex(color,'#FFFFFF',.89);g.fill();
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2+Math.sin(i+b.seed)*.16,rr=r*(1.02+Math.min(1,age)*.18),length=r*(.06+.07*(.5+.5*Math.sin(i*1.8+b.seed)));g.save();g.translate(Math.cos(a)*rr,Math.sin(a)*rr);g.rotate(a);g.fillStyle=color;g.beginPath();g.ellipse(0,0,length,Math.max(1.1,r*.028),0,0,Math.PI*2);g.fill();g.restore();}
    g.restore();
  }
  paperTrail(p,fade){
    if(!p.trail?.length||p.micro)return;
    const g=this.ctx,maxLength=p.pattern==='chrysanthemum-inner'&&p.secondary?130:p.dot&&p.tailLength>=28?96:(p.carrier||p.flowerCarrier)?86:60,points=[{x:p.x,y:p.y}];let distance=0;
    for(const q of p.trail){const last=points.at(-1),d=Math.hypot(q.x-last.x,q.y-last.y);if(d<.35)continue;distance+=d;if(distance>maxLength)break;points.push(q);}
    if(points.length<3)return;const width=p.dot?.9:(p.carrier||p.flowerCarrier)?3.1:Math.max(.9,Math.min(2,p.size*.10));
    g.save();g.lineCap='round';g.lineJoin='round';
    for(let i=points.length-1;i>0;i--){const weight=1-i/points.length,a=points[i],b=points[i-1];g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.globalAlpha=fade*weight*.68;g.strokeStyle='#FFF3D9';g.lineWidth=(width+1.2)*weight;g.stroke();g.strokeStyle=p.tint||palette[p.variant];g.lineWidth=width*weight;g.stroke();}
    g.restore();
  }
  tintGlow(color){if(!this.tintGlows.has(color))this.tintGlows.set(color,glow(color));return this.tintGlows.get(color);}
  digital(world,time){
    const g=this.ctx;g.save();
    for(const p of world.particles){if(p.delay>0||p.cinematic)continue;
      if(p.type==='drop'){drawLineRain(g,p,world.style);continue;}
      const env=fireworkEnvelope(p),age=p.maxLife-p.life,colorIndex=emberPhase(p),color=this.emberColors[p.variant][colorIndex],size=p.size*env.size;
      const light=particleVisibility(p)*Math.min(1,env.light*1.65)*(p.luminosity??1)*(.92+.08*Math.sin(p.seed+time*.014));g.globalCompositeOperation='screen';
      this.trail(p.trail,p.x,p.y,p.variant,Math.max(.60,size*.65),Math.min(1,light*1.12),true,color);
      g.globalAlpha=light*.20*Math.min(1,age/.32);const r=Math.max(4,size*4.8);g.drawImage(this.emberGlows[p.variant][colorIndex],p.x-r,p.y-r,r*2,r*2);
      g.globalAlpha=light;g.fillStyle=mixHex(color,'#FFF6E8',age<.06?.20:.10);g.beginPath();g.arc(p.x,p.y,Math.max(.52,size*.57),0,Math.PI*2);g.fill();
    }
    for(const b of world.blooms){if(b.referenceCinema)continue;g.globalCompositeOperation='screen';g.globalAlpha=Math.exp(-b.age*12)*.12+Math.exp(-b.age*2.5)*.02;const r=b.size*(1.25+b.age*.6);g.drawImage(this.glows[b.variant],b.x-r,b.y-r,r*2,r*2);}
    g.restore();if(world.style==='cinema'&&world.pattern==='cinema-refined')this.cinema.refined.draw(g,world);else this.cinema.draw(g,world);
  }
  trail(points,x,y,variant,width,alpha,digital,colorOverride=null){
    if(!points||points.length<2||alpha<.002)return;const g=this.ctx,last=points.at(-1),color=colorOverride||(digital?lightCSS[variant]:palette[variant]);if(Math.hypot(last.x-x,last.y-y)<1)return;
    g.save();g.globalCompositeOperation=digital?'screen':'source-over';g.lineJoin='round';g.lineCap='round';const grad=g.createLinearGradient(x,y,last.x,last.y);grad.addColorStop(0,color);grad.addColorStop(.3,color+'a0');grad.addColorStop(1,color+'00');
    const path=()=>{g.beginPath();g.moveTo(x,y);for(const p of points)g.lineTo(p.x,p.y);};path();g.strokeStyle=grad;g.lineWidth=width*1.9;g.globalAlpha=alpha*.06;g.stroke();path();g.lineWidth=width;g.globalAlpha=alpha;g.stroke();g.restore();
  }
  rockets(world){
    if(!world.rockets?.length)return;const g=this.ctx,digital=['cinema','glow'].includes(world.style);g.save();
    for(const r of world.rockets){
      if(world.style==='flat'){drawFlatLaunch(g,r);continue;}
      if(r.pattern?.startsWith('cinema-'))continue;
      const points=[{x:r.x,y:r.y}],cap=Math.min(32,Math.max(18,this.height*.04));let distance=0;
      for(const p of r.trail||[]){const last=points.at(-1),length=Math.hypot(p.x-last.x,p.y-last.y);if(length<.15)continue;if(distance+length>cap){const a=(cap-distance)/length;points.push({x:last.x+(p.x-last.x)*a,y:last.y+(p.y-last.y)*a});break;}points.push(p);distance+=length;}
      if(points.length>1){const last=points.at(-1),gradient=g.createLinearGradient(r.x,r.y,last.x,last.y);gradient.addColorStop(0,'#FFFFFFaa');gradient.addColorStop(1,'#FFFFFF00');g.globalCompositeOperation='screen';g.globalAlpha=Math.min(1,r.age/.10);g.strokeStyle=gradient;g.lineWidth=digital?1.2:1.5;g.lineCap='round';g.beginPath();g.moveTo(r.x,r.y);for(const p of points)g.lineTo(p.x,p.y);g.stroke();}
      g.save();g.translate(r.x,r.y);const alpha=Math.min(1,r.age/.1);
      g.globalCompositeOperation='screen';g.globalAlpha=alpha*.52;g.drawImage(this.launchGlow,-9,-9,18,18);g.globalAlpha=alpha;g.fillStyle='#FFFFFF';g.beginPath();g.ellipse(0,0,digital?1.4:2,digital?2.1:2.7,0,0,Math.PI*2);g.fill();g.restore();
    }
    g.globalCompositeOperation='destination-out';g.drawImage(this.occlusion,0,0,this.width,this.height);g.restore();
  }
  lingering(world){for(const t of world.afterglows||[]){if(['cinema','glow'].includes(world.style))this.trail(t.points,t.x,t.y,t.variant,Math.max(.3,t.size*.4),t.light*Math.pow(t.life/t.maxLife,1.7)*.5,true,t.tint||'#D39357');else if(world.style==='gift')this.gift.trail(this.ctx,{...t,trail:t.points},Math.pow(t.life/t.maxLife,1.5)*.65);else this.paperTrail({...t,trail:t.points},Math.pow(t.life/t.maxLife,1.5)*.65);}}
  water(water,time,digital=false){drawWaterSurface(this.ctx,water,this.width,this.height,digital);}
  person(x, y, r, strength) {
    const g = this.ctx; g.save(); g.translate(x, y); g.rotate(Math.sin(strength * .9) * .035); g.lineJoin = 'round'; g.lineCap = 'round';
    g.fillStyle = '#b5c8c5'; g.strokeStyle = '#fff9ea'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(-r * .45, r * .7); g.lineTo(-r * .43, r * 1.4); g.bezierCurveTo(-r * 1.3, r * 1.3, -r * 1.9, r * 1.7, -r * 2.3, r * 3.9); g.lineTo(r * 2.3, r * 3.9); g.bezierCurveTo(r * 1.9, r * 1.7, r * 1.3, r * 1.3, r * .43, r * 1.4); g.lineTo(r * .45, r * .7); g.closePath(); g.stroke(); g.fill(); g.strokeStyle = '#1b303e'; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.ellipse(0, 0, r, r * 1.28, -.04, 0, Math.PI * 2); g.strokeStyle = '#fff9ea'; g.lineWidth = 7; g.stroke(); g.fillStyle = '#eee9db'; g.fill(); g.strokeStyle = '#1b303e'; g.lineWidth = 2.5; g.stroke();
    for (const side of [-1, 1]) { g.beginPath(); if (strength >= SMILE_ZONES.laugh) g.ellipse(side * r * .33, -r * .10, r * .11, r * .07, 0, Math.PI, Math.PI * 2); else { g.moveTo(side * r * .33, -r * .1); g.lineTo(side * r * .33 + 1, -r * .07); } g.lineWidth = 4; g.stroke(); }
    g.beginPath(); if (strength >= SMILE_ZONES.laugh) { g.ellipse(0, r * .37, r * .31, r * .22, 0, 0, Math.PI * 2); g.fillStyle = '#23313e'; g.fill(); } else if (strength >= SMILE_ZONES.rain) { g.moveTo(-r * .30, r * .30); g.quadraticCurveTo(0, r * (.48 + strength * .45), r * .30, r * .30); g.stroke(); } else { g.moveTo(-r * .16, r * .4); g.lineTo(r * .16, r * .4); g.stroke(); }
    g.fillStyle = '#ff8ba180'; for (const side of [-1, 1]) { g.beginPath(); g.ellipse(side * r * .59, r * .26, r * .17, r * .08, -.2 * side, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
}
