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
// Start the next ascent during the previous flower's brief fade; its new burst
// still waits for the full rocket flight, rather than cutting the old particles.
export function flatLaunchBusy(world){
 if(world.rockets.length||world.launchers.length)return true;
 return world.particles.some(p=>p.life>0&&(p.flatEmitAt!=null||(!['dust','dash','ring'].includes(p.flatRole)&&!p.flatFine&&p.life>.58)));
}
