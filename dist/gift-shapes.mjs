// Live gift shapes retain the original simulation slots.
export const GIFT_RETAINED_SHAPES=Object.freeze(['star','bead','ring','ribbon','coil','sparkle','fourstar','cube','triangle','cylinder','wave']);
export function selectedGiftShape(material){
 if(material.sourceKind==='ribbon'){const {sourceKind,...rest}=material;return {...rest,kind:'ribbon'};}
 return material;
}
