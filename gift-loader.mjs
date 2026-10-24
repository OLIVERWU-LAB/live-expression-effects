// Limit concurrent decodes. Mobile atlases keep all poses at a smaller decoded
// resolution; on-screen shape/size/material stay the same.
export async function loadGiftBank(entries,tileSize=0,load=loadGiftImage){
 const images=new Map();let next=0,error=null;
 const run=async()=>{while(!error&&next<entries.length){const entry=entries[next++];try{images.set(entry.key,await load(entry.url,tileSize));}catch(e){error=e;}}};
 await Promise.all(Array.from({length:Math.min(4,entries.length)},run));
 if(error){for(const image of images.values())image.close?.();throw error;}return images;
}
export async function loadGiftImage(url,tileSize=0){
 if(tileSize&&typeof createImageBitmap==='function'){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{
   const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error('Gift asset HTTP '+response.status);
   const blob=await response.blob(),header=new DataView(await blob.slice(0,24).arrayBuffer());
   if(header.byteLength<24||header.getUint32(0)!==0x89504e47)throw new Error('Invalid gift atlas');
   const width=header.getUint32(16),height=header.getUint32(20),target=Math.min(tileSize,height);
   return await createImageBitmap(blob,{resizeHeight:target,resizeWidth:Math.round(width/height*target),resizeQuality:'high'});
  }finally{clearTimeout(timer);}
 }
 return new Promise((resolve,reject)=>{
  const image=new Image(),timer=setTimeout(()=>{image.onload=image.onerror=null;image.src='';reject(new Error('Gift asset loading timed out'));},30000);
  image.onload=()=>{clearTimeout(timer);resolve(image);};image.onerror=()=>{clearTimeout(timer);reject(new Error('Gift asset unavailable'));};image.src=url;
 });
}
