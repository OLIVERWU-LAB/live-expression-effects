import{flatShell}from'./flat-fireworks.mjs?v=0581627ae3b8';
import{boundsDistance}from'./pyro.mjs?v=0581627ae3b8';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const flatRandom=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);

// Predict the five actual moving carriers, rather than bending radial vectors
// towards whatever space remains when they explode. All live cascades share
// this carrier choreography; only their later flower components differ.
export function flatFlowerSites(scale,seed){
 return flatShell(0,0,scale,flatRandom(seed),'flat-medallion').particles.map(p=>{
  let x=0,y=0,vx=p.vx,vy=p.vy,t=0;
  while(t<p.flatEmitAt){if(t>.12&&Math.hypot(vx,vy)<=p.flatStopSpeed)break;const dt=Math.min(1/120,p.flatEmitAt-t),drag=Math.exp(-p.drag*dt);vy=(vy+p.gravity*dt)*drag;vx*=drag;x+=vx*dt;y+=vy*dt;t+=dt;}
  return{x,y,vx,vy,flowerScale:p.flowerScale||1};
 });
}
export const flatSiteGap=(head,width,height)=>width<650&&height>width?clamp((head.right-head.left)*.24,34,52):clamp((head.right-head.left)*.26,52,84);
export function flatSitesClear(sites,x,y,scale,head,width,height){return !head||sites.every(p=>boundsDistance(x+p.x,y+p.y,head)>=flatSiteGap(head,width,height)+35*scale*p.flowerScale);}
export function placeFlatBouquet(layout,width,height,head){
 if(!head)return layout;
 const portrait=width<650&&height>width,cx=(head.left+head.right)/2,zone=layout?.zone||'above',side=zone==='left'?-1:zone==='right'?1:0;
 const seed=(Math.imul(Math.round((layout?.x??width/2)*1013),1664525)^Math.round((layout?.launchX??layout?.y??height/4)*337))>>>0;
 const nominal=portrait?Math.min((layout?.scale??.75)*1.12,width/475,.9):Math.min(layout?.scale??1,width/980,height/620,1.25),gap=flatSiteGap(head,width,height);
 const targetX=portrait?cx+side*width*.09:zone==='left'?head.left*.48:zone==='right'?(head.right+width)*.5:cx,targetY=portrait?head.top*.34:head.top*.58;
 // A small, bounded search runs only once per launch, never per animation frame.
 for(let step=0;step<16;step++){
  const scale=Math.max(.22,nominal*Math.pow(.9,step));let best=null;
  for(let variant=0;variant<8;variant++){
   const flatSeed=(seed+Math.imul(variant,2654435761))>>>0,sites=flatFlowerSites(scale,flatSeed),edge=16+(portrait?120:60)*scale;
   const minX=Math.max(...sites.map(p=>edge-p.x-Math.min(0,p.vx*.55))),maxX=Math.min(...sites.map(p=>width-edge-p.x-Math.max(0,p.vx*.55))),minY=Math.max(...sites.map(p=>edge-p.y-Math.min(0,p.vy*.55))),maxY=Math.min(...sites.map(p=>(portrait?Math.min(height*.58,head.top+(head.bottom-head.top)*.28):height*.62)-edge-p.y));
   if(maxX<minX||maxY<minY)continue;
   const xs=Array.from({length:9},(_,i)=>minX+(maxX-minX)*i/8),ys=Array.from({length:9},(_,i)=>minY+(maxY-minY)*i/8);
   xs.push(clamp(targetX,minX,maxX));ys.push(clamp(head.top-Math.max(...sites.map(p=>p.y+gap+65*scale*p.flowerScale)),minY,maxY));
   for(const x of xs)for(const y of ys){
    const clearance=layout?.clearance??gap;if(boundsDistance(x,y,head)<clearance+6)continue;
    if(sites.some(p=>boundsDistance(x+p.x,y+p.y,head)<gap+65*scale*p.flowerScale))continue;
    const score=Math.hypot((x-targetX)/width,(y-targetY)/height)+variant*.002;
    if(!best||score<best.score)best={...layout,x,y,scale,radius:scale*205,zone,flatSeed,flatPlacement:true,clearance,score};
   }
  }
  if(best){delete best.score;return best;}
  if(scale===.22)break;
 }
 return null;
}
