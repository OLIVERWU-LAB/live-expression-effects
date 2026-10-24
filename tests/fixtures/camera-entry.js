// Preserve the first explicit tap while the application module graph downloads.
(()=>{
 const button=document.getElementById('start-camera'),label=button.textContent;let intent=false,request=null,audioContext=null,claimed=false,active=true;
 const tap=()=>{if(!active)return;intent=true;button.textContent='正在开启…';button.disabled=true;
  if(!request&&globalThis.isSecureContext&&navigator.mediaDevices?.getUserMedia&&window.Worker&&window.createImageBitmap&&window.OffscreenCanvas){try{request=navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:24,max:30}}});request.catch(()=>{});}catch(error){request=Promise.reject(error);request.catch(()=>{});}}
  // Preserve the same first user gesture for optional sound, after requesting camera.
  try{const Context=window.AudioContext||window.webkitAudioContext;if(Context&&localStorage.getItem('expression-sound')!=='off'){audioContext=new Context({latencyHint:'interactive'});audioContext.resume().catch(()=>{});}}catch{}
 };
 button.addEventListener('click',tap);
 window.__cameraEntry={get audioContext(){return audioContext;},take(){claimed=true;const value=request;request=null;return value;},ready(start){active=false;button.removeEventListener('click',tap);if(intent){button.textContent=label;button.disabled=false;start();}}};
 window.addEventListener('pagehide',()=>{if(!claimed){request?.then(stream=>stream.getTracks().forEach(track=>track.stop()),()=>{});audioContext?.close().catch(()=>{});}},{once:true});
})();
