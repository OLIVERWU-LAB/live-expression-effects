import {drawWaterSurface} from './water-renderer.mjs?v=503ad3f29326';
import {GIFT_BANKS} from './gift-banks.mjs?v=503ad3f29326';
import {loadGiftImage} from './gift-loader.mjs?v=503ad3f29326';
import {loadGiftBank} from './gift-loader.mjs?v=503ad3f29326';
import {mixHex} from './emission.mjs?v=503ad3f29326';
import {particleVisibility} from './particle-visibility.mjs?v=503ad3f29326';
import {GIFT_MATERIALS,GIFT_RANDOM_MATERIALS} from './gift-materials.mjs?v=503ad3f29326';
import {activeGiftAssets,giftAssetPath} from './gift-shapes.mjs?v=503ad3f29326';
import {GIFT_ASSETS,giftBeadEnvelope} from './reference-bursts.mjs?v=503ad3f29326';
import {clamp} from './core.mjs?v=503ad3f29326';
import {GIFT_KINDS,GIFT_COLORS,giftMaterial,giftSplashEnvelope,giftFlashEnvelope,drawGiftConfetti} from './gift-style.mjs?v=503ad3f29326';
const TAU=Math.PI*2;
export function giftFrameIndex(phase,frames){return Math.round(((phase%TAU)+TAU)%TAU/TAU*frames)%frames;}
export class GiftRenderer{
 constructor(){this.images=new Map();this.banks=new Map();this.materialImages=new Map();this.material='soft';this.rainTiles=new Map();this.ready=false;this.promise=null;this.error=null;this.tileSize=0;}
 bank(material){
  if(!this.banks.has(material)){
   const images=new Map(),compact=GIFT_BANKS[material];
   const promise=compact?loadGiftImage(new URL(compact.url,import.meta.url).href).then(image=>{for(const[key,view]of Object.entries(compact.items))images.set(key,{...view,image});this.materialImages.set(material,images);return images;}):loadGiftBank(Object.entries(activeGiftAssets(GIFT_ASSETS)).flatMap(([kind,colors])=>colors.map(color=>({key:kind+color,url:new URL(giftAssetPath(material,kind,color),import.meta.url).href}))),this.tileSize).then(loaded=>{for(const[key,image]of loaded)images.set(key,image);this.materialImages.set(material,images);return images;});
   this.banks.set(material,promise);while(this.banks.size>2){const oldest=this.banks.keys().next().value;this.banks.delete(oldest);for(const image of this.materialImages.get(oldest)?.values()||[])image.close?.();this.materialImages.delete(oldest);}
  }return this.banks.get(material);
 }
 load(material=this.material){
  if(material!=='random'&&!GIFT_MATERIALS.includes(material))material='soft';
  if(material===this.material&&this.ready)return Promise.resolve(true);
  if(material===this.material&&this.promise&&!this.error)return this.promise;
  this.material=material;this.ready=false;this.error=null;
  const profiles=material==='random'?GIFT_RANDOM_MATERIALS:[material];
  this.promise=Promise.all(profiles.map(profile=>this.bank(profile))).then(images=>{if(this.material===material){this.images=images[0];this.ready=true;}return true;}).catch(e=>{for(const profile of profiles){this.banks.delete(profile);for(const image of this.materialImages.get(profile)?.values()||[])image.close?.();this.materialImages.delete(profile);}if(this.material===material){this.error=e;console.warn(e.message);}return false;});return this.promise;
 }
 sprite(g,kind,color,x,y,w,h,phase=0,alpha=1,finish=null){
  const bank=this.material==='random'&&finish?this.materialImages.get(finish):this.images,im=bank?.get(kind+color);if(!im)return;
  const tile=im.tile||im.naturalHeight||im.height,frames=im.frames||Math.round((im.naturalWidth||im.width)/tile);
  // Each sprite is exactly one opaque pose. Crossfading rotated silhouettes
  // creates a second edge/side-on shaft inside rings, tubes and ribbons.
  const index=giftFrameIndex(phase,frames);
  g.save();g.globalAlpha=alpha;
  g.drawImage(im.image||im,(im.x||0)+index*tile,im.y||0,tile,tile,x-w/2,y-h/2,w,h);
  g.restore();
 }

