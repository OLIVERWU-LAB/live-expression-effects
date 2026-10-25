import test from'node:test';import assert from'node:assert/strict';import{OriginalCinemaRenderer}from'../dist/cinema-original-renderer.mjs';import{RefinedCinemaRenderer,refinedRayLook}from'../dist/cinema-refined-renderer.mjs';
function strokes(renderer,p,width=2,color='#F4AEC9',continuous=false,hotMix=.57){let a,b;const result=[],g={beginPath(){},moveTo(x,y){a=[x,y];},lineTo(x,y){b=[x,y];},stroke(){result.push({a,b,width:this.lineWidth,alpha:this.globalAlpha,color:this.strokeStyle});}};renderer.beam(g,p,color,.8,width,continuous,hotMix);return result;}
const particle={x:100,y:100,maxLife:1.6,seed:3,trail:Array.from({length:12},(_,i)=>({x:95-i*7,y:100+i*.3}))};
test('before gaps start, refined traces retain the original sampled geometry and luminance with requested width and tint adjustments',()=>{
 for(const filament of[false,true])for(const width of[.7,2,4]){const p={...particle,filament,life:1.4};const look=refinedRayLook(p,'#F4AEC9',width),old=strokes(new OriginalCinemaRenderer(),p,look.width,look.color,false,look.hotMix),current=strokes(new RefinedCinemaRenderer(),p,width);assert.ok(old.length>0);assert.deepEqual(current,old);}
});
test('late flame tails retain paired coloured/hot strokes and finite fading geometry',()=>{
 for(const filament of[false,true])for(const seed of[1,3,17,48]){const p={...particle,filament,seed,life:.35},after=strokes(new RefinedCinemaRenderer(),p);assert.ok(after.length>0);assert.equal(after.length%2,0);for(const s of after){assert.ok([...s.a,...s.b,s.width,s.alpha].every(Number.isFinite));assert.ok(s.alpha>=0&&s.alpha<=1);}}
});
