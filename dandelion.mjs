export const PAPER_VARIANT_NAME='同色贴纸';
export const COLOR_PAIRS=Object.freeze([
 ['#F2C765','#73CBE8'],['#EF83AC','#F2D18B'],['#76D7BD','#BA9CE8'],
 ['#AB96ED','#82CDE8'],['#F1AC74','#F4D587']
]);
export function chooseColors(random=Math.random){return [...COLOR_PAIRS[Math.floor(random()*COLOR_PAIRS.length)]];}
// Both paper versions share geometry, materials, timing and staged emitters.
// Only 03 assigns a curated colour to each round; neutral printed outlines stay.
export function roundColor(parent,stage){return parent.roundColors?.[Math.min(stage-1,1)];}
export function stickerBurstEnvelope(age,life=.9){
 const t=Math.min(1,Math.max(0,age/Math.min(life,.30)));
 const expand=1-Math.pow(1-Math.min(1,t/.26),3),u=Math.max(0,(t-.62)/.38),collapse=u*u*(3-2*u);
 return {scale:(.08+1.12*expand+.10*t)*Math.pow(1-collapse,1.35),alpha:Math.min(1,t/.045)*(1-collapse),twist:.055*Math.sin(t*Math.PI)};
}
