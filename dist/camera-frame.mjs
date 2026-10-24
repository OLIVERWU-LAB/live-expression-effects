// Some video/image-bitmap paths fail even when the camera itself is playing.
// Reuse one small 2D canvas only when direct video capture is unavailable.
export function cameraFrameReader(width=480,{bitmap=(...args)=>createImageBitmap(...args),canvas=(w,h)=>new OffscreenCanvas(w,h)}={}){
 let fallback=false,surface=null;
 return async video=>{
  if(!video.videoWidth||!video.videoHeight)throw new Error('Camera frame is not ready');
  const height=Math.max(1,Math.round(width*video.videoHeight/video.videoWidth));
  if(!fallback){try{return await bitmap(video,{resizeWidth:width,resizeHeight:height});}catch{fallback=true;}}
  if(!surface)surface=canvas(width,height);if(surface.width!==width)surface.width=width;if(surface.height!==height)surface.height=height;
  const g=surface.getContext('2d');if(!g)throw new Error('Camera frame conversion is unavailable');g.drawImage(video,0,0,width,height);
  return typeof surface.transferToImageBitmap==='function'?surface.transferToImageBitmap():bitmap(surface);
 };
}
