import {clamp} from './core.mjs?v=718cb088c5cf';
import {mixHex} from './emission.mjs?v=718cb088c5cf';
// Flux through the top and upstream edge keeps a slanted rain field filled.
export function lineRainEntry(width,height,depth,roll){
 const vx=145+depth*90,vy=440+depth*280,leftShare=vx*height/(vy*Math.max(1,width)+vx*height);
 return roll<leftShare?{x:-24,y:-45+roll/leftShare*(height+45),vx,vy}:{x:(roll-leftShare)/(1-leftShare)*width,y:-45,vx,vy};
}
export const lineRainCoverage=(width,height)=>1+(145+.675*90)*height/((440+.675*280)*Math.max(1,width));
export const FLAT_RAIN_COLORS=Object.freeze(['#42C9DE','#50D0E1','#38BED8','#69D9E6','#49C7DD']);
export const portraitRainScale=(style,width,height)=>width<650&&height>width?(style==='flat'?.60:style==='gift'?.75:1):1;
// Two visible contact droplets, born outside the resolved surface; never recurse.
export function contactRain(parent,random=Math.random,style='gift'){
 const line=style==='cinema'||style==='glow',n=parent.hitNormal||{x:0,y:-1};
 const result=Array.from({length:2},(_,i)=>{const side=i?1:-1,a=side*(.65+random()*.22),nx=n.x*Math.cos(a)-n.y*Math.sin(a),ny=n.x*Math.sin(a)+n.y*Math.cos(a),speed=(line?120:95)+random()*55,life=line?.36+random()*.16:.34+random()*.10;
  return {...parent,x:parent.x+nx*6,y:parent.y+ny*6,vx:nx*speed,vy:ny*speed,size:parent.size*(line?.35:.44+random()*.12),volume:0,life,maxLife:life,generation:1,touched:1,noRecollision:true,hasCollided:true,hitAge:0,contactSpray:true,gravity:line?520:580,drag:line?.6:1.9,angle:Math.atan2(nx,-ny),spin:0,trail:[],tailLength:0,trailClock:0,rainLength:0,rainTone:(parent.rainTone??0)+i};});
 if(line)result.push({...parent,x:parent.x,y:parent.y,vx:0,vy:0,size:14+random()*9,life:.40,maxLife:.40,generation:1,touched:1,noRecollision:true,hasCollided:true,hitAge:0,rainRipple:true,gravity:0,drag:0,trail:[],tailLength:0,volume:0});
 return result;
}
export function drawLineRain(g,p,style='cinema'){
 const age=p.maxLife-p.life,fade=clamp(p.life/(p.contactSpray?.20:.15));g.save();g.globalCompositeOperation='source-over';g.lineCap='round';g.strokeStyle='#E8F7FF';g.globalAlpha=fade*(p.rainRipple?.32:.55+(p.depth||.5)*.35);g.lineWidth=p.contactSpray?.85:(.55+(p.depth||.5)*.85)*(style==='cinema'&&!p.rainRipple?1.7:1);
 g.beginPath();
 if(p.rainRipple){g.ellipse(p.x,p.y,p.size*(.18+age*2),p.size*(.04+age*.22),0,0,Math.PI*2);g.stroke();}
 else if(p.contactSpray){
  // A contact bead has no long-streak fallback, even on its very first frame.
  const r=p.size*(.55+.45*clamp(p.life/.16));g.fillStyle='#DDF5FF';g.ellipse(p.x,p.y,Math.max(.65,r*.48),Math.max(.8,r*.76),Math.atan2(p.vy,p.vx)-Math.PI/2,0,Math.PI*2);g.fill();
 }else{const speed=Math.hypot(p.vx,p.vy)||1,len=p.rainLength||35;g.moveTo(p.x-p.vx/speed*len,p.y-p.vy/speed*len);g.lineTo(p.x,p.y);g.stroke();}
 g.restore();
}
export function drawFlatRain(g,p){
 const r=p.size,fade=clamp(p.life/.25),base=FLAT_RAIN_COLORS[(p.rainTone??p.variant)%5],shape=p.dropShape??p.variant%3,width=[1,.86,1.10][shape];
 g.save();g.translate(p.x,p.y);g.rotate(p.angle);g.globalAlpha=fade*(p.rainVariant==='soft'?.62:1);
 const round=p.flatRound||p.generation>0,age=p.maxLife-p.life,squash=.22*Math.exp(-age*7)*Math.cos(age*18);
 g.beginPath();if(round)g.ellipse(0,0,r*(.76+squash),r*(.76-squash*.65),0,0,Math.PI*2);else{g.moveTo(0,-r);g.bezierCurveTo(-r*.25*width,-r*.2,-r*.65*width,r*.2,-r*.48*width,r*.6);g.bezierCurveTo(-r*.28*width,r*1.08,r*.60*width,r*.86,r*.48*width,r*.28);g.bezierCurveTo(r*.37*width,-r*.16,r*.12*width,-r*.65,0,-r);}g.closePath();
 if(p.rainVariant==='hollow'){g.strokeStyle=mixHex(base,'#FFFFFF',.32);g.lineWidth=Math.max(.85,r*.065);g.stroke();}
 else{
  const body=g.createLinearGradient(-r*.4,-r*.4,r*.55,r*.8);body.addColorStop(0,mixHex(base,'#FFFFFF',.22));body.addColorStop(.48,base);body.addColorStop(1,mixHex(base,'#28AECA',.22));g.fillStyle=body;g.fill();g.strokeStyle='#F6FCFFCF';g.lineWidth=Math.max(.6,r*.045);g.stroke();
  g.strokeStyle='#FFFFFFB8';g.lineWidth=Math.max(.65,r*.09);g.lineCap='round';g.beginPath();if(round)g.arc(-r*.07,-r*.04,r*.43,Math.PI*1.02,Math.PI*1.55);else{g.moveTo(-r*.15*width,-r*.22);g.quadraticCurveTo(-r*.38*width,r*.06,-r*.30*width,r*.28);}g.stroke();
 }
 g.restore();
}

// Portrait needs a floor independent of its narrow width; retain desktop rates.
export function rainRate(style,width,height,strength){
 const digital=['cinema','glow'].includes(style),gift=style==='gift',portrait=height>width&&width<650;
 const base=clamp(width/(digital?28:gift?24:34),10,digital?100:gift?75:45);
 return Math.max(base,portrait?(digital?84:gift?38:82):0)*(gift?1.4:digital?lineRainCoverage(width,height)*1.20:1.15)*(.75+strength*.6);
}
