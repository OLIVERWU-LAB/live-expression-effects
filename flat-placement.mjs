import{flatShell}from'./flat-fireworks.mjs?v=40500dfc15ea';
import{boundsDistance}from'./pyro.mjs?v=40500dfc15ea';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const flatRandom=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
// Size follows the viewport, never the current head position or launch side.
export const flatViewportScale=(width,height)=>width<650&&height>width?Math.min(.72,width/850):Math.min(1.2,width/1400,height/850);

// Predict the actual moving carriers, rather than bending radial vectors
// towards whatever space remains when they explode. All live cascades share
// this carrier choreography; only their later flower components differ.
export function flatFlowerSites(scale,seed,spreadScale=scale){
 return flatShell(0,0,scale,flatRandom(seed),'flat-medallion',spreadScale).particles.map(p=>{
  let x=0,y=0,vx=p.vx,vy=p.vy,t=0;
  while(t<p.flatEmitAt){if(t>.12&&Math.hypot(vx,vy)<=p.flatStopSpeed)break;const dt=Math.min(1/120,p.flatEmitAt-t),drag=Math.exp(-p.drag*dt);vy=(vy+p.gravity*dt)*drag;vx*=drag;x+=vx*dt;y+=vy*dt;t+=dt;}
  return{x,y,vx,vy,flowerScale:p.flowerScale||1};
 });
}
export const flatSiteGap=(head,width,height)=>width<650&&height>width?clamp((head.right-head.left)*.24,34,52):clamp((head.right-head.left)*.26,52,84);
export function flatSitesClear(sites,x,y,scale,head,width,height){return !head||sites.every(p=>boundsDistance(x+p.x,y+p.y,head)>=flatSiteGap(head,width,height)+35*scale*p.flowerScale);}
export function placeFlatBouquet(layout,width,height,head){
 if(!head)return layout;
 const portrait=width<650&&height>width,cx=(head.left+head.right)/2,zone=layout?.zone||'above',requestedSide=layout?.requestedSide,side=requestedSide==='left'?-1:requestedSide==='right'?1:zone==='left'?-1:zone==='right'?1:0;
 const seed=(Math.imul(Math.round((layout?.x??width/2)*1013),1664525)^Math.round((layout?.launchX??layout?.y??height/4)*337))>>>0;
 const fixed=layout?.flatFixedScale,nominal=portrait?Math.min((layout?.scale??.75)*1.12,width/475,.9):Math.min(layout?.scale??1,width/980,height/620,1.25),gap=flatSiteGap(head,width,height);
 const targetX=portrait?cx+side*width*.09:side<0?head.left*.48:side>0?(head.right+width)*.5:cx,targetY=portrait?head.top*.34:head.top*.58;
 // A small, bounded search runs only once per launch, never per animation frame.
 for(let step=0;step<16;step++){
  const scale=fixed??Math.max(.22,nominal*Math.pow(.9,step)),spreadScale=fixed?Math.max(fixed*.82,fixed*Math.pow(.9,step)):scale;let best=null;
  for(let variant=0;variant<(fixed&&step===0?32:8);variant++){
   const flatSeed=(seed+Math.imul(variant,2654435761))>>>0,sites=flatFlowerSites(scale,flatSeed,spreadScale),edge=16+32*scale;
   const sideEdge=p=>16+200*scale*.78*p.flowerScale;
   const minX=Math.max(...sites.map(p=>sideEdge(p)-p.x)),maxX=Math.min(...sites.map(p=>width-sideEdge(p)-p.x)),minY=Math.max(...sites.map(p=>edge-p.y)),maxY=Math.min(...sites.map(p=>(portrait?Math.min(height*.58,head.top+(head.bottom-head.top)*.28):height*.62)-edge-p.y));
   if(maxX<minX||maxY<minY)continue;
   const xs=Array.from({length:9},(_,i)=>minX+(maxX-minX)*i/8),ys=Array.from({length:9},(_,i)=>minY+(maxY-minY)*i/8);
   xs.push(clamp(targetX,minX,maxX));ys.push(clamp(head.top-Math.max(...sites.map(p=>p.y+gap+(portrait?65:90)*scale*p.flowerScale)),minY,maxY));
   for(const x of xs)for(const y of ys){
    // Compact carrier spacing before moving a left launch to the right sky (or vice versa).
    if(fixed&&requestedSide&&!layout.flatAllowOpposite&&(x-width*.5)*side<0)continue;
    const clearance=layout?.clearance??gap;if(boundsDistance(x,y,head)<clearance+6)continue;
    if(sites.some(p=>boundsDistance(x+p.x,y+p.y,head)<gap+(fixed?35:portrait?65:90)*scale*p.flowerScale))continue;
    // Preserve the complete size. Prefer the launch side, but move the whole
    // bouquet into clear sky when that side is occupied instead of shrinking it.
    const sidePenalty=fixed&&requestedSide&&(x-cx)*side<0?.35:0;
    const crowding=fixed?sites.reduce((sum,p)=>sum+Math.max(0,1-boundsDistance(x+p.x,y+p.y,head)/(gap+(portrait?65:90)*scale*p.flowerScale)),0)/sites.length:0;
    const score=Math.hypot((x-targetX)/width,(y-targetY)/height)+variant*.002+sidePenalty+crowding*.7;
    if(!best||score<best.score)best={...layout,x,y,scale,radius:scale*205,zone,flatSeed,flatSpreadScale:spreadScale,flatPlacement:true,clearance,score};
   }
  }
  if(best){delete best.score;return best;}
  if(scale===.22)break;
 }
 // If the requested half is physically occupied, use free sky and move the
 // launch origin with it; never connect opposite corners with a diagonal.
 if(fixed&&requestedSide&&!layout.flatAllowOpposite)return placeFlatBouquet({...layout,flatAllowOpposite:true},width,height,head);
 return null;
}
