export const GIFT_MATERIALS=Object.freeze(['candy','soft-candy']);
export const GIFT_RANDOM_MATERIALS=Object.freeze(['candy','soft-candy']);
export const GIFT_MATERIAL_NAMES=Object.freeze({light:'轻彩',soft:'柔彩',candy:'糖果','soft-candy':'柔彩糖果'});
const colours={light:['#FFD44F','#9855DE','#F15E70','#518FDC','#D951B7','#F69B66'],soft:['#FFD43C','#4B72EB','#FF647E','#47D7E3','#ED48DA','#FF9967'],candy:['#FFB900','#D32CE9','#FF7708','#308CEC','#FF21A7','#FF9B0D']};
colours['soft-candy']=["#F4BE00", "#476FEC", "#FF5E79", "#06C5D5", "#F800DC", "#FF6113"];
export function giftMaterialTint(p,material='soft'){if(p.giftConfetti&&p.tint)return p.tint;if(material==='random')material=p.giftFinish||'candy';return colours[material]?.[p.giftMaterial?.color??p.variant]||p.tint||'#FFD98E';}
