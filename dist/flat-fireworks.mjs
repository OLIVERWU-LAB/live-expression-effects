import {particleVisibility} from './particle-visibility.mjs';
import {clamp} from './core.mjs';
import {handShell,handRing} from './handglow-particles.mjs';
const TAU=Math.PI*2;
export const FLAT_LAUNCH_BLUE='#59C9F2';
export const FLAT_PATTERN='flat-petals';
export const FLAT_PATTERNS=Object.freeze([FLAT_PATTERN,'flat-petals-slow','flat-medallion','flat-star-crown','flat-swirl','flat-ribbons','flat-sparkle','flat-festival']);
export const ACTIVE_FLAT_PATTERNS=Object.freeze([FLAT_PATTERN,'flat-medallion','flat-star-crown','flat-festival']);
export const FLAT_CASCADES=Object.freeze(['flat-medallion','flat-star-crown','flat-festival']);
export const FLAT_NAME='花瓣涟漪';
export const FLAT_PALETTE=Object.freeze(['#59C9F2','#FF7975','#FFE394','#FFF8E8']);
export const FLAT_COLORWAYS=Object.freeze([
 ['#ED5059','#24B8D1','#295A9D','#FFF2D6'],
 ['#F3D861','#9675CF','#FFF0DA','#4E8BD1'],
 ['#F27658','#42C8BC','#EEE15D','#9A71BA'],
 ['#EF82B2','#9B82DB','#FFE093','#67C7D8'],
 ['#63BFCB','#FACB74','#F39B8D','#7B91CD'],
 ['#E8846C','#FFC96D','#BE91D9','#76C5AF']
]);
export const flatTempo=pattern=>pattern==='flat-petals-slow'?1.65:.95;
function make(parent,role,vx,vy,size,life,tint,random,extra={}){
 const tempo=parent.tempo||1,scale=parent.scale||1;
 const p={type:'spark',flatFx:true,flatMobile:parent.flatMobile,flatRole:role,pattern:parent.pattern,x:parent.x,y:parent.y,vx,vy,size,life:life*tempo,maxLife:life*tempo,tempo,scale,variant:parent.variant||0,tint,seed:random()*100,angle:Math.atan2(vy,vx),spin:0,gravity:130*Math.sqrt(scale)/(tempo*tempo),drag:.85/tempo,delay:0,trail:[],tailLength:0,trailClock:0,touched:0,collisionDelay:.55,luminosity:.48,birthX:parent.x,birthY:parent.y,emitterId:parent.seed,clusterIndex:parent.clusterIndex,flatBand:parent.flatBand,flatDensity:parent.flatDensity,noRecollision:role==='ring',backgroundOnly:role==='ring',...extra};
 if(p.flatMobile&&p.whiteFlash)p.size=Math.max(p.size,p.flatTailSpark?1.35:1.15);return p;
}
// Old flower choreography retained, but only five live carriers are created here.
// Their actual, integrated positions now own every later explosion centre.
export function flatShell(x,y,scale=1,random=Math.random,pattern=FLAT_PATTERN){
 if(pattern==='flat-reprise'){const shell=handShell('cinema-rings',x,y,scale,random);return{...shell,particles:flattenReprise(shell.particles,FLAT_COLORWAYS[shell.variant],null)};}
 const tempo=flatTempo(pattern),root=Math.sqrt(scale),phase=random()*TAU,hue=Math.floor(random()*3),parent={x,y,scale,tempo,pattern,variant:hue,seed:random()*100};
 if(FLAT_CASCADES.includes(pattern)){
  // One launch -> five moving white carriers -> five staggered flowers.
  // No final flower coordinates are stored; the moving carrier owns the origin.
  const particles=[];
  for(let j=0;j<5;j++){
   const a=phase+j*2.39996323,speed=(j===0?200:1150+random()*280)*scale,open=j===0?.20+random()*.01:.22+j*.125+random()*.025;
   const motion=flatCarrierVelocity(Math.cos(a)*speed,Math.sin(a)*speed-35*root,open*tempo,130*root/(tempo*tempo));
   particles.push(make(parent,'seed',motion.vx,motion.vy,3.7*root,open+.09,'#FFF8E8',random,{delay:.08,collisionDelay:1,flatEmitAt:open*tempo,tailLength:14,trailAge:.14,drag:motion.drag,flatStopSpeed:28,turn:phase+j*.22,cascade:true,clusterIndex:j,flowerScale:[.68,.92,1.16,.78,1.02][j],variant:(hue+j)%FLAT_COLORWAYS.length}));
  }
  return{particles,variant:hue};
 }
 if(![FLAT_PATTERN,'flat-petals-slow'].includes(pattern))return radialShell(parent,phase,random);
 const particles=[];
 for(let j=0;j<5;j++){
  const a=phase+j*2.39996323,speed=(j===0?45:185+random()*65)*scale,open=.20+j*.11+random()*.01;
  particles.push(make(parent,'seed',Math.cos(a)*speed/tempo,(Math.sin(a)*speed-45*root)/tempo,3.2*root,open+.06,FLAT_PALETTE[3],random,{delay:.08,collisionDelay:1,flatEmitAt:open*tempo,clusterIndex:j,tailLength:10,color:FLAT_COLORWAYS[(hue+j)%FLAT_COLORWAYS.length][0],accent:FLAT_COLORWAYS[(hue+j)%FLAT_COLORWAYS.length][1],variant:(hue+j)%FLAT_COLORWAYS.length,turn:a*.2,petalCount:17+j%3}));
 }
 return{particles,variant:hue};
}
export function flatChildren(parent,random=Math.random){
 if(parent.flatReprise){return flattenReprise(handRing(parent,random),parent.flatColors,parent);}
 if(parent.cascade){
  const local={...parent,scale:parent.scale*.78*(parent.flowerScale||1),tempo:1};
  const children=radialShell(local,parent.turn,random).particles;
  const colors=FLAT_COLORWAYS[parent.variant];
  children.push(make(local,'ring',0,0,64*Math.sqrt(local.scale),1.65,colors[1],random,{delay:.14,gravity:36,flatRing:true}));
  for(let i=0;i<32;i++){
   const a=parent.turn+i*2.39996323,speed=(70+random()*230)*local.scale;
   children.push(make(local,'dust',Math.cos(a)*speed,Math.sin(a)*speed,Math.min(parent.pattern==='flat-festival'?1.8:parent.pattern==='flat-star-crown'?2.2:3.5,(i%8===0?3.5:i%2===0?1.5+random()*.8:.50+random()*.70))*Math.sqrt(local.scale*.62/.78),1.65+random()*.24,i%2===0?'#FFFFFF':colors[i%3],random,{delay:.06+random()*.08,gravity:90*Math.sqrt(local.scale),luminosity:.20,flatFine:true,whiteFlash:i%2===0}));
  }
  for(const child of children){child.vx+=parent.vx;child.vy+=parent.vy;child.clusterIndex=parent.clusterIndex;child.cascadeChild=true;const longTrail=parent.pattern==='flat-medallion'&&child.flatRole==='comet';child.life=child.maxLife=(longTrail?2.05:child.flatRing?1.90:child.flatFine?(parent.pattern==='flat-medallion'?1.70:1.90):1.62)+random()*(longTrail?.18:.22);child.drag=longTrail?.95:1.35;child.collisionDelay=.38;if(longTrail){child.longTrail=true;child.trailAge=1.10;child.tailLength=84;child.trailTint=colors[child.flatBand===0?1:0];}}
  return children;
 }
 const out=[],root=Math.sqrt(parent.scale),T=parent.tempo,color=parent.color,accent=parent.accent;
 if(parent.flatRole==='seed'){
  for(let k=0;k<parent.petalCount;k++){
   const a=parent.turn+k/parent.petalCount*TAU,speed=(190+random()*18)*root/T*1.12;
   out.push(make(parent,'petal',parent.vx+Math.cos(a)*speed,parent.vy+Math.sin(a)*speed,(10.5+random()*2)*root*1.10,1.50,color,random,{angle:a,drag:1.65/T}));
  }
  out.push(make(parent,'core',parent.vx,parent.vy,3.4*root,.23,accent,random,{flatEmitAt:.16*T,turn:parent.turn,color,accent}));
 }else if(parent.flatRole==='core'&&parent.petalLayer===2){
  const tint=FLAT_COLORWAYS[parent.variant||0][2];
  for(let k=0;k<12;k++){const a=parent.turn+k/12*TAU+.36,speed=53*root/T*1.12;out.push(make(parent,'petal',parent.vx+Math.cos(a)*speed,parent.vy+Math.sin(a)*speed,4.1*root*1.10,1.14,tint,random,{angle:a,drag:1.6/T,innerPetal:true,petalLayer:3}));}
 }else if(parent.flatRole==='core'){
  for(let k=0;k<16;k++){
   const a=parent.turn+k/16*TAU+.18,speed=100*root/T*1.12;
   out.push(make(parent,'petal',parent.vx+Math.cos(a)*speed,parent.vy+Math.sin(a)*speed,5.2*root*1.10,1.05,accent,random,{angle:a,drag:1.8/T,innerPetal:true}));
  }
  out.push(make(parent,'core',parent.vx,parent.vy,2.4*root,.25,accent,random,{flatEmitAt:.19*T,turn:parent.turn,color,accent,petalLayer:2}));
  out.push(make(parent,'ring',parent.vx,parent.vy,24*root,1.56,accent,random,{angle:parent.turn}));
  for(let k=0;k<24;k++){
   const a=parent.turn+k/24*TAU+(random()-.5)*.12,speed=(112+random()*85)*root/T;
   out.push(make(parent,k%4===0?'dash':'dust',parent.vx+Math.cos(a)*speed,parent.vy+Math.sin(a)*speed,(k%4===0?2.3:.65+random()*.55)*root,1.87+random()*.30,k%2===0?'#FFFFFF':color,random,{angle:a,drag:1.1/T,whiteFlash:k%2===0}));
  }
 }
 return out;
}
function radialShell(parent,phase,random){
 const p=[],colors=FLAT_COLORWAYS[parent.variant],r=Math.sqrt(parent.scale),s=parent.scale,key=parent.pattern;
 let band=0;const emit=(role,count,speed,size,palette,offset=0,extra={})=>{
  const flatBand=band++;
  for(let i=0;i<count;i++){
   const a=phase+(i+offset)/count*TAU,velocity=(speed+(i%2?8:-8))*s;
   p.push(make(parent,role,Math.cos(a)*velocity,Math.sin(a)*velocity-22*r,size*(i%2?.9:1)*r,2.05+random()*.24,palette[i%palette.length],random,{angle:a,flatBand,tempo:1,gravity:115*r,drag:1.0,tailLength:['comet','ribbon','leaf','spoke'].includes(role)?24:0,trailAge:.28,cap:'#FFF2D6',...extra}));
  }
 };
 if(key==='flat-medallion'){
  emit('comet',24,360,5.4,[colors[1],colors[2]],0,{cap:'#FFF2D6',tailScale:1,outerGlints:true});
  emit('comet',16,235,3.8,[colors[0]],.3,{cap:'#FFF2D6',tailScale:1.25});
  emit('comet',7,95,2.7,[colors[2]],.2,{tailScale:.65});
  emit('dust',24,405,1.9,[colors[0]],.35);emit('dust',12,160,1.3,['#FFF2D6']);
 }else if(key==='flat-star-crown'){
  emit('comet',16,290,3.9,[colors[3],colors[1]],.2,{cap:null,tailScale:1.25});
  emit('star',8,350,15,[colors[0]],0,{points:5,tailLength:24,trailAge:.27,trailWidth:2.5*r,trailTint:colors[1],outerGlints:true});
  // Each primary crown star carries three smaller, loosely spaced companions.
  for(const anchor of p.filter(q=>q.flatRole==='star'))for(let j=0;j<3;j++){
   const a=anchor.angle+(random()-.5)*.16,speed=(270+random()*95)*s;
   p.push(make(parent,'star',Math.cos(a)*speed,Math.sin(a)*speed-22*r,(3+random()*3.2)*r,2.05+random()*.24,colors[j%2?2:0],random,{angle:a,points:5,crownSatellite:true,delay:.035+random()*.09,gravity:115*r,drag:1.0}));
  }
  emit('comet',20,150,3.4,[colors[0]],.25,{cap:null});
  emit('star',16,325,4.5,[colors[2]],.35,{points:4});
 }else if(key==='flat-swirl'){
  emit('leaf',27,300,8.5,[colors[0],colors[1],colors[2]],0,{cap:null,curl:.52,tailScale:1.20});
  emit('star',27,370,4.5,[colors[2],colors[3]],.2,{points:4});
  emit('dust',27,395,1.8,[colors[1]],.6);
 }else if(key==='flat-ribbons'){
  emit('ribbon',24,315,11,[colors[0],colors[1],colors[2],colors[3]],0,{cap:null,tailScale:1.45});
  emit('star',24,385,4.7,[colors[0],colors[2]],.5,{points:5});
  emit('comet',12,185,3.1,[colors[2]],.25,{cap:null});
 }else if(key==='flat-festival'){
  // Broad moving heads, slim comets, and an outer star crown. The apparent
  // streamers are recorded trajectories, never separate animated ribbons.
  emit('ribbon',24,340,7.2,[colors[0],colors[1],colors[2],colors[3]],0,{cap:null,trailAge:.31});
  emit('comet',12,245,4.8,[colors[1],colors[2]],.5,{cap:null,trailAge:.24});
  emit('star',24,400,5.5,[colors[0],colors[2],colors[1]],.5,{points:5,outerGlints:true});
  emit('dust',24,423,1.7,[colors[3],colors[1]],.25);
  let index=0;
  for(const q of p)if(q.flatRole==='ribbon'){
   const k=index++,factor=[.82,1.15,.98,1.07][k%4];q.vx*=factor;q.vy=(q.vy+22*r)*factor-22*r;
   q.size*=[.72,1.2,.86,1.08][k%4];q.trailAge=[.21,.34,.28,.38][k%4];
  }
 }else{
  emit('comet',16,220,4.2,[colors[0],colors[2]],0,{cap:colors[0],tailScale:1.3});
  emit('star',16,290,17,[colors[2]],.5,{points:4});
  emit('petal',12,365,17,[colors[1],colors[3]],.35,{drag:1,spin:.28});
  emit('dust',16,242,4.5,[colors[0]],0);
 }
 return{particles:p,variant:parent.variant};
}
function flatStar(g,n,r){g.beginPath();for(let i=0;i<n*2;i++){const a=i*Math.PI/n-Math.PI/2,rr=i%2?r*(n===4?.23:.46):r;i?g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fill();}
// The mesh is formed only from past head positions. Gravity, deceleration and
// collision therefore bend the tail naturally; it never pivots as a rigid stripe.
export function flatTrailWindow(p){const age=p.maxLife-p.life;return p.longTrail?(.32+.72*clamp(age/1.05))*(.30+.70*clamp(p.life/.80)):(p.trailAge??.28);}
export function flatTrailGeometry(p){
 const points=[{x:0,y:0,d:0}],age=p.maxLife-p.life,maxAge=flatTrailWindow(p),maxLength=p.longTrail?Math.max(22,180*(p.scale||1)):100*p.scale;
 let lastAge=age;
 for(const q of p.trail||[]){
  if(!Number.isFinite(q.x)||!Number.isFinite(q.y)||q.age!=null&&(!Number.isFinite(q.age)||q.age>lastAge+.001))break;
  if(q.age!=null&&age-q.age>maxAge)break;
  const prev=points.at(-1),x=q.x-p.x,y=q.y-p.y,step=Math.hypot(x-prev.x,y-prev.y);
  if(p.longTrail&&step>Math.max(10,Math.hypot(p.vx||0,p.vy||0)*.10+8))break;
  if(step<.25)continue;
  if(p.longTrail&&points.length>1){const a=points.at(-2),dx=prev.x-a.x,dy=prev.y-a.y;if((dx*(x-prev.x)+dy*(y-prev.y))/(Math.hypot(dx,dy)*step)<-.25)break;}
  if(prev.d+step>maxLength){const t=(maxLength-prev.d)/step;points.push({x:prev.x+(x-prev.x)*t,y:prev.y+(y-prev.y)*t,d:maxLength});break;}
  points.push({x,y,d:prev.d+step,age:q.age});
  if(q.age!=null)lastAge=q.age;
 }
 if(points.length<2)return{points,left:[],right:[]};
 const total=points.at(-1).d,w=p.trailWidth??p.size,left=[],right=[];
 for(let i=0;i<points.length;i++){
  const q=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],len=Math.hypot(b.x-a.x,b.y-a.y)||1,
   nx=-(b.y-a.y)/len,ny=(b.x-a.x)/len,width=w*Math.pow(1-q.d/total,.85)*(p.longTrail&&q.age!=null?Math.pow(clamp(1-(age-q.age)/maxAge),.55):1);
  left.push({x:q.x+nx*width,y:q.y+ny*width});right.push({x:q.x-nx*width,y:q.y-ny*width});
 }
 return{points,left,right};
}
export function flatLongTailFade(p){return Math.pow(clamp((p.life-.10)/.58),2.5);}
function flatRay(g,p,age,remaining,head=true){
 const path=flatTrailGeometry(p),w=p.size;if(p.longTrail&&flatLongTailFade(p)<=.003)return;
 g.globalAlpha=particleVisibility(p)*clamp(age/.04)*(p.longTrail?flatLongTailFade(p):clamp(remaining/.60));g.fillStyle=p.trailTint||p.tint;
 if(path.left.length&&g.globalAlpha>.003){
  if(p.longTrail){
   // Solid, bounded quads avoid tiny/degenerate GPU gradients in mobile WebKit.
   // Every quad explicitly owns its colour, alpha and path, including foreground redraws.
   const alpha=g.globalAlpha,total=path.points.at(-1).d,stride=Math.max(1,Math.ceil((path.points.length-1)/12));
   for(let i=0;i<path.points.length-1;i+=stride){const j=Math.min(path.points.length-1,i+stride),fade=1-(path.points[i].d+path.points[j].d)/(2*total);g.globalAlpha=alpha*fade;g.fillStyle=p.trailTint||p.tint;g.beginPath();g.moveTo(path.left[i].x,path.left[i].y);g.lineTo(path.left[j].x,path.left[j].y);g.lineTo(path.right[j].x,path.right[j].y);g.lineTo(path.right[i].x,path.right[i].y);g.closePath();g.fill();}g.globalAlpha=alpha;
  }else{g.beginPath();g.moveTo(path.left[0].x,path.left[0].y);for(const q of path.left.slice(1))g.lineTo(q.x,q.y);for(const q of [...path.right].reverse())g.lineTo(q.x,q.y);g.closePath();g.fill();}
 }
 // The head remains at the integrated particle coordinate, with no faux ribbon rotation.
 if(head){g.fillStyle=p.cap||p.tint;g.beginPath();g.arc(0,0,p.flatRole==='ribbon'?w*.32:w*.98,0,TAU);g.fill();}
}
export function flatEnvelope(age){return{bud:clamp(age/.035)*clamp((.22-age)/.07),petals:clamp(age/.055)*clamp((1.12-age)/.45),ring:clamp(age/.09)*clamp((1.56-age)/.80),dust:clamp(age/.08)*clamp((2-age)/.7)};}
export function drawFlatFireworks(g,world){
 g.save();g.globalCompositeOperation='source-over';g.lineCap='round';g.lineJoin='round';
 for(const p of world.particles){if(!p.flatFx||p.delay>0||p.life<=0||!Number.isFinite(p.x+p.y+p.size+p.life+p.maxLife))continue;
  const age=(p.maxLife-p.life)/p.tempo,remaining=p.life/p.tempo,env=flatEnvelope(age),r=p.size;
  g.save();g.translate(p.x,p.y);g.fillStyle=p.tint;g.strokeStyle=p.tint;
  if(p.flatReprise){drawFlatReprise(g,p);
  }else if(['comet','ribbon','leaf','spoke'].includes(p.flatRole)){flatRay(g,p,age,remaining);
  }else if(p.flatRole==='star'){if(p.tailLength)flatRay(g,p,age,remaining,false);g.fillStyle=p.tint;g.globalAlpha=particleVisibility(p)*clamp(age/(p.openingStar?.018:.05))*clamp(remaining/(p.openingStar?.16:.60));if(p.openingGlint)g.globalAlpha*=flatOpeningGlint(age,p);g.rotate(p.angle*.2);flatStar(g,p.points||5,r*(p.openingFlash?(.65+.45*clamp(age/.08))*clamp(remaining/.10):(.8+.2*clamp(remaining/.5))));
  }else if(p.flatRole==='seed'||p.flatRole==='core'){
   g.globalAlpha=particleVisibility(p)*clamp(remaining/.04);g.beginPath();g.arc(0,0,r,0,TAU);g.fill();
   if(p.trail.length>1){g.strokeStyle=p.flatRole==='seed'?FLAT_LAUNCH_BLUE:p.tint;g.lineWidth=p.flatRole==='seed'?2.4:1.4;g.globalAlpha*=.7;g.beginPath();g.moveTo(0,0);for(const q of p.trail)g.lineTo(q.x-p.x,q.y-p.y);g.stroke();}
  }else if(p.flatRole==='petal'){
   const grow=1-Math.exp(-age*32),shrink=.72+.28*clamp(remaining/.38),length=r*grow*shrink;
   g.globalAlpha=particleVisibility(p)*clamp(age/.035)*clamp(remaining/.44);g.rotate(p.angle);
   // A rounded tapered petal, not a rectangle or a uniform ellipse.
   g.beginPath();g.moveTo(-length*.9,0);g.bezierCurveTo(-length*.15,-length*.48,length*.95,-length*.48,length*.95,0);g.bezierCurveTo(length*.95,length*.48,-length*.15,length*.48,-length*.9,0);g.fill();
  }else if(p.flatRole==='ring'){
   const radius=r*(.16+.84*(1-Math.exp(-age*4.2)));
   g.globalAlpha=particleVisibility(p)*env.ring*clamp(remaining/(p.initialOpening?.22:.60));g.lineWidth=Math.max(.65,r*.24*Math.exp(-age*2.6));g.beginPath();
   for(let i=0;i<=40;i++){const a=i/40*TAU,rr=radius*(1+.035*Math.sin(a*5+p.seed)+.018*Math.sin(a*3));const xx=Math.cos(a)*rr,yy=Math.sin(a)*rr;i?g.lineTo(xx,yy):g.moveTo(xx,yy);}g.closePath();g.stroke();
  }else if(p.flatTailSpark){
   g.globalAlpha=flatAfterglintEnvelope(p);g.fillStyle='#FFFFFF';g.rotate(p.angle);g.beginPath();g.ellipse(0,0,r,r*.64,0,0,TAU);g.fill();if(g.globalAlpha>.70){g.fillRect(-r*1.45,-.32,r*2.9,.64);}
  }else{
   g.globalAlpha=particleVisibility(p)*clamp(age/.04)*clamp(remaining/.60)*(p.whiteFlash?(.18+.82*Math.pow(Math.max(0,Math.sin(age*17+p.seed)),4)):1);const shrink=.6+.4*clamp(remaining/.6);g.rotate(p.angle);g.beginPath();g.ellipse(0,0,r*shrink*(p.whiteFlash?1.65:1),r*(p.flatRole==='dash'?.35:1)*shrink*(p.whiteFlash?1.65:1),0,0,TAU);g.fill();
  }
  g.restore();if(p.pattern==='flat-medallion'&&p.outerGlints)drawOuterGlints(g,p);
 }
 g.restore();
}

