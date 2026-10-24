// Sample around each circle, separately for every flower and radial band.
// Never remove a carrier: that would remove an entire future blossom.
const sample=(a,n)=>n>=a.length?a:n?Array.from({length:n},(_,i)=>a[Math.floor(i*a.length/n)]):[];
const key=p=>[p.clusterIndex??'opening',p.flatRole,p.flatBand??(p.petalLayer|| (p.innerPetal?2:1)),!!p.crownSatellite].join(':');
const groupsOf=particles=>{const groups=new Map();for(const p of particles){const k=key(p);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p);}return [...groups.values()];};
export function prioritizeFlat(particles,budget){
 const emitters=particles.filter(p=>p.flatEmitAt!=null),rest=particles.filter(p=>p.flatEmitAt==null);
 if(emitters.length>=budget)return emitters;
 const all=groupsOf(rest),room=Math.min(rest.length,Math.max(0,budget-emitters.length));if(!all.length)return emitters;
 const counts=all.map(g=>Math.floor(room*g.length/Math.max(1,rest.length)));
 for(let i=0,n=room-counts.reduce((a,b)=>a+b,0);n>0;i=(i+1)%all.length)if(counts[i]<all[i].length){counts[i]++;n--;}
 return [...emitters,...all.flatMap((g,i)=>sample(g,counts[i]))];
}
export function thinFlat(particles){
 const density=particles[0]?.flatDensity??1;if(density>=1)return particles;
 return groupsOf(particles).flatMap(g=>{
  const p=g[0];if(p.flatEmitAt!=null)return g;
  const detail=p.flatRole==='dust'||p.flatFine||p.crownSatellite;
  const minimum=p.flatRole==='petal'?(p.petalLayer===3?6:8):['comet','ribbon','leaf','spoke','star'].includes(p.flatRole)?(p.crownSatellite?2:Math.min(6,g.length)):1;
  return sample(g,Math.min(g.length,Math.max(minimum,Math.round(g.length*(detail?density*density:density)))));
 });
}
export function fitFlatViewport(layout,width,height){
 if(!layout||width>=650||height<=width)return layout;
 const horizontal=Math.max(8,Math.min(layout.x,width-layout.x)-12),above=Math.max(8,layout.y-16);
 return{...layout,scale:Math.min(layout.scale,horizontal/500,above/330)};
}
// A portrait composition needs five complete small flowers, not a desktop
// bouquet cropped by the top of the screen. Only carrier velocities change.
export function fitPortraitFlowers(shell,viewport,head){
 if(!viewport||viewport.width>=650||viewport.height<=viewport.width)return;
 const {width:w,height:h}=viewport,seeds=shell.particles.filter(p=>p.flatRole==='seed');if(seeds.length!==5)return;
 const sky=Math.max(96,Math.min(h*.32,(head?.top??h*.30)-12)),radius=Math.max(20,Math.min(w*.085,sky*.23));
 const xs=[.50,.17,.83,.32,.68],ys=[.26,.32,.32,.72,.72];
 for(let i=0;i<seeds.length;i++){
  const p=seeds[i];p.drag=12;p.flatStopSpeed=0;const T=p.flatEmitAt,tx=w*xs[i],ty=Math.max(radius+10,sky*ys[i]),d=p.drag||0,E=d?(1-Math.exp(-d*T))/d:T;
  const gravityShift=d?p.gravity*(T-E)/d:.5*p.gravity*T*T;
  p.vx=(tx-p.x)/E;p.vy=(ty-p.y-gravityShift)/E;
  p.scale=p.cascade?radius/(100*(p.flowerScale||1)):Math.pow(radius/88,2);p.size=Math.max(1.5,3.2*Math.sqrt(p.scale));
 }
}
