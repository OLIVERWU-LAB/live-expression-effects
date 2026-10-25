import {planBurst} from './pyro.mjs?v=40500dfc15ea';
import {fitFlatViewport} from './flat-budget.mjs?v=40500dfc15ea';
import {flatLaunchBusy,flatLaunchGap} from './live-playback.mjs?v=40500dfc15ea';
import {flatViewportScale} from './flat-placement.mjs?v=40500dfc15ea';

// The camera experience and answer previews use the same launch policy. Locks
// change the expression input, never the show cadence or physical time scale.
export const fireworkLaunchBusy=world=>world.style==='flat'?flatLaunchBusy(world):world.rockets.length>0;
export const fireworkLaunchGap=(style,random=Math.random)=>style==='cinema'?1500+random()*160:style==='flat'?flatLaunchGap(random):1750+random()*200;
export function planLiveFirework(world,width,height,head,index,random=Math.random){
 const requestedSide=index%2===0?'left':'right',direction=requestedSide==='left'?-1:1;
 const plan=planBurst(width,height,head,index,random);if(!plan)return null;
 const edge=Math.max(24,width*.10),launchX=direction<0?edge:width-edge;
 plan.launchX=launchX;plan.requestedSide=requestedSide;
 if(world.style==='flat')plan.flatFixedScale=flatViewportScale(width,height);
 const layout=world.style==='flat'?fitFlatViewport(plan,width,height,head):plan;
 if(layout){
  // Align the ascent with its selected apex; never shoot across the screen.
  const drift=Math.min(width*.16,(height+22-layout.y)*.25);
  layout.launchX=world.style==='flat'?Math.max(layout.x-drift,Math.min(layout.x+drift,launchX)):launchX;
 }
 return layout;
}
