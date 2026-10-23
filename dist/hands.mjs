import {clamp,coverPoint,pointInPolygon,collide} from './core.mjs';

const FINGERS=[[0,1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
const distance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
function hull(points){
  const sorted=[...points].sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),lower=[],upper=[];
  for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
  for(const p of sorted.reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
  return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
function capsule(a,b,r){const angle=Math.atan2(b.y-a.y,b.x-a.x),points=[];for(let i=0;i<=4;i++){const t=angle-Math.PI/2+i*Math.PI/4;points.push({x:b.x+Math.cos(t)*r,y:b.y+Math.sin(t)*r});}for(let i=0;i<=4;i++){const t=angle+Math.PI/2+i*Math.PI/4;points.push({x:a.x+Math.cos(t)*r,y:a.y+Math.sin(t)*r});}return points;}
const bounds=points=>({left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))});

// A filled palm plus separate finger capsules, with no cupped/open/orientation gate.
// This supplements segmentation; it does not turn the whole hand into a convex blob.
export class HandCollider {
  constructor(landmarks,vw,vh,width,height){
    this.shapes=[];this.fingers=[];this.palms=[];this.count=0;
    for(const raw of (landmarks||[]).slice(0,2)){
      if(raw.length!==21||raw.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))continue;
      const pts=raw.map(p=>coverPoint(p,vw,vh,width,height)),span=Math.hypot(pts[5].x-pts[17].x,pts[5].y-pts[17].y),length=Math.hypot(pts[0].x-pts[9].x,pts[0].y-pts[9].y);
      if(Math.max(span,length)<8)continue;
      const radius=clamp(Math.max(span*.075,length*.055),3,13),palm=hull([0,1,2,5,9,13,17].map(i=>pts[i]));
      if(palm.length>=3){this.palms.push(palm);this.shapes.push({points:palm,bounds:bounds(palm)});}
      for(const indices of FINGERS)for(let i=1;i<indices.length;i++){
        const a=pts[indices[i-1]],b=pts[indices[i]],r=radius*(1-i/(indices.length+2)*.30),points=capsule(a,b,r);
        this.fingers.push({a,b,r});this.shapes.push({points,bounds:bounds(points)});
      }
      this.count++;
    }
  }
  contains(x,y){const p={x,y};return this.palms.some(poly=>pointInPolygon(p,poly))||this.fingers.some(f=>distance(p,f.a,f.b)<=f.r);}
  collide(p,old){
    let best=null,travel=Infinity;
    const left=Math.min(old.x,p.x),right=Math.max(old.x,p.x),top=Math.min(old.y,p.y),bottom=Math.max(old.y,p.y);
    for(const s of this.shapes){const b=s.bounds;if(right<b.left||left>b.right||bottom<b.top||top>b.bottom)continue;
      const hit={...p};if(collide(hit,old,s.points)){const d=Math.hypot(hit.x-old.x,hit.y-old.y);if(d<travel){travel=d;best=hit;}}
    }
    if(!best)return false;Object.assign(p,best);return true;
  }
  boundaryPoints(){return this.shapes.flatMap(s=>s.points);}
}

export function withHands(body,hands){
  if(!hands?.count)return body;
  return{collide(p,old){
    // Resolve the earliest hit when a fast particle crosses both a hand and body.
    const hand={...p},other={...p},h=hands.collide(hand,old),b=body?.collide?body.collide(other,old):collide(other,old,body);
    if(!h&&!b)return false;
    Object.assign(p,h&&(!b||Math.hypot(hand.x-old.x,hand.y-old.y)<Math.hypot(other.x-old.x,other.y-old.y))?hand:other);return true;
  }};
}
