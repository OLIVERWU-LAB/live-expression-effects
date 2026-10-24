import {roundColor} from './dandelion.mjs?v=af1483e5221b';
// A visual interpretation of comet tails -> popping flowers -> crackling stars.
// Finite, staggered stages; never a recursive particle emitter.
export const BOUQUET_NAME='繁花爆闪';
function particle(x,y,variant,scale,random){const life=2.8+random()*.5;return {type:'star',starPoints:4+variant%3,x,y,vx:0,vy:0,size:7,life,maxLife:life,variant,scale,angle:random()*6.28,spin:(random()-.5)*2.2,touched:0,trail:[],trailClock:0,tailLength:28,seed:random()*100,gravity:160*Math.sqrt(scale),drag:.40,drift:(random()-.5)*7,delay:random()*.06,collisionDelay:.65,luminosity:.7,pattern:'bouquet',secondary:0,splitAt:null};}
export function bouquetShell(x,y,scale,random=Math.random){
 const particles=[],rotation=random()*6.28,count=11;
 for(let i=0;i<count;i++){
  const a=rotation+i/count*6.28+(random()-.5)*.27,speed=(165+random()*75)*scale;
  const p=particle(x,y,i%5,scale,random);Object.assign(p,{vx:Math.cos(a)*speed,vy:Math.sin(a)*speed*.70-55*scale,size:12+random()*5,carrier:true,splitAt:1.12+random()*.62});particles.push(p);
 }
 for(let i=0;i<27;i++){const a=random()*6.28,p=particle(x,y,i%5,scale,random),speed=(100+random()*115)*scale,life=.6+random()*.5;Object.assign(p,{vx:Math.cos(a)*speed,vy:Math.sin(a)*speed*.8,size:9+random()*6,life,maxLife:life,tailLength:15,drag:.8});particles.push(p);}
 return {particles,variant:Math.floor(random()*5)};
}
export function poppingFlower(parent,random=Math.random,{stars=14,sparks=19,mini=false,spread=1,lifeScale=1}={}){
 const particles=[],rotation=random()*6.28,scale=Math.sqrt(parent.scale||1);
 for(let i=0;i<stars;i++){
  const a=rotation+i/stars*6.28+(random()-.5)*.33,speed=(mini?32+random()*40:40+random()*66)*scale*spread,p=particle(parent.x,parent.y,(parent.variant+i)%5,parent.scale||1,random),life=(1.05+random()*.65)*lifeScale;
  Object.assign(p,{type:'spark',dot:true,roundColors:parent.roundColors,tint:roundColor(parent,parent.flowerCarrier?3:2),fireworkStage:parent.flowerCarrier?3:2,vx:parent.vx*.20+Math.cos(a)*speed,vy:parent.vy*.12+Math.sin(a)*speed*.85,size:mini?1.4+random()*1.1:1.8+random()*1.6,life,maxLife:life,secondary:1,tailLength:spread>1?28:15,drag:spread>1?.42:.85,gravity:(spread>1?58:86)*scale,collisionDelay:.22,delay:random()*.08});particles.push(p);
 }
 for(let i=0;i<sparks;i++){
  const a=random()*6.28,radius=(mini?8+random()*19:13+random()*37)*scale,p=particle(parent.x+Math.cos(a)*radius,parent.y+Math.sin(a)*radius,(parent.variant+i+2)%5,parent.scale||1,random),life=.45+random()*.65;
  Object.assign(p,{type:'spark',dot:true,roundColors:parent.roundColors,tint:roundColor(parent,parent.flowerCarrier?3:2),fireworkStage:parent.flowerCarrier?3:2,vx:Math.cos(a)*(13+random()*24),vy:10+random()*22,size:1+random()*1.2,life,maxLife:life,secondary:2,micro:true,trail:[],tailLength:4,gravity:48,drag:1.2,delay:.04+random()*.42,collisionDelay:.15});particles.push(p);
 }
 return particles;
}

// A whole crown ignites together: most seeds lie near the sphere silhouette,
// while a smaller population projects through its interior. This reads as a
// dandelion sphere rather than one tiny flower in the centre.
export function innerCrownParticles(parent,random=Math.random,count=100){
 const result=[],turn=random()*Math.PI*2,scale=parent.scale||1;
 for(let i=0;i<count;i++){
  const a=turn+i/count*Math.PI*2+(random()-.5)*.07,radial=i%5===0?.36+random()*.32:.84+random()*.16;
  const speed=(235+random()*42)*scale*radial,life=2.05+random()*.6,p=particle(parent.x,parent.y,i%5,scale,random),radius=9*scale*radial;
  Object.assign(p,{type:'spark',dot:true,x:parent.x+Math.cos(a)*radius,y:parent.y+Math.sin(a)*radius,
   vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,gravity:30*Math.sqrt(scale),drag:.32,size:2+random()*1.3,
   life,maxLife:life,secondary:1,fireworkStage:2,burstStage:2,roundColors:parent.roundColors,tint:roundColor(parent,2),
   tailLength:34,trail:[],trailClock:0,delay:random()*.025,collisionDelay:.65,luminosity:.78+random()*.2,pattern:parent.pattern});result.push(p);
 }
 return result;
}
