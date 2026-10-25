import {planBurst} from './pyro.mjs?v=d9a23e4fa6e4';
import {fitFlatViewport} from './flat-budget.mjs?v=d9a23e4fa6e4';
import {flatLaunchBusy,flatLaunchGap} from './live-playback.mjs?v=d9a23e4fa6e4';
import {flatViewportScale} from './flat-placement.mjs?v=d9a23e4fa6e4';

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
 if(layout)layout.launchX=launchX;
 return layout;
}
