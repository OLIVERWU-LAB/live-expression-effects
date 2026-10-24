// The live experience has three styles; historical variants are QA references only.
export const LIVE_STYLES=Object.freeze(['cinema','gift','flat']);
export const liveStyle=value=>LIVE_STYLES.includes(value)?value:'cinema';
export function applyLiveStyle(world,value){
 const style=liveStyle(value);world.setStyle(style);
 world.setPattern(style==='cinema'?'cinema-refined':style==='gift'?'gift-twinkle':'auto');
 return style;
}
export function lockedState(expression,lock,mode){
 return mode==='idle'?expression:lock==='rain'?'smile':lock==='fireworks'?'laugh':expression;
}
// Overlap the next ascent with live flowers. Admission stays bounded; no live
// structural particle is cleared to force the next bouquet.
export const flatLaunchGap=(random=Math.random)=>1400+random()*100;
export function flatLaunchBusy(world){
 // Count pressure used to make two quick launches followed by a long pause.
 // Keep the single-rocket/queued-emitter guard; particle admission stays in world.
 return !!world.rockets.length||!!world.pendingParticles?.some(p=>p.flatEmitAt!=null);
}

// Recover ordinary 12–20 FPS frame time with at most two physics slices.
// A long interruption never replays a backlog on return.
export function simulationSlices(gap,style){const elapsed=Math.max(0,Math.min(gap>250?.05:gap/1000,style==='flat'?.10:.05)),count=Math.max(1,Math.ceil(elapsed/.05));return Array(count).fill(elapsed/count);}
