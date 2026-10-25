// Restored from v35 (69ee743), before the v36 handglow-inspired rewrite.
import {clamp} from './core.mjs?v=b71ed6cff27a';
const TAU=Math.PI*2;
function particle(x,y,vx,vy,size,life,variant,random,extra={}){return{type:'spark',x,y,vx,vy,size,life,maxLife:life,variant,angle:0,spin:0,touched:0,secondary:0,trail:[],trailClock:0,tailLength:20,collisionDelay:.65,seed:random()*100,gravity:70,drag:1.4,drift:0,delay:0,scale:1,luminosity:.8,...extra};}
export const CINEMA_PAIRS=Object.freeze([
 ['#FFC093','#FF761B'],['#F4AEC9','#F43D88'],['#D5BEED','#B847F1'],
 ['#B5DED6','#16D7AC'],['#F4CF97','#F752A2'],['#BDCDE6','#30BFE4']
]);
export const CINEMA_HUES=Object.freeze(CINEMA_PAIRS.map(p=>p[0]));
export const RING_HUES=Object.freeze(['#53C9F4','#C6DF57','#FF638B','#B765EE','#FFAA52']);
// A fast burning outer shell and a delayed, longer-lived inner strobe cloud.
// Both are emitted by one shell; the strobe cloud is not a separate second explosion.
function archivedShell(pattern,x,y,scale=1,random=Math.random){
 const hue=Math.floor(random()*CINEMA_HUES.length),tint=CINEMA_HUES[hue],innerTint=CINEMA_PAIRS[hue][1],ringColor=Math.floor(random()*RING_HUES.length),particles=[],count=84,rotation=random()*TAU,carriers=18;
 for(let i=0;i<count;i++){
  const carrier=pattern==='cinema-rings'&&i<carriers,a=carrier?rotation+i/carriers*TAU+(random()-.5)*.17:rotation+i*2.39996323+(random()-.5)*.10,z=(i+.5)/count*2-1,project=carrier?1:Math.sqrt(1-z*z),speed=carrier?(255+random()*65)*scale:(365+random()*165)*scale*(.65+.35*project),ux=Math.cos(a)*project,uy=Math.sin(a)*project;
  const life=1.40+random()*.30,seed=particle(x,y,ux*speed,uy*speed-9*scale,(2.15+random()*1.50)*Math.sqrt(scale),life,hue%5,random,{type:'ember',cinematic:true,pattern,tint,angle:a,gravity:70*Math.sqrt(scale),drag:.88+random()*.12,scale,tailLength:19,luminosity:.70+random()*.30,delay:random()*.015,ringSplitAt:carrier?.73+random()*.22:null,ringColor,ringCarrier:carrier,rayOrigin:{x,y},carrierAngle:a});particles.push(seed);
  if(i%2===0)particles.push({...seed,seed:random()*100,vx:seed.vx*(.91+random()*.11)+Math.sin(a)*5,vy:seed.vy*(.92+random()*.10)+Math.cos(a)*5,size:seed.size*.44,life:seed.life*.85,maxLife:seed.life*.85,ringSplitAt:null,ringCarrier:false,filament:true});
 }
 // A delayed, clearly legible inner corolla, distinct from the fine strobe cloud.
 for(let i=0;i<48;i++){
  const a=rotation+i/48*TAU+(random()-.5)*.045,project=.83+random()*.17,speed=(235+random()*45)*scale,life=1.85+random()*.20;
  particles.push(particle(x,y,Math.cos(a)*speed*project,Math.sin(a)*speed*project-8*scale,(1.85+random()*.65)*Math.sqrt(scale),life,hue%5,random,{type:'ember',cinematic:true,innerRay:true,pattern,tint:innerTint,gravity:62*Math.sqrt(scale),drag:1.0,scale,tailLength:15,delay:.16+random()*.06,luminosity:.88,rayOrigin:{x,y}}));
 }
 // Equal-area directions fill a sphere instead of making a sparse peripheral ring.
 // Fine stars follow the rays, then continue twinkling after the long streaks burn out.
 for(let i=0;i<192;i++){
  const a=rotation+i*2.39996323+(random()-.5)*.18,z=(i+.5)/192*2-1,proj=Math.sqrt(1-z*z),speed=(230+random()*150)*scale,life=2.25+random()*.65;
  particles.push(particle(x+(random()-.5)*4,y+(random()-.5)*4,Math.cos(a)*speed*proj,Math.sin(a)*speed*proj,(1.35+random()*.95)*Math.sqrt(scale),life,hue%5,random,{type:'ember',cinematic:true,cinemaDust:true,snowStar:true,pattern,tint:innerTint,gravity:45*Math.sqrt(scale),drag:.90,scale,tailLength:0,delay:.14+random()*.18,luminosity:.60+random()*.40}));
 }
 return{particles,variant:hue%5,tint};
}
function archivedChildren(parent,random=Math.random){
 const count=14+Math.floor(random()*3),phase=random()*TAU,color=parent.ringColor%RING_HUES.length,life=2.65+random()*.30,speed=(55+random()*15)*Math.sqrt(parent.scale||1);
 return Array.from({length:count},(_,i)=>{const a=phase+i/count*TAU+(random()-.5)*.11,r=3+random()*2;
  return particle(parent.x+Math.cos(a)*r,parent.y+Math.sin(a)*r,Math.cos(a)*speed+parent.vx*.28,Math.sin(a)*speed+parent.vy*.28,(2.9+random()*1.0)*Math.sqrt(parent.scale||1),life*(.9+random()*.1),color,random,{type:'aura',cinematic:true,ringBlob:true,ringGroup:parent.seed,secondary:1,pattern:parent.pattern,tint:RING_HUES[color],angle:a,spin:(random()-.5)*1.2,gravity:62*Math.sqrt(parent.scale||1),drag:.95,scale:parent.scale,tailLength:0,delay:random()*.035,collisionDelay:.1,luminosity:.85});});
}
export function ringEnvelope(p){const age=p.maxLife-p.life,t=clamp(age/p.maxLife);return{alpha:clamp(age/.055)*clamp(p.life/.65),scale:(.60+.40*clamp(age/.14))*(.9+.1*Math.sin(p.seed+age*9))};}

export const ORIGINAL_CINEMA_PATTERN='cinema-original';
export function originalCinemaShell(x,y,scale=1,random=Math.random){
 const shell=archivedShell('cinema-rings',x,y,scale,random);
 for(const p of shell.particles){p.classicCinema=true;p.pattern=ORIGINAL_CINEMA_PATTERN;}return shell;
}
export function originalCinemaChildren(parent,random=Math.random){return archivedChildren(parent,random).map(p=>({...p,classicCinema:true}));}
