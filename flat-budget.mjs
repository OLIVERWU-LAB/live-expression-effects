import{placeFlatBouquet}from'./flat-placement.mjs?v=503ad3f29326';
// Sample around each circle, separately for every flower and radial band.
// Never remove a carrier: that would remove an entire future blossom.
const sample=(a,n)=>n>=a.length?a:n?Array.from({length:n},(_,i)=>a[Math.floor(i*a.length/n)]):[];
const key=p=>[p.clusterIndex??'opening',p.flatRole,p.flatBand??(p.petalLayer|| (p.innerPetal?2:1)),!!p.crownSatellite,p.flatMobile?(p.flatTailSpark?'tail':p.whiteFlash?'white':'color'):''].join(':');
const groupsOf=particles=>{const groups=new Map();for(const p of particles){const k=key(p);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p);}return [...groups.values()];};
export function prioritizeFlat(particles,budget){
 const emitters=particles.filter(p=>p.flatEmitAt!=null),rest=particles.filter(p=>p.flatEmitAt==null);
 if(emitters.length>=budget)return emitters;
 const all=groupsOf(rest),room=Math.min(rest.length,Math.max(0,budget-emitters.length));if(!all.length)return emitters;
 const reserve=all.map(g=>g[0].flatMobile?Math.min(g.length,g[0].whiteFlash?4:1):0),reserved=reserve.reduce((a,b)=>a+b,0);
 const counts=reserved<=room?all.map((g,i)=>reserve[i]+Math.floor((room-reserved)*(g.length-reserve[i])/Math.max(1,rest.length-reserved))):all.map(g=>Math.floor(room*g.length/Math.max(1,rest.length)));
 for(let i=0,n=room-counts.reduce((a,b)=>a+b,0);n>0;i=(i+1)%all.length)if(counts[i]<all[i].length){counts[i]++;n--;}
 return [...emitters,...all.flatMap((g,i)=>sample(g,counts[i]))];
}
export function thinFlat(particles){
 const density=particles[0]?.flatDensity??1;if(density>=1)return particles;
 return groupsOf(particles).flatMap(g=>{
  const p=g[0];if(p.flatEmitAt!=null)return g;
  const detail=p.flatRole==='dust'||p.flatFine||p.crownSatellite;
  const importantFlash=p.flatMobile&&p.whiteFlash;
  // Reserve room for all five flowers' future inner layers and ending glints.
  // Taking eight petals per ring on a 150-slot device fills it before flower 5.
  const low=p.flatMobile&&density<.3;
  const minimum=importantFlash?(p.flatTailSpark?2:low?3:6):p.flatRole==='petal'?(low?(p.petalLayer===3?3:p.innerPetal?4:6):(p.petalLayer===3?6:8)):['comet','ribbon','leaf','spoke','star'].includes(p.flatRole)?(p.crownSatellite?2:Math.min(low?4:6,g.length)):1;
  return sample(g,Math.min(g.length,Math.max(minimum,Math.round(g.length*(detail&&!importantFlash?density*density:density)))));
 });
}
export function fitFlatViewport(layout,width,height,head){
 if(head)return placeFlatBouquet(layout,width,height,head);
 if(!layout||width>=650||height<=width)return layout;
 // Fit the entire radial composition once. The distance from an individual
 // edge must not collapse the launch or redirect the five carriers afterwards.
 const cx=head?(head.left+head.right)/2:width*.5,side=layout.zone==='left'?-1:layout.zone==='right'?1:0;
 const x=Math.max(width*.30,Math.min(width*.70,cx+side*width*.10));
 // Reserve sky for the five moving centres AND their radial blossoms, rather
 // than placing the core just above the forehead. Never redirect a live seed.
 const skyBottom=head?Math.max(68,head.top-26):Math.min(height*.35,width*.68);
 const ceiling=head?head.top-(layout.clearance??32)-8:height*.30;
 const y=Math.max(24,Math.min((24+skyBottom)*.5+12,ceiling));
 const spread=350-90*Math.max(0,Math.min(1,(skyBottom-124)/90)),scale=Math.min(layout.scale*1.12,width/475,Math.max(.30,(skyBottom-20)/spread));
 return{...layout,x,y,scale};
}
// Keep the same radial vectors, braking, sizes and staggered birth times as PC.
// Only tiny white details get a CSS-pixel visibility floor on a narrow portrait.
export function markPortraitFlat(shell,viewport){
 if(!viewport||viewport.width>=650||viewport.height<=viewport.width)return;
 for(const p of shell.particles){p.flatMobile=true;if(p.whiteFlash)p.size=Math.max(p.size,p.flatTailSpark?1.35:1.15);}
}
