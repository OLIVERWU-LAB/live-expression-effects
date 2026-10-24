// Preserve carriers/core emitters first. Sampling them out removes whole future
// flower layers; retiring already visible petals makes a low-budget show blink.
const sample=(a,n)=>n?Array.from({length:n},(_,i)=>a[Math.floor(i*a.length/n)]):[];
export function prioritizeFlat(particles,budget){
 const emitters=particles.filter(p=>p.flatEmitAt!=null),rest=particles.filter(p=>p.flatEmitAt==null);
 if(emitters.length>budget)return emitters; // The five structural carriers are bounded.
 const groups=new Map();for(const p of rest){const key=p.flatRole||'other';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}
 const room=Math.min(rest.length,Math.max(0,budget-emitters.length)),picked=[];
 const all=[...groups.values()],counts=all.map(g=>Math.floor(room*g.length/Math.max(1,rest.length)));
 for(let i=0,n=room-counts.reduce((a,b)=>a+b,0);n>0;i=(i+1)%all.length)if(counts[i]<all[i].length){counts[i]++;n--;}
 all.forEach((g,i)=>picked.push(...sample(g,counts[i])));return [...emitters,...picked];
}
export function thinFlat(particles){
 const density=particles[0]?.flatDensity??1;if(density>=1)return particles;
 return prioritizeFlat(particles,Math.max(particles.filter(p=>p.flatEmitAt!=null).length,Math.ceil(particles.length*density)));
}
// Five blossoms occupy more space than the launch radius. Fit the complete
// composition on portrait screens without moving its centre or changing timing.
export function fitFlatViewport(layout,width,height){
 if(!layout||width>=650||height<=width)return layout;
 const horizontal=Math.max(8,Math.min(layout.x,width-layout.x)-12),above=Math.max(8,layout.y-16);
 return{...layout,scale:Math.min(layout.scale,horizontal/500,above/330)};
}
