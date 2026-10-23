const TAU=Math.PI*2;
export const HAND_COLORS=['#70CBFF','#D8ED65','#FF788D','#BD62FF','#FFAA55'];
function spark(x,y,vx,vy,size,life,color,random,extra={}){return{type:'ember',cinematic:true,handDrawn:true,x,y,vx,vy,size,life,maxLife:life,tint:color,variant:HAND_COLORS.indexOf(color),seed:random()*100,angle:random()*TAU,spin:(random()-.5)*.6,gravity:72,drag:1.25,trail:[],tailLength:0,delay:0,touched:0,collisionDelay:.18,scale:1,luminosity:.7,...extra};}
export function handRing(parent,random=Math.random,secondary=true){
 const scale=parent.scale||1,color=parent.tint,phase=random()*TAU,parts=[],count=12+Math.floor(random()*4);
 for(let i=0;i<count;i++){const a=phase+i/count*TAU+(random()-.5)*.12,v=(75+random()*22)*scale,life=1.35+random()*.28;
 parts.push(spark(parent.x,parent.y,Math.cos(a)*v+(parent.vx||0)*.20,Math.sin(a)*v+(parent.vy||0)*.20,(7+random()*4)*Math.sqrt(scale),life,color,random,{handRole:'lobe',ringBlob:true,ringGroup:parent.seed,secondary:secondary?1:0,scale,delay:random()*.025,gravity:54,drag:1.3,pattern:parent.pattern}));}
 for(let i=0;i<13;i++){const a=phase+i*2.39996,v=(80+random()*80)*scale;parts.push(spark(parent.x,parent.y,Math.cos(a)*v,Math.sin(a)*v,1.3+random()*2,1.2+random()*.7,color,random,{handRole:'cinder',secondary:secondary?1:0,scale,delay:.12+random()*.14,pattern:parent.pattern}));}
 return parts;
}
export function handShell(pattern,x,y,scale=1,random=Math.random){
 const variant=Math.floor(random()*5),tint=HAND_COLORS[variant],parent={x,y,scale:scale*1.4,tint,seed:random()*100,pattern},particles=handRing(parent,random,false),phase=random()*TAU;
 for(let i=0;i<10;i++){const a=phase+i/10*TAU,v=(185+random()*70)*scale;particles.push(spark(x,y,Math.cos(a)*v,Math.sin(a)*v,5+random()*3,1.8+random()*.35,tint,random,{handRole:i%3===0?'star':'comet',scale,tailLength:i%3===0?0:7,gravity:90,drag:1.05,pattern,handSplitAt:pattern==='cinema-rings'&&i%2===0?.48+random()*.18:null}));}
 for(let i=0;i<28;i++){const a=phase+i*2.39996,v=(65+random()*170)*scale;particles.push(spark(x,y,Math.cos(a)*v,Math.sin(a)*v,1+random()*2.3,1.4+random()*.65,tint,random,{handRole:i%8===0?'star':'cinder',scale,delay:.08+random()*.18,pattern}));}
 return{particles,variant,tint};
}
