import {clamp,collide} from './core.mjs?v=8acdb352c57c';
import {burstIsSafe} from './pyro.mjs?v=8acdb352c57c';
// Supplement the person mask with the tracked hair/head envelope. A swept
// ellipse test catches thin or delayed segmentation edges, including fast stars.
export function withHeadCollider(body,head){
 if(!head)return body;const cx=(head.left+head.right)/2,cy=(head.top+head.bottom)/2,rx=Math.max(1,(head.right-head.left)/2),ry=Math.max(1,(head.bottom-head.top)/2);
 return{collide(p,old){
  const other={...p},bodyHit=body?.collide?body.collide(other,old):collide(other,old,body),pad=8+Math.min(5,(p.size||0)*.20),ex=rx+pad,ey=ry+pad;
  const ox=(old.x-cx)/ex,oy=(old.y-cy)/ey,dx=(p.x-old.x)/ex,dy=(p.y-old.y)/ey,A=dx*dx+dy*dy,B=2*(ox*dx+oy*dy),C=ox*ox+oy*oy-1;
  let t=null;if(C<=0)t=0;else if(A>1e-10){const D=B*B-4*A*C;if(D>=0){const root=(-B-Math.sqrt(D))/(2*A);if(root>=0&&root<=1)t=root;}}
  if(t===null){if(bodyHit){Object.assign(p,other);p.hitRegion='body';}return !!bodyHit;}
  let hx=old.x+(p.x-old.x)*t,hy=old.y+(p.y-old.y)*t;
  if(C<0){const ux=(hx-cx)/ex,uy=(hy-cy)/ey,len=Math.hypot(ux,uy);hx=cx+(len>1e-5?ux/len:0)*ex;hy=cy+(len>1e-5?uy/len:-1)*ey;}
  if(bodyHit&&Math.hypot(other.x-old.x,other.y-old.y)<Math.hypot(hx-old.x,hy-old.y)){Object.assign(p,other);p.hitRegion='body';return true;}
  let nx=(hx-cx)/(ex*ex),ny=(hy-cy)/(ey*ey),len=Math.hypot(nx,ny)||1;nx/=len;ny/=len;
  p.x=hx+nx*3;p.y=hy+ny*3;p.hitNormal={x:nx,y:ny};p.hitRegion='head';const dot=p.vx*nx+p.vy*ny;if(dot<0){p.vx-=1.72*dot*nx;p.vy-=1.72*dot*ny;}return true;
 }};
}
// Keep the original ascent unchanged. At its apex, a moving head may have
// occupied the originally clear sky; choose the nearest clear detonation point.
export function resolveBurstPoint(r,head,w,h){
 const gap=r.clearance??84;if(!head||burstIsSafe({x:r.tx,y:r.ty,clearance:gap},head))return{x:r.tx,y:r.ty};
 const x=clamp(r.tx,head.left,head.right),y=clamp(r.ty,head.top,head.bottom),dx=r.tx-x,dy=r.ty-y,d=Math.hypot(dx,dy),candidates=[];
 if(d>1e-4)candidates.push({x:x+dx/d*(gap+3),y:y+dy/d*(gap+3)});
 candidates.push({x:r.tx,y:head.top-gap-3},{x:head.left-gap-3,y:r.ty},{x:head.right+gap+3,y:r.ty});
 return candidates.filter(p=>p.x>=18&&p.x<=w-18&&p.y>=20&&p.y<=h*.70&&burstIsSafe({...p,clearance:gap},head)).sort((a,b)=>Math.hypot(a.x-r.tx,a.y-r.ty)-Math.hypot(b.x-r.tx,b.y-r.ty))[0]||null;
}
