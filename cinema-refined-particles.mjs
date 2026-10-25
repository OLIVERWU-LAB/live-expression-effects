import{originalCinemaShell,originalCinemaChildren,CINEMA_PAIRS,RING_HUES}from'./cinema-original-particles.mjs?v=40500dfc15ea';
export const REFINED_CINEMA_PATTERN='cinema-refined';
// Restore the original colour family and its independent, whole-shell reprise colour.
// Reuse the original factory's choices so colour changes never alter motion randomness.
export const REFINED_CINEMA_PALETTES=Object.freeze(CINEMA_PAIRS.map(([outer,inner],i)=>Object.freeze({name:['橙金','玫红','紫色','青绿','金粉','青蓝'][i],outer,inner,dust:inner})));
export function refinedPaletteIndex(roll){return Math.min(REFINED_CINEMA_PALETTES.length-1,Math.floor(roll*REFINED_CINEMA_PALETTES.length));}
export function refinedCinemaShell(x,y,scale=1,random=Math.random,startedAt=0){
 let roll;const shell=originalCinemaShell(x,y,scale,()=>{const v=random();if(roll===undefined)roll=v;return v;}),index=refinedPaletteIndex(roll);
 for(const p of shell.particles){p.refinedCinema=true;p.pattern=REFINED_CINEMA_PATTERN;p.shellStartedAt=startedAt;p.refinedPalette=index;p.repriseTint=RING_HUES[p.ringColor];}return shell;
}
export function refinedDissolveStart(p){const phase=(seed,salt)=>.5+.5*Math.sin(seed*1.731+salt);return 2.05+.24*phase(p.ringGroup??p.seed,1.2)+.12*phase(p.seed,4.7);}
export function refinedCinemaChildren(parent,random=Math.random){
 const children=originalCinemaChildren(parent,random);return children.map((p,i)=>{const linger=.48+.22*(.5+.5*Math.sin(p.seed*1.73+(p.ringGroup||0)));return{...p,refinedCinema:true,shellStartedAt:parent.shellStartedAt??0,refinedPalette:parent.refinedPalette,tint:parent.repriseTint||p.tint,fragmentLinger:linger,ringAnchor:i===0||i===Math.floor(children.length/2),audioDissolveAt:i===0?refinedDissolveStart(p):null,life:p.life+linger,maxLife:p.maxLife+linger};});
}