// A tapered blue stroke sampled from the real launch trajectory: narrow ends,
// fuller middle. Its width does not come from a rigid rotated rectangle.
export function drawFlatLaunch(g,r){
 const pts=[{x:r.x,y:r.y}],cap=85;let length=0;
 for(const q of r.trail||[]){const last=pts.at(-1),d=Math.hypot(q.x-last.x,q.y-last.y);if(d<.2)continue;if(length+d>cap){const f=(cap-length)/d;pts.push({x:last.x+(q.x-last.x)*f,y:last.y+(q.y-last.y)*f});break;}pts.push(q);length+=d;}
 if(pts.length<2)return;g.save();g.globalCompositeOperation='source-over';g.globalAlpha=clamp(r.age/.08);g.fillStyle=FLAT_LAUNCH_BLUE;const left=[],right=[];
 for(let i=0;i<pts.length;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],d=Math.hypot(b.x-a.x,b.y-a.y)||1,w=.35+4.6*Math.sin(i/(pts.length-1)*Math.PI)**.8;left.push({x:pts[i].x-(b.y-a.y)/d*w,y:pts[i].y+(b.x-a.x)/d*w});right.push({x:pts[i].x+(b.y-a.y)/d*w,y:pts[i].y-(b.x-a.x)/d*w});}
 g.beginPath();g.moveTo(left[0].x,left[0].y);for(const p of left)g.lineTo(p.x,p.y);for(const p of right.reverse())g.lineTo(p.x,p.y);g.closePath();g.fill();g.restore();
}