 dropTile(tone=0,round=false){
  const index=((tone%5)+5)%5,key=index+(round?5:0);if(this.rainTiles.has(key))return this.rainTiles.get(key);const c=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(160,160):Object.assign(document.createElement('canvas'),{width:160,height:160}),g=c.getContext('2d');
  const path=()=>{g.beginPath();if(round){g.arc(80,82,54,0,TAU);g.closePath();return;}g.moveTo(80,8);g.bezierCurveTo(67,8,28,65,27,99);g.bezierCurveTo(25,165,136,165,133,99);g.bezierCurveTo(131,64,93,8,80,8);g.closePath();};
  path();const body=g.createLinearGradient(36,45,130,130);const base=['#37BFEA','#43C7DC','#44B6E8','#58C3EF','#30B5DC'][index];body.addColorStop(0,mixHex(base,'#B7F4FA',.38));body.addColorStop(.38,base);body.addColorStop(.78,mixHex(base,'#267FCB',.34));body.addColorStop(1,mixHex(base,'#246FB6',.58));g.fillStyle=body;g.fill();g.save();g.clip();
  const h=g.createRadialGradient(54,60,1,54,60,48);h.addColorStop(0,'#B2F6FA85');h.addColorStop(.5,'#91ECF552');h.addColorStop(1,'#85E7EF00');g.fillStyle=h;g.fillRect(0,0,160,160);
  g.translate(53,62);g.rotate(.38);g.fillStyle='#C2F8F960';g.beginPath();g.ellipse(0,0,7,19,0,0,TAU);g.fill();g.restore();this.rainTiles.set(key,c);return c;
 }
 trail(g,p,alpha){
  if((p.referenceGift&&!p.giftSpark)||!p.trail?.length||p.micro)return;const limit=p.giftSpark?18:p.secondary?125:48,points=[{x:p.x,y:p.y}];let length=0;
  for(const q of p.trail){const last=points.at(-1),d=Math.hypot(q.x-last.x,q.y-last.y);if(d<.4)continue;length+=d;if(length>limit)break;points.push(q);}
  if(points.length<3)return;const end=points.at(-1),color=p.tint||GIFT_COLORS[p.variant%5],gradient=g.createLinearGradient(p.x,p.y,end.x,end.y);gradient.addColorStop(0,color+'ce');gradient.addColorStop(.3,color+'78');gradient.addColorStop(1,color+'00');
  g.save();g.globalCompositeOperation='screen';g.globalAlpha=alpha*(p.secondary?.74:.32);g.lineWidth=p.secondary?1.25:.85;g.lineCap='round';g.lineJoin='round';g.strokeStyle=gradient;g.beginPath();g.moveTo(p.x,p.y);for(const q of points)g.lineTo(q.x,q.y);g.stroke();g.restore();
 }
 draw(g,world){
  if(!this.ready){if(!this.promise)this.load();return;}
  for(const p of world.particles){if(p.delay>0)continue;if(p.giftConfetti){drawGiftConfetti(g,p);continue;}const drop=p.type==='drop',age=p.maxLife-p.life,fade=drop?Math.min(1,p.life/.22):clamp(p.life/.6),m=giftMaterial(p),splash=p.giftSplash?giftSplashEnvelope(p):p.secondary&&p.referenceGift?giftBeadEnvelope(p):null;
   if(!drop)this.trail(g,p,fade*particleVisibility(p));const size=p.size*(p.contactSpray?(.65+.35*clamp(p.life/p.maxLife)):(splash?splash.scale:1)),alpha=particleVisibility(p)*(splash?splash.alpha:fade*(!drop&&!p.secondary?clamp(age/.10):1));
   g.save();g.translate(p.x,p.y);g.rotate(drop?p.angle:p.angle*.42);
   if(drop){const round=p.contactSpray||p.generation>0,squash=round?.16*Math.exp(-age*8)*Math.cos(age*17):0;g.globalAlpha=alpha;if(round)g.scale(1+squash,1-squash*.65);g.drawImage(this.dropTile(p.rainTone??p.variant,round),-size*(round?.95:.775),-size*.95,size*(round?1.90:1.55),size*1.90);}
   else if(p.referenceGift){const motionKind=m.sourceKind||m.kind,yaw=['star','sparkle','fourstar','ring','triangle','cube','coil','ribbon'].includes(motionKind)?Math.sin(p.seed+age*.75)*.34:p.seed*.05+age*.48,factor=motionKind==='twinkle'?3.2:motionKind==='bead'?4.15:motionKind==='ring'?3.5:motionKind==='fourstar'?3.5:motionKind==='sparkle'?3.5:['cylinder','wave','triangle'].includes(motionKind)?3.3:2.85;this.sprite(g,m.kind,m.color,0,0,size*factor,size*factor,yaw,alpha,p.giftFinish);}
   else if(p.dot){const blink=p.micro?.25+.75*Math.sin(age*18+p.seed)**2:1;this.sprite(g,'bead',m.color,0,0,size*3.4,size*3.4,0,alpha*blink,p.giftFinish);}
   else{const long=['ribbon','coil'].includes(m.sourceKind||m.kind),yaw=m.kind==='star'?Math.sin(p.seed+age*.9)*.60:p.seed+age*.8;this.sprite(g,m.kind,m.color,0,0,size*(long?1.65:2.25),size*(long?2.65:2.25),yaw,alpha,p.giftFinish);}
   g.restore();
  }
  for(const b of world.blooms){const env=giftFlashEnvelope(b.age);if(env.alpha<.01)continue;const color=0,r=b.size*env.scale;
   this.sprite(g,'sparkle',color,b.x,b.y,r*3.2,r*3.4,.10+b.age*.45,env.alpha);
   for(const [dx,dy,scale,delay]of[[-.75,.48,.48,.04],[.58,-.65,.29,.09]]){const e=giftFlashEnvelope(Math.max(0,b.age-delay));if(b.age<delay)continue;this.sprite(g,'sparkle',color,b.x+dx*b.size,b.y+dy*b.size,r*2.15*scale,r*2.35*scale,-.2+b.age*.35,e.alpha*.9);}
  }
 }
 launches(g,world,w,h){
  if(!this.ready)return;
  // Keep the launch readable in front of clothing. A separate head clip keeps the face clear.
  g.save();if(world.head){const b=world.head;g.beginPath();g.rect(-100,-100,w+200,h+200);g.moveTo((b.left+b.right)/2+(b.right-b.left)/2+12,(b.top+b.bottom)/2);g.ellipse((b.left+b.right)/2,(b.top+b.bottom)/2,(b.right-b.left)/2+12,(b.bottom-b.top)/2+12,0,0,TAU);g.clip('evenodd');}
  for(const r of world.rockets){if(r.delayRemaining>0)continue;
   const points=[{x:r.x,y:r.y}],cap=54;let length=0;
   for(const p of r.trail||[]){const q=points.at(-1),d=Math.hypot(p.x-q.x,p.y-q.y);if(d<.25)continue;if(length+d>cap){const t=(cap-length)/d;points.push({x:q.x+(p.x-q.x)*t,y:q.y+(p.y-q.y)*t});break;}points.push(p);length+=d;}
   if(points.length>1){const end=points.at(-1),grad=g.createLinearGradient(r.x,r.y,end.x,end.y);grad.addColorStop(0,'#fff7c8e6');grad.addColorStop(.25,'#ffcf6990');grad.addColorStop(1,'#ffd27800');g.save();g.globalCompositeOperation='screen';g.strokeStyle=grad;g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(r.x,r.y);for(const p of points)g.lineTo(p.x,p.y);g.stroke();g.restore();}
   const heading=Math.atan2(r.tx-r.sx,r.sy-r.ty);g.save();g.translate(r.x,r.y);g.rotate(heading);this.sprite(g,'capsule',0,0,0,32,40,0,1);g.restore();
  }
  g.restore();
 }
 water(g,water,w,h,time){drawWaterSurface(g,water,w,h,false);}
}
