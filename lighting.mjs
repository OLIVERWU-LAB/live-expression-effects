import {particleVisibility} from './particle-visibility.mjs?v=7838a126173a';
import {giftMaterialTint} from './gift-materials.mjs?v=7838a126173a';
import {clamp} from './core.mjs?v=7838a126173a';
import {emissionColor,hexRGB} from './emission.mjs?v=7838a126173a';

// At most five bounded area lights, shared by the halo and person-lighting passes.
// They remain alive with the sparks, rather than ending with the brief burst flash.
export function fireworkLights(world){
 if(world.effect!=='laugh')return[];
 if(['gift','flat'].includes(world.style))return materialLights(world);
 const digital=['cinema','glow'].includes(world.style);
 const groups=Array.from({length:5},(_,variant)=>({variant,x:0,y:0,weight:0,flash:0,rgb:[0,0,0]}));
 const add=(g,source,weight)=>{g.x+=source.x*weight;g.y+=source.y*weight;g.weight+=weight;const rgb=hexRGB(emissionColor(source,digital));for(let i=0;i<3;i++)g.rgb[i]+=rgb[i]*weight;};
 for(const p of world.particles){
  if(p.type==='drop'||p.delay>0||p.life<=0)continue;
  const age=Math.max(0,p.maxLife-p.life),remaining=clamp(p.life/p.maxLife);
  const weight=particleVisibility(p)*Math.pow(remaining,1.45)*Math.min(1,age*15+.12)*(p.luminosity??1);
  add(groups[p.variant%5],p,weight);
 }
 for(const b of world.blooms){const g=groups[b.variant%5],flash=Math.exp(-b.age*5)*.65;
  add(g,{...b,life:1,maxLife:1},flash*14);g.flash+=flash;
 }
 return groups.filter(g=>g.weight>.001).map(g=>({x:g.x/g.weight,y:g.y/g.weight,variant:g.variant,color:g.rgb.map(v=>v/g.weight),energy:clamp(g.weight/65+g.flash*.35,0,.82)}));
}

// Preserve coloured material reflections instead of averaging a whole multicolour
// bouquet into one grey source. Bright neutral launch seeds do not tint the person.
function materialLights(world){
 const groups=new Map();
 const add=(p,weight)=>{
  if(weight<=.0001||!p.tint)return;
  const rgb=hexRGB(p.tint),hi=Math.max(...rgb),lo=Math.min(...rgb),d=hi-lo;if(d/Math.max(hi,.001)<.22)return;
  let hue=hi===rgb[0]?((rgb[1]-rgb[2])/d+6)%6:hi===rgb[1]?(rgb[2]-rgb[0])/d+2:(rgb[0]-rgb[1])/d+4;
  const key=Math.round(hue/6*12)%12,g=groups.get(key)||{variant:key%5,x:0,y:0,weight:0,rgb:[0,0,0]};
  g.x+=p.x*weight;g.y+=p.y*weight;g.weight+=weight;for(let i=0;i<3;i++)g.rgb[i]+=rgb[i]*weight;groups.set(key,g);
 };
 for(const p of world.particles){
  if(p.type==='drop'||p.delay>0||p.life<=0||['seed','core'].includes(p.flatRole))continue;
  const age=p.maxLife-p.life,remaining=clamp(p.life/p.maxLife),sizeWeight=p.flatFine?.22:1;
  add(world.style==='gift'?{...p,tint:giftMaterialTint(p,world.giftMaterialStyle)}:p,particleVisibility(p)*Math.pow(remaining,1.3)*clamp(age/.08)*(p.luminosity??.5)*sizeWeight);
 }
 if(world.style==='gift')for(const b of world.blooms)add({...b,tint:'#FFCC32'},Math.exp(-b.age*6)*6);
 return [...groups.values()].sort((a,b)=>b.weight-a.weight).slice(0,5).map(g=>({x:g.x/g.weight,y:g.y/g.weight,variant:g.variant,color:g.rgb.map(v=>v/g.weight),energy:clamp(g.weight/(world.style==='gift'?10:40),0,.78)}));
}
