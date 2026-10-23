// Keep historical simulation slots; 04 ribbon is restored in v34.
export const GIFT_RETAINED_SHAPES=Object.freeze(['star','bead','ring','ribbon','coil','sparkle','fourstar','cube','triangle','cylinder','wave']);
export function selectedGiftShape(material){
 if(material.sourceKind==='ribbon'){const {sourceKind,...rest}=material;return {...rest,kind:'ribbon'};}
 return material;
}
export function activeGiftAssets(archived){return archived;}
export function giftAssetPath(material,kind,color){
 if(material==='soft-candy'){
  if(['drop','popper','capsule'].includes(kind))return `./assets/gift-v32/soft/${kind}-${color}.png`;
  return `./assets/gift-v37/soft-candy/${kind}-${color}.png`;
 }
 const rotating=['star','ring','ribbon','coil','sparkle','fourstar','cube','triangle','cylinder','wave'].includes(kind);
 return `./assets/gift-${rotating?'v34':'v32'}/${material}/${kind}-${color}.png`;
}
