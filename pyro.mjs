import {roundColor} from './dandelion.mjs?v=2b0ba957a1a8';
import { clamp } from './core.mjs?v=2b0ba957a1a8';
// Warm/cool paper colours with a quiet cream, rather than arbitrary RGB hues.
export const PAPER_COLORS=['#FF7897','#62DDD2','#FFD477','#ACA0F3','#FFF3D9'];
export const FIRE_COLORS=['#73BFE6','#FF9872','#AE8BE0','#FFD18A','#8DD7B6'];
export const FIRE_LIGHTS=FIRE_COLORS.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255));
export const SHELLS=Object.freeze({
 chrysanthemum:{name:'流光菊',count:164,life:[2.2,3.3],gravity:72,drag:.64,tail:24,speed:285},
 willow:{name:'垂金柳',count:156,life:[3.2,4.4],gravity:85,drag:.38,tail:34,speed:240},
 orbit:{name:'双环星轨',count:130,life:[2.4,3.1],gravity:30,drag:.72,tail:20,speed:260},
 heart:{name:'心动绽放',count:126,life:[2.3,3.1],gravity:27,drag:.72,tail:20,speed:250},
 'chrysanthemum-double':{name:'流光复绽'},
 'chrysanthemum-inner':{name:'花心复绽'},
 crossette:{name:'繁星四散',count:24,life:[2.0,2.5],gravity:60,drag:.58,tail:23,speed:230}
});
export const PATTERNS=['chrysanthemum','willow','orbit','heart','crossette'];
export const ACTIVE_PATTERNS=Object.freeze(['chrysanthemum','willow','heart','chrysanthemum-double','chrysanthemum-inner']);
export const STAGED_PATTERNS=Object.freeze(['willow','chrysanthemum-double','chrysanthemum-inner']);
export const STICKER_PATTERN_BAG=Object.freeze([...ACTIVE_PATTERNS]);
// Ease both axes together: strong initial rise, a slow approach, no late lateral hook.
// The tiny arc describes the flight path; time easing describes the loss of speed.
export function rocketPoint(r,progress){const t=clamp(progress),q=1-(1-t)**2;return{x:r.sx+(r.tx-r.sx)*q,y:r.sy+(r.ty-r.sy)*q+(r.arc||0)*(q*q-q)};}
export function boundsDistance(x,y,b){return Math.hypot(Math.max(b.left-x,0,x-b.right),Math.max(b.top-y,0,y-b.bottom));}
// Reserve an opening region around the whole head, not just a few pixels at the core.
export function burstIsSafe(plan,head,gap=84){return !head||boundsDistance(plan.x,plan.y,head)>=(plan.clearance??gap);}
export function planBurst(w,h,head,side=0,random=Math.random){
 const portrait=w<650&&h>w,edge=24,top=portrait?28:w<650?104:78;
 const b=head||{left:w*.37,right:w*.63,top:h*.28,bottom:h*.55},cx=(b.left+b.right)/2,headHeight=b.bottom-b.top,headWidth=b.right-b.left;
 const clearance=portrait?clamp(headHeight*.22,32,68):clamp(headHeight*.48,84,150),radius=Math.min(260,w*.39,h*.36),candidates=[];const reserve=clamp(headHeight*.10,16,28);
 const push=(x,y,zone)=>{const p={x,y,radius,scale:radius/205,zone,clearance};if(x>=edge&&x<=w-edge&&y>=top&&y<=h*.54&&burstIsSafe(p,b))candidates.push(p);};
 for(const margin of [reserve,0]){
 const plannedGap=clearance+margin;
 push(cx+(random()-.5)*headWidth*.25,b.top-plannedGap-2,'above');
 // Upper diagonals keep the centre out of the forehead / temple area.
 const y=Math.max(top,b.top-clearance*.62),dy=Math.max(0,b.top-y);
 const dx=Math.sqrt(Math.max(0,plannedGap*plannedGap-dy*dy))+3;
 push(b.left-dx,y,'left');push(b.right+dx,y,'right');
 if(candidates.length)break;
 }
 if(!candidates.length)return null;
 const preferred=candidates.filter(p=>p.zone===['above','left','above','right'][side%4]);
 const list=preferred.length?preferred:candidates,p=list[Math.floor(random()*list.length)];
 p.launchX=clamp(side%3===0?cx:p.x+(random()-.5)*Math.min(w*.10,headWidth*.35),w*.16,w*.84);
 return p;
}
export function shellParticles(pattern,x,y,scale,digital,random=Math.random){
 const basePattern=pattern.startsWith('chrysanthemum-')?'chrysanthemum':pattern;
 const cfg=SHELLS[basePattern]||SHELLS.chrysanthemum;
 const count=digital?cfg.count:pattern==='crossette'?20:68+Math.floor(random()*17);
 const variant=pattern==='willow'?3:Math.floor(random()*5),theme=[variant,(variant+2)%5,3];
 const clusters=Array.from({length:9+Math.floor(random()*5)},()=>({a:random()*Math.PI*2,s:.65+random()*.7}));
 const rotation=(random()-.5)*.5,particles=[];
 for(let i=0;i<count;i++){
  let a=random()*Math.PI*2,speed=(digital?cfg.speed:285)*scale*(.70+random()*.56),ux,uy,color;
  if(pattern==='heart') {a=(i+random()*.8)/count*Math.PI*2;ux=16*Math.sin(a)**3/17;uy=-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))/17;speed*=.91+random()*.16;}
  else if(pattern==='orbit'){const ring=i%2,tilt=(ring?.50:-.50)+rotation,px=Math.cos(a),py=Math.sin(a)*(.40+random()*.14);ux=px*Math.cos(tilt)-py*Math.sin(tilt);uy=px*Math.sin(tilt)+py*Math.cos(tilt);speed*=.90+random()*.16;}
  else if(pattern==='willow'){const group=clusters[Math.floor(random()*clusters.length)];a=group.a+(random()-.5)*.21;speed*=group.s;ux=Math.cos(a);uy=Math.sin(a)*.86-.06;}
  else if(pattern==='crossette'){ux=Math.cos(a);uy=Math.sin(a);}
  else {const z=random()*2-1,radial=Math.sqrt(1-z*z)*(.88+random()*.18);ux=Math.cos(a)*radial;uy=Math.sin(a)*radial;if(random()<.22)speed*=.48+random()*.22;}
  const jitter=pattern==='heart'||pattern==='orbit'?.055:.10;ux+=(random()-.5)*jitter;uy+=(random()-.5)*jitter;
  // Every paper bloom has all five colours. Light shells have related accents and warm inner stars.
  color=digital?(random()<.66?theme[0]:random()<.65?theme[1]:theme[2]):(i+variant)%5;
  if(digital&&pattern==='willow')color=random()<.78?3:random()<.55?1:0;
  const life=digital?cfg.life[0]+random()*(cfg.life[1]-cfg.life[0]):2.0+random()*1.2;
  const type=digital?'ember':'star';
  particles.push({type,starPoints:4+i%3,x:x+(random()-.5)*2*scale,y:y+(random()-.5)*2*scale,vx:ux*speed,vy:uy*speed-12*scale,
   size:digital?.85+random()*1.65:13+random()*13,life,maxLife:life,variant:color,angle:random()*6.28,
   spin:(random()-.5)*(digital?.8:5.8),touched:0,trail:[],tailLength:digital?cfg.tail:8,trailClock:0,
   seed:random()*100,gravity:digital?cfg.gravity*scale:165*Math.sqrt(scale),drag:digital?cfg.drag*(.78+random()*.42):.9,
   drift:(random()-.5)*12*scale,delay:random()*(digital?.13:.055),collisionDelay:.65,
   luminosity:.58+random()*.42,pattern,secondary:0,splitAt:pattern==='crossette'&&(digital||i%5===0)?.55+random()*.38:null,scale});
 }
 if(['willow','chrysanthemum-double'].includes(pattern)){
  // A small, bounded set of the full-size opening pieces become descending seeds.
  // They use the same small-flower emitter as the former crossette final round.
  for(let i=0;i<particles.length;i+=Math.ceil(particles.length/8)){
   const p=particles[i];Object.assign(p,{carrier:true,flowerAt:1.02+p.seed*.003,tailLength:24,gravity:210*Math.sqrt(scale),life:3.3,maxLife:3.3});
  }
 }
 return{particles,variant};
}
export function crossetteChildren(parent,random=Math.random,paperFlowers=false){
 const result=[],rotation=parent.seed%6.28;
 for(let i=0;i<4;i++){
  const a=rotation+i*Math.PI/2+(random()-.5)*.28,speed=(70+random()*50)*(parent.scale||1),life=paperFlowers?1.9+random()*.4:1.15+random()*.65;
  const child={...parent,x:parent.x,y:parent.y,vx:parent.vx*.25+Math.cos(a)*speed,vy:parent.vy*.25+Math.sin(a)*speed,size:parent.size*.7,life,maxLife:life,secondary:1,splitAt:null,trail:[],trailClock:0,tailLength:18,touched:.1,delay:random()*.04,collisionDelay:.2,drag:.7,gravity:65*Math.sqrt(parent.scale||1),seed:random()*100};
  if(paperFlowers)Object.assign(child,{type:'spark',dot:true,size:2+random()*1.2,tint:roundColor(parent,2),fireworkStage:2,flowerCarrier:true,flowerAt:.48+random()*.32,burstStage:2,gravity:125*Math.sqrt(parent.scale||1),tailLength:24});
  result.push(child);
 }
 return result;
}
