import {REFINED_CINEMA_PATTERN} from './cinema-refined-particles.mjs?v=c5a4e5600643';
import {ORIGINAL_CINEMA_PATTERN} from './cinema-original-particles.mjs?v=c5a4e5600643';
import {GIFT_RANDOM_MATERIALS,giftMaterialTint} from './gift-materials.mjs?v=c5a4e5600643';
import {clamp} from './core.mjs?v=c5a4e5600643';
export const GIFT_PATTERNS=Object.freeze(['gift-twinkle']);
export const CINEMA_PATTERNS=Object.freeze(['cinema-shell','cinema-rings']);
export const ACTIVE_CINEMA_PATTERNS=Object.freeze(['cinema-rings']);
export const CINEMA_COMPARISON_PATTERNS=Object.freeze([ORIGINAL_CINEMA_PATTERN,...ACTIVE_CINEMA_PATTERNS]);
export const CINEMA_PREVIEW_PATTERNS=Object.freeze([ORIGINAL_CINEMA_PATTERN,REFINED_CINEMA_PATTERN,...ACTIVE_CINEMA_PATTERNS]);
export const REFERENCE_NAMES=Object.freeze({'cinema-refined':'原版优化','cinema-original':'原版复绽','flat-petals':'花瓣','flat-petals-slow':'花瓣 · 慢版','flat-medallion':'同心礼花','flat-star-crown':'星冠绽放','flat-swirl':'旋舞花火','flat-ribbons':'缎带花束','flat-sparkle':'繁星花簇','flat-festival':'锦簇花火','flat-reprise':'碎光花环','gift-scatter':'缤纷散落','gift-twinkle':'错落散射','cinema-shell':'空中礼花','cinema-rings':'彩环复绽'});
export const GIFT_PALETTE=Object.freeze(['#FFCC32','#853DDD','#E94355','#367DD9','#CE36A6','#EF8950']);
export const GIFT_BEAD_COLORS=Object.freeze(['#C32CFF','#83E7C3']);
export const GIFT_ASSETS=Object.freeze({star:[0,3,4],bead:[0,1,2,3,4,5],ring:[0,1],ribbon:[0,1,2,3,4,5],coil:[1,2],sparkle:[0],fourstar:[3,4],cube:[1,3,5],triangle:[0,4],cylinder:[1],wave:[3,4],twinkle:[0,1],drop:[0],popper:[0],capsule:[0]});
export const GIFT_SURFACE_COLORS=Object.freeze({star0:'#FFDA60',fourstar3:'#658AD9',fourstar4:'#DB4D95',cube3:'#65B9E9',cube5:'#ED936B',ring0:'#EFC76D',ring1:'#B45BDF',bead0:'#F1CE6D',bead2:'#DF6C71',bead3:'#5C9CD6',bead4:'#D74DAB',wave3:'#5485D0',wave4:'#DA51B6',coil1:'#9B31D8',coil2:'#D93E58',ribbon0:'#F1C650',ribbon1:'#9B43D9',cylinder1:'#7D3BD2'});
export const giftSurfaceColor=(kind,color)=>GIFT_SURFACE_COLORS[kind+color]||GIFT_PALETTE[color];
// Reference image is a 1200px composition. These measured centres and maximum
// dimensions preserve its large/medium/tiny hierarchy and deliberately uneven gaps.
export const GIFT_LAYOUT=Object.freeze([
 ['bead',3,555,126,18,0],['star',0,703,133,82,15],['ring',1,363,186,42,-10],['ring',0,514,238,138,12],['cylinder',1,650,264,112,24],['cube',1,864,218,84,-20],
 ['coil',2,300,363,185,-24],['cube',1,485,407,65,25],['fourstar',3,849,366,100,-12],['wave',4,984,336,116,-15],['bead',2,743,274,25,0],['bead',4,709,392,60,0],['bead',4,604,419,31,0],['bead',2,126,449,43,0],
 ['triangle',4,254,517,93,-14],['star',0,531,536,124,-16],['wave',4,693,511,110,25],['coil',1,1003,536,190,-31],['bead',2,806,487,23,0],['bead',2,407,556,49,0],
 ['cube',3,352,660,107,-5],['cylinder',1,643,632,82,75],['cube',5,801,624,110,-15],['ribbon',0,491,750,182,-16],['ribbon',1,658,788,164,16],['wave',3,829,781,140,20],
 ['bead',3,169,604,33,0],['bead',2,186,722,22,0],['bead',4,913,728,30,0],['bead',3,1077,694,29,0],['fourstar',4,1005,801,83,17],['cube',1,341,841,90,19],['fourstar',3,210,872,70,-16],
 ['triangle',0,497,949,81,27],['wave',4,919,929,115,-24],['bead',3,552,861,32,0],['bead',3,641,955,32,0],['bead',3,371,997,20,0],['bead',4,792,992,25,0],['bead',2,538,1062,53,0],['star',0,669,1071,81,8]
]);
const TAU=Math.PI*2;
function particle(x,y,vx,vy,size,life,variant,random,extra={}){return{type:'spark',x,y,vx,vy,size,life,maxLife:life,variant,angle:0,spin:0,touched:0,secondary:0,trail:[],trailClock:0,tailLength:20,collisionDelay:.65,seed:random()*100,gravity:70,drag:1.4,drift:0,delay:0,scale:1,luminosity:.8,...extra};}
export function giftShell(pattern,x,y,scale=1,random=Math.random,material=null){
 const radius=205*scale,rotation=(random()-.5)*.10,drag=.78,T=.78,E=(1-Math.exp(-drag*T))/drag,g=255*Math.sqrt(scale),driftY=g*(T-E)/drag,layoutRoll=random(),preset=Math.floor(layoutRoll*3),scatter=.06+.46*Math.pow(layoutRoll,1.3),phase=random()*TAU,phase2=random()*TAU,spread=(pattern==='gift-twinkle'?.30:.18)*scatter;
 const particles=GIFT_LAYOUT.map(([kind,color,px,py,diameter,angle],i)=>{
  const dx=(px-600)/500*radius,dy=(py-600)/500*radius;
  const xx=dx*Math.cos(rotation)-dy*Math.sin(rotation),yy=dx*Math.sin(rotation)+dy*Math.cos(rotation),life=3.20+random()*.40;
  return particle(x+(random()-.5)*3,y+(random()-.5)*3,(xx/E*(1+([1.04,.82,1.14][preset]-1)*scatter)*(1-spread+random()*spread*2)+Math.cos(Math.atan2(yy,xx))*Math.hypot(xx,yy)*scatter*(.17*Math.sin(2*Math.atan2(yy,xx)+phase)+.10*Math.sin(3*Math.atan2(yy,xx)+phase2))),(yy-driftY)/E*(1-spread+random()*spread*2)+Math.sin(phase+i*.7)*35*Math.sqrt(scale)*scatter,diameter/1000*radius*.64,life,color%5,random,{type:'charm',pattern,referenceGift:true,giftMaterial:{kind,color},tint:giftSurfaceColor(kind,color),angle:angle*Math.PI/180,spin:(random()-.5)*.9,drag,gravity:g,scale,luminosity:.55,trail:[],tailLength:0,delay:random()*.045,layoutPreset:preset,layoutScatter:scatter,
   giftSplitAt:null});
 });
 let finish=material;
 if(material==='random')finish=GIFT_RANDOM_MATERIALS[Math.floor(random()*GIFT_RANDOM_MATERIALS.length)];
 if(finish)for(const p of particles){const colors=GIFT_ASSETS[p.giftMaterial.kind];p.giftFinish=finish;if(material==='random')p.giftMaterial.color=colors[Math.floor(random()*colors.length)];p.tint=giftMaterialTint(p,finish);}
 return{particles,variant:0,finish};
}
export function giftBeadChildren(parent,random=Math.random){
 const count=4+Math.floor(random()*3),base=random()*TAU,scale=parent.scale||1;
 return Array.from({length:count},(_,i)=>{const a=base+i/count*TAU+(random()-.5)*.18,speed=(90+random()*65)*Math.sqrt(scale),color=i%2,life=.50+random()*.32;
  return particle(parent.x,parent.y,parent.vx*.40+Math.cos(a)*speed,parent.vy*.24+Math.sin(a)*speed,(5+random()**1.6*6.2)*Math.sqrt(scale),life,color,random,{pattern:parent.pattern,referenceGift:true,giftSpark:true,secondary:1,giftMaterial:{kind:'twinkle',color},tint:GIFT_BEAD_COLORS[color],giftSplitAt:null,scale,gravity:165*Math.sqrt(scale),drag:1.1,delay:random()*.09,tailLength:7,collisionDelay:.12,luminosity:.65,blinkOffset:random()*TAU});});
}
export function giftBeadEnvelope(p){const age=p.maxLife-p.life,fade=clamp(p.life/.22),pop=1-Math.exp(-age*45),twinkle=.30+.70*Math.pow(Math.max(0,Math.sin(age*31+p.blinkOffset)),5);return{alpha:fade*(.30+twinkle*.70),scale:pop*(.72+.28*twinkle)};}
// Soft outer rays and chromatic inner stars are curated pairs, sampled by shell.
export const CINEMA_PAIRS=Object.freeze([
 ['#FFC093','#FF761B'],['#F4AEC9','#F43D88'],['#D5BEED','#B847F1'],
 ['#B5DED6','#16D7AC'],['#F4CF97','#F752A2'],['#BDCDE6','#30BFE4']
]);
export const CINEMA_HUES=Object.freeze(CINEMA_PAIRS.map(p=>p[0]));
// Preserve the approved hues and trajectories; only the trail has stronger chroma.
export const CINEMA_TRAIL_HUES=Object.freeze(['#F68A30','#EC429A','#AB49EA','#16CFA9','#E9A82E','#389EDC']);
export const CINEMA_REPRISE_HUES=Object.freeze(['#13B9FF','#B1DE24','#FF3275','#A742F2','#FF891F']);
export const RING_HUES=Object.freeze(['#53C9F4','#C6DF57','#FF638B','#B765EE','#FFAA52']);
// A fast burning outer shell and a delayed, longer-lived inner strobe cloud.
// Both are emitted by one shell; the strobe cloud is not a separate second explosion.
// Unequal angular sectors produce close neighbours and wider empty arcs.
export function cinemaCarrierAngles(count,rotation,random=Math.random){
 const weights=Array.from({length:count},(_,i)=>[.42,.60,1.65,1.35,.40,.65,1.72,1.25][i%8]*(.85+random()*.30));
 for(let i=weights.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[weights[i],weights[j]]=[weights[j],weights[i]];}
 const total=weights.reduce((a,b)=>a+b,0);let edge=0;return weights.map(w=>{const angle=rotation+(edge+w*.20)*TAU/total;edge+=w;return angle;});
}
export function cinemaShell(pattern,x,y,scale=1,random=Math.random){
 const hue=Math.floor(random()*CINEMA_HUES.length),tint=CINEMA_HUES[hue],innerTint=CINEMA_PAIRS[hue][1],ringColor=Math.floor(random()*RING_HUES.length),particles=[],count=84,rotation=random()*TAU,carriers=11,carrierAngles=pattern==='cinema-rings'?cinemaCarrierAngles(carriers,rotation,random):[];
 for(let i=0;i<count;i++){
  const carrier=pattern==='cinema-rings'&&i<carriers,a=carrier?carrierAngles[i]:rotation+i*2.39996323+(random()-.5)*.10,z=(i+.5)/count*2-1,project=carrier?1:Math.sqrt(1-z*z),speed=carrier?(190+random()*175)*scale:(365+random()*165)*scale*(.65+.35*project),ux=Math.cos(a)*project,uy=Math.sin(a)*project;
  const life=1.40+random()*.30,seed=particle(x,y,ux*speed,uy*speed-9*scale,(2.15+random()*1.50)*Math.sqrt(scale),life,hue%5,random,{type:'ember',cinematic:true,pattern,tint,trailTint:CINEMA_TRAIL_HUES[hue],angle:a,gravity:70*Math.sqrt(scale),drag:.88+random()*.12,scale,tailLength:19,luminosity:.70+random()*.30,delay:random()*.015,ringSplitAt:carrier?.60+(i%3)*.08+random()*.50:null,ringColor,ringCarrier:carrier,rayOrigin:{x,y},carrierAngle:a});particles.push(seed);
  if(i%2===0)particles.push({...seed,seed:random()*100,vx:seed.vx*(.91+random()*.11)+Math.sin(a)*5,vy:seed.vy*(.92+random()*.10)+Math.cos(a)*5,size:seed.size*.44,life:seed.life*.85,maxLife:seed.life*.85,ringSplitAt:null,ringCarrier:false,filament:true});
 }
 // A delayed, clearly legible inner corolla, distinct from the fine strobe cloud.
 for(let i=0;i<48;i++){
  const a=rotation+i/48*TAU+(random()-.5)*.045,project=.83+random()*.17,speed=(235+random()*45)*scale,life=1.85+random()*.20;
  particles.push(particle(x,y,Math.cos(a)*speed*project,Math.sin(a)*speed*project-8*scale,(1.85+random()*.65)*Math.sqrt(scale),life,hue%5,random,{type:'ember',cinematic:true,innerRay:true,pattern,tint:innerTint,trailTint:innerTint,gravity:62*Math.sqrt(scale),drag:1.0,scale,tailLength:15,delay:.16+random()*.06,luminosity:.88,rayOrigin:{x,y}}));
 }
 // Equal-area directions fill a sphere instead of making a sparse peripheral ring.
 // Fine stars follow the rays, then continue twinkling after the long streaks burn out.
 for(let i=0;i<192;i++){
  const a=rotation+i*2.39996323+(random()-.5)*.18,z=(i+.5)/192*2-1,proj=Math.sqrt(1-z*z),speed=(230+random()*150)*scale,life=2.25+random()*.65;
  particles.push(particle(x+(random()-.5)*4,y+(random()-.5)*4,Math.cos(a)*speed*proj,Math.sin(a)*speed*proj,(1.35+random()*.95)*Math.sqrt(scale),life,hue%5,random,{type:'ember',cinematic:true,cinemaDust:true,snowStar:true,snowAnchor:i%8===0,pattern,tint:innerTint,gravity:45*Math.sqrt(scale),drag:.90,scale,tailLength:0,delay:.14+random()*.18,luminosity:.60+random()*.40}));
 }
 return{particles,variant:hue%5,tint};
}
export function cinemaRingChildren(parent,random=Math.random){
 const count=8+Math.floor(random()*3),phase=random()*TAU,color=parent.ringColor%RING_HUES.length,scale=parent.scale||1;
 return Array.from({length:count},(_,i)=>{
  // Restore the approved expansion; four-point lights later dissolve into round glints.
  const a=phase+i/count*TAU+(random()-.5)*.24,speed=(42+random()*36)*Math.sqrt(scale),life=2.45+random()*.55,r=2+random()*3;
  return particle(parent.x+Math.cos(a)*r,parent.y+Math.sin(a)*r,Math.cos(a)*speed+parent.vx*.22,Math.sin(a)*speed+parent.vy*.22,(4.8+random()*1.8)*Math.sqrt(scale),life,color,random,{type:'aura',cinematic:true,ringBlob:true,ringAnchor:i===0,ringStar:i%4===1,ringGroup:parent.seed,secondary:1,pattern:parent.pattern,tint:CINEMA_REPRISE_HUES[color],angle:a,spin:(random()-.5)*1.2,gravity:62*Math.sqrt(scale),drag:1.0+random()*.20,scale,tailLength:15,delay:random()*.10,collisionDelay:.1,luminosity:.55+random()*.45,erosionAt:.28+random()*.12,blinkRate:5+random()*6});
 });
}
export function ringEnvelope(p){const age=p.maxLife-p.life,t=clamp(age/p.maxLife);return{alpha:clamp(age/.055)*clamp(p.life/.65),scale:(.60+.40*clamp(age/.14))*(.9+.1*Math.sin(p.seed+age*9))};}
export function referencePattern(style,pattern){return style==='gift'?GIFT_PATTERNS.includes(pattern):(style==='cinema'&&[ORIGINAL_CINEMA_PATTERN,REFINED_CINEMA_PATTERN].includes(pattern))||(['cinema','glow'].includes(style)&&CINEMA_PATTERNS.includes(pattern));}
