import{placeFlatBouquet}from'./flat-placement.mjs';
// Sample around each circle, separately for every flower and radial band.
// Never remove a carrier: that would remove an entire future blossom.
const isRadial=a=>a.length>0&&a.every(p=>p.flatRadialCount>1&&p.flatRadialIndex!=null);
const sample=(a,n)=>{
 if(n>=a.length)return a;if(!n)return[];
 const selected=Array.from({length:n},(_,i)=>a[Math.floor(i*a.length/n)]);
 if(!isRadial(a))return selected;
 // Rebuild the admitted ring at exactly 360/n degrees. Odd counts (e.g. 7 or
 // 11 stars) cannot be preserved by selecting only opposite pairs/divisors.
 const first=[...a].sort((p,q)=>p.flatRadialIndex-q.flatRadialIndex)[0],phase=Math.atan2(first.vy,first.vx);
 for(let i=0;i<selected.length;i++){const p=selected[i],angle=phase+i/n*Math.PI*2,speed=Math.hypot(p.vx,p.vy);p.vx=Math.cos(angle)*speed;p.vy=Math.sin(angle)*speed;p.angle=angle;p.flatRadialIndex=i;p.flatRadialCount=n;}
 return selected;
};
const previousEvenCount=(count,target)=>{let n=Math.min(count,target);while(n>1&&(n%2||count%n))n--;return Math.max(1,n);};
const primaryCount=(p,length,density)=>{
 if(density<.3){const minimum={'flat-medallion':[3,3,3],'flat-star-crown':[4,5,4],'flat-festival':[5,3,3]};return Math.min(length,minimum[p.pattern]?.[p.flatBand]??3);}
 const oldCount=p.flatBaseCount,oldMinimum=p.pattern==='flat-star-crown'&&p.outerGlints?oldCount:Math.min(6,oldCount),oldVisible=previousEvenCount(oldCount,Math.max(oldMinimum,Math.round(oldCount*density)));
 return Math.min(length,Math.round(oldVisible*4/3));
};
const key=p=>[p.emitterId??'opening',p.clusterIndex??'opening',p.flatRole,p.flatBand??(p.petalLayer|| (p.innerPetal?2:1)),!!p.crownSatellite,(p.flatMobile||p.flatRadialIndex!=null)?(p.flatTailSpark?'tail':p.whiteFlash?'white':'color'):'',p.openingFlash?'flash':p.openingGlint?'glint':''].join(':');
const groupsOf=particles=>{const groups=new Map();for(const p of particles){const k=key(p);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p);}return [...groups.values()];};
const minimumForGroup=g=>{
 const p=g[0],density=p.flatDensity??1,low=density<.3,constrained=density<.7;
 if(isRadial(g)){
  if(p.flatTargetCount!=null)return Math.min(g.length,p.flatTargetCount);
  if(p.flatFine)return p.whiteFlash?(constrained?1:2):0;
  return constrained?0:2;
 }
 return p.flatMobile&&p.whiteFlash?Math.min(g.length,3):1;
};
export function prioritizeFlat(particles,budget){
 const emitters=particles.filter(p=>p.flatEmitAt!=null),rest=particles.filter(p=>p.flatEmitAt==null);
 if(emitters.length>=budget)return emitters;
 const all=groupsOf(rest).sort((a,b)=>((a[0].flatRole==='ring'?0:a[0].flatFine||a[0].flatRole==='dust'?2:1)-(b[0].flatRole==='ring'?0:b[0].flatFine||b[0].flatRole==='dust'?2:1))),room=Math.min(rest.length,Math.max(0,budget-emitters.length));if(!all.length)return emitters;
 // A ring and every radial band get an explicit slot before density detail.
 const reserve=all.map(minimumForGroup),reserved=reserve.reduce((a,b)=>a+b,0);
 const minimum=reserved<=room?reserve:all.map((g,i)=>i<room?1:0),used=minimum.reduce((a,b)=>a+b,0);
 const counts=all.map((g,i)=>minimum[i]+Math.floor((room-used)*(g.length-minimum[i])/Math.max(1,rest.length-used)));
 for(let i=0,n=room-counts.reduce((a,b)=>a+b,0);n>0;i=(i+1)%all.length)if(counts[i]<all[i].length){counts[i]++;n--;}
 return [...emitters,...all.flatMap((g,i)=>sample(g,counts[i]))];
}
export function thinFlat(particles){
 const density=particles[0]?.flatDensity??1;if(density>=1)return particles;
 return groupsOf(particles).flatMap(g=>{
  const p=g[0];if(p.flatEmitAt!=null)return g;
  if(p.flatTargetCount!=null){const count=primaryCount(p,g.length,density);for(const q of g)q.flatTargetCount=count;return sample(g,count);}
  const detail=p.flatRole==='dust'||p.flatFine||p.crownSatellite;
  const importantFlash=p.flatMobile&&p.whiteFlash;
  // Reserve room for the later flowers' future inner layers and ending glints.
  // Taking eight petals per ring on a 150-slot device fills it before the later flowers.
  const low=p.flatMobile&&density<.3;
  const minimum=p.pattern==='flat-star-crown'&&p.outerGlints?Math.min(g.length,density<.3?4:8):importantFlash?(p.flatTailSpark?2:low?3:6):p.flatRole==='petal'?(low?(p.petalLayer===3?3:p.innerPetal?4:6):(p.petalLayer===3?6:8)):['comet','ribbon','leaf','spoke','star'].includes(p.flatRole)?(p.crownSatellite?2:Math.min(low?4:6,g.length)):1;
  return sample(g,Math.min(g.length,Math.max(isRadial(g)?Math.max(2,minimum):minimum,Math.round(g.length*(detail&&!importantFlash?density*density:density)))));
 });
}
export function fitFlatViewport(layout,width,height,head){
 if(head)return placeFlatBouquet(layout,width,height,head);
 if(layout?.flatFixedScale)return{...layout,scale:layout.flatFixedScale,radius:layout.flatFixedScale*205};
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

// Reserve capacity for the later flowers and the overlapping next volley.
// One early flower must not consume 70% of the entire shared pool.
export function flatBirthBudget(particles,limit,share){
 const flowers=new Set(particles.filter(p=>p.cascadeChild).map(p=>`${p.emitterId}:${p.clusterIndex}`));
 if(flowers.size){const required=groupsOf(particles.filter(p=>p.flatEmitAt==null)).reduce((n,g)=>n+minimumForGroup(g),0);return Math.max(required,Math.floor(limit*(limit<500?.06:.10))*flowers.size);}
 if(particles.some(p=>p.cascade))return Math.max(5,Math.floor(limit*.13));
 if(particles.some(p=>p.flatTailSpark))return Math.max(2,Math.floor(limit*.025));
 return Math.floor(limit*share);
}
