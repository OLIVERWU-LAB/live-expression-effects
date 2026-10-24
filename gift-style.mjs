import {particleVisibility} from './particle-visibility.mjs?v=2adad563e72b';
import {clamp} from './core.mjs?v=2adad563e72b';
import {selectedGiftShape} from './gift-shapes.mjs?v=2adad563e72b';
export const GIFT_COLORS=Object.freeze(['#FFCC32','#853DDD','#E94355','#367DD9','#CE36A6']);
export const GIFT_KINDS=Object.freeze(['star','bead','ring','ribbon','coil','sparkle','drop','popper','capsule']);
export function giftMaterial(p){
 if(p.giftMaterial)return selectedGiftShape(p.giftMaterial);
 if(p.type==='drop')return{kind:'drop',color:0};
 if(p.secondary)return{kind:'bead',color:p.variant%5};
 const slot=Math.floor(Math.abs(p.seed||0)*10)%20;
 const kind=slot<11?'star':slot<14?'bead':slot<16?'ring':slot<18?'ribbon':'coil';
 return selectedGiftShape({kind,color:kind==='star'?(slot%5===0?3:slot%5===1?2:0):p.variant%5});
}
export function giftSplash(children,random=Math.random){return children.map(p=>{
 const life=.24+random()*.12;return{...p,giftSplash:true,life,maxLife:life,size:p.size*.75,vx:p.vx*.65,vy:p.vy*.65,spin:p.spin*.4,touched:1,generation:1,gravity:0};
});}
export function giftSplashEnvelope(p){const t=clamp(p.life/p.maxLife);return{alpha:t**1.25,scale:.45+.55*t};}
export function giftFlashEnvelope(age){const t=clamp(age/.52);return{alpha:Math.min(1,t/.07)*(1-t)**.7,scale:(1-Math.exp(-t*16))*Math.pow(Math.max(0,1-t),.32)};}

export const GIFT_PREP=.26;
// Popper mouth is the launch anchor; the cone slides down after the payload has left.
export function giftPopperEnvelope(age){
 const rise=clamp(age/.25),drop=clamp((age-.43)/.32);
 const eased=1-(1-rise)**3;
 return{offset:(1-eased)*230+drop*drop*230,alpha:1-clamp((age-.64)/.15),scale:.9+.1*eased,done:age>=.80};
}

export function giftLaunchOrigin(preferredX,targetX,width,height,head){
 // Launch the capsule directly from below the frame, with no cone or preparatory pause.
 return{x:clamp(preferredX,24,width-24),y:height+28};
}

export function giftConfetti(parent,random=Math.random){
 const palette=['#FFCF49','#A96AEF','#FF6D91','#55CBE9','#F38CD4'],n=parent.hitNormal||{x:0,y:-1};
 return Array.from({length:5},(_,i)=>{const a=(i/4-.5)*2.25+(random()-.5)*.25,nx=n.x*Math.cos(a)-n.y*Math.sin(a),ny=n.x*Math.sin(a)+n.y*Math.cos(a),v=85+random()*100,life=.78+random()*.30;
 return {type:'charm',referenceGift:true,giftConfetti:true,secondary:1,pattern:parent.pattern,x:parent.x,y:parent.y,vx:nx*v+parent.vx*.16,vy:ny*v+Math.max(0,parent.vy)*.12,size:(2.5+random()*2.4)*Math.sqrt(parent.scale||1),life,maxLife:life,angle:random()*6.28,spin:(random()-.5)*9,flutter:7+random()*7,seed:random()*100,tint:palette[(i+Math.floor(parent.seed))%5],variant:i,scale:parent.scale||1,gravity:180,drag:1.4,drift:(random()-.5)*20,trail:[],tailLength:0,delay:0,touched:1,hasCollided:true,collisionBorn:true,hitAge:0,hitRegion:parent.hitRegion,luminosity:.38};});
}
export function drawGiftConfetti(g,p){const t=p.maxLife-p.life,fade=particleVisibility(p)*clamp(p.life/.30),w=p.size*(.18+.82*Math.abs(Math.cos(t*p.flutter+p.seed))),h=p.size*(1.25+.5*Math.sin(p.seed));g.save();g.translate(p.x,p.y);g.rotate(p.angle);g.globalAlpha=fade;g.fillStyle=p.tint;g.beginPath();g.moveTo(-w,-h);g.quadraticCurveTo(0,-h*.72,w,-h);g.lineTo(w,h);g.quadraticCurveTo(0,h*.72,-w,h);g.closePath();g.fill();g.restore();}