// A compact first flower opens at the launch apex before the five live seeds spread.
export const flatOpeningGlint=(age,p)=>.16+.84*(.5+.5*Math.sin(age*p.glintRate+p.glintPhase))**3;
export function flatOpening(x,y,scale,variant,random=Math.random,pattern=FLAT_PATTERN){
 if(pattern==='flat-reprise')return[];
 const parent={x,y,scale,tempo:1,variant,pattern,seed:random()*100},out=[],colors=FLAT_COLORWAYS[variant],phase=random()*TAU;
 for(let i=0;i<10;i++){const a=phase+i/10*TAU,speed=(180+random()*28)*Math.sqrt(scale);out.push(make(parent,'petal',Math.cos(a)*speed,Math.sin(a)*speed,(FLAT_CASCADES.includes(pattern)?9.5:7.8)*Math.sqrt(scale),.8,colors[i%2],random,{initialOpening:true,angle:a,gravity:75,drag:2.8}));}
 // Small, irregular near-apex glints: atmosphere rather than a second crown.
 for(let i=0;i<10;i++){
  const noise=random(),a=phase+i*2.39996+(noise-.5)*.8,speed=(260+(noise*7.13%1)*90)*Math.sqrt(scale),size=(2.8+(noise*13.7%1)*2.7)*1.25*Math.sqrt(scale);
  out.push(make(parent,'star',Math.cos(a)*speed,Math.sin(a)*speed,size,.46,'#FFFFFF',()=>noise,{initialOpening:true,openingStar:true,openingGlint:true,points:4,angle:a,gravity:30,drag:3.6,glintPhase:noise*TAU,glintRate:24+(noise*17.1%1)*14}));
 }
 out.push(make(parent,'star',0,0,26*Math.sqrt(scale),.22,'#FFF2D6',random,{initialOpening:true,openingStar:true,openingFlash:true,points:4,gravity:18}));
 out.push(make(parent,'ring',0,0,34*Math.sqrt(scale),.48,'#FFF2D6',random,{initialOpening:true,gravity:18}));return out;
}

