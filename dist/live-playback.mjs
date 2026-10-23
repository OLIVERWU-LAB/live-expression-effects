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