// Keep the measured endpoint with gentler braking, so a carrier does not coast
// almost motionless for the last part of its timed flight.
export function flatCarrierVelocity(vx,vy,duration,gravity){
 const drag=3,oldE=(1-Math.exp(-9*duration))/9,newE=(1-Math.exp(-drag*duration))/drag;
 return{vx:vx*oldE/newE,vy:(vy*oldE+gravity*(duration-oldE)/9-gravity*(duration-newE)/drag)/newE,drag};
}

// Keep the fourth style's actual emitter structure, drawn as flat coloured chips.
function flattenReprise(particles,colors,parent){
 return particles.map((p,i)=>({...p,pattern:'flat-reprise',flatFx:true,flatReprise:true,flatColors:colors,flatRole:'reprise-'+p.handRole,cinematic:false,handDrawn:false,ringBlob:false,handSplitAt:null,flatEmitAt:p.handSplitAt??null,tempo:1,tint:p.handRole==='cinder'?(i%5===0?'#FFFFFF':colors[2]):colors[p.handRole==='star'?1:0],whiteFlash:p.handRole==='cinder'&&i%5===0,secondary:parent?1:0,emitterId:parent?.seed,birthX:p.x,birthY:p.y}));
}
export function flatRepriseEnvelope(p){const age=p.maxLife-p.life,t=age/p.maxLife,split=clamp((t-.50)/.28);return{split,fade:particleVisibility(p)*clamp(age/.055)*clamp(p.life/.45),blink:.28+.72*Math.sin(age*16+p.seed)**2};}
function flatChip(g,r,seed){g.beginPath();for(let i=0;i<16;i++){const a=i/16*TAU,rr=r*(1+.10*Math.sin(a*5+seed));i?g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fill();}
function drawFlatReprise(g,p){
 const e=flatRepriseEnvelope(p),age=p.maxLife-p.life,r=p.size*(.70+.30*clamp(p.life/.6)),lobe=p.flatRole==='reprise-lobe';g.fillStyle=p.tint;
 if(p.flatRole==='reprise-comet'&&p.trail.length>1){g.globalAlpha=e.fade*.60;g.strokeStyle=p.tint;g.lineWidth=Math.max(1,p.size*.55);g.beginPath();g.moveTo(0,0);for(const q of p.trail.slice(0,5))g.lineTo(q.x-p.x,q.y-p.y);g.stroke();}
 g.rotate(p.angle+Math.sin(age*7+p.seed)*.08);
 if(lobe){g.globalAlpha=e.fade*(1-e.split);flatChip(g,r,p.seed);for(let k=0;k<3;k++){const a=k/3*TAU+p.seed,offset=e.split*p.size*1.05;g.save();g.translate(Math.cos(a)*offset,Math.sin(a)*offset);g.globalAlpha=e.fade*e.split*(.35+.65*Math.sin(age*16+p.seed+k*1.9)**2);flatChip(g,r*(.48-.12*e.split),p.seed+k);g.restore();}}
 else{g.globalAlpha=e.fade*(p.flatRole==='reprise-cinder'?e.blink:1);if(p.flatRole==='reprise-star')flatStar(g,5,r);else flatChip(g,r,p.seed);}
}
export function outerGlintEnvelope(p){const elapsed=clamp((p.maxLife-p.life-.36)/.55),late=clamp((.80-p.life)/.45),pulse=Math.pow(Math.max(0,Math.sin((p.maxLife-p.life)*19+p.seed)),4);return particleVisibility(p)*elapsed*late*clamp((p.life-.10)/.22)*pulse;}
// Independent late sparks remain after their coloured head has burned away.
export function flatAfterglints(parent,random=Math.random){
 if(parent.pattern==='flat-medallion'||Math.floor(parent.seed)%2!==0)return[];const root=Math.sqrt(parent.scale||1);
 return Array.from({length:2},(_,i)=>{const a=parent.seed+i*2.4,life=.32+random()*.08;return make(parent,'dust',parent.vx*.82+Math.cos(a)*(8+i*5),parent.vy*.82+Math.sin(a)*(8+i*5),(1.75+random()*.65)*root,life,'#FFFFFF',random,{x:parent.x+Math.cos(a)*(3+i*4)*root,y:parent.y+Math.sin(a)*(3+i*4)*root,flatTailSpark:true,whiteFlash:true,outerGlints:false,gravity:90*root,drag:1.1,tempo:1,life,maxLife:life,hasCollided:parent.hasCollided||false,hitRegion:parent.hitRegion,hitAge:parent.hitAge||0,noRecollision:true,trail:[],tailLength:0,collisionDelay:0});});
}
export function flatAfterglintEnvelope(p){const age=p.maxLife-p.life,pulse=Math.pow(.5+.5*Math.sin(age*22+p.seed),3);return particleVisibility(p)*clamp(age/.045)*clamp(p.life/.18)*(.18+.82*pulse);}

function drawOuterGlints(g,p){
 if(Math.floor(p.seed)%3!==0)return;const light=outerGlintEnvelope(p);if(light<.003)return;g.save();g.translate(p.x,p.y);g.fillStyle='#FFFFFF';
 for(let k=0;k<2;k++){const a=p.seed+k*2.4,d=(4+k*5)*Math.sqrt(p.scale||1),r=(.65+k*.38)*Math.sqrt(p.scale||1);g.save();g.translate(Math.cos(a)*d,Math.sin(a)*d);g.rotate(a);g.globalAlpha=light*(k?.62:1);g.beginPath();g.moveTo(-r*1.3,0);g.lineTo(0,-r*.6);g.lineTo(r*1.3,0);g.lineTo(0,r*.6);g.closePath();g.fill();g.restore();}g.restore();
}
