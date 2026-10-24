/* Inference stays off the render thread. Assets persist in Cache Storage. */
importScripts('./vision-config.js?v=4f8722bd807f','./vision-pack.js?v=4f8722bd807f','./vision-download.js?v=4f8722bd807f');
let role='face';
const progress=phase=>postMessage({type:'progress',phase});
let faceModel = null, handModel = null, lastHands = -Infinity, segmenter = null, latestMask = null, lastSegment = -Infinity;
const nativeFetch = self.fetch.bind(self), cacheName = 'expression-assets-mp-0.10.21-v1';
let cacheHits = 0, cacheWrites = 0, cacheAvailable = true;
const bounded=(promise,ms,fallback)=>new Promise(resolve=>{const timer=setTimeout(()=>resolve(fallback),ms);Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value);},()=>{clearTimeout(timer);resolve(fallback);});});
async function cachedFetch(input, init) {
  const url = new URL(typeof input === 'string' ? input : input.url || String(input), self.location.href);
  if (!url.pathname.includes('/vendor/')) return nativeFetch(input, init);
  let cache;
  try { cache=await bounded(caches.open(cacheName),1200,null);
    let saved=cache?await bounded(cache.match(url.href),1200,null):null;
    if(!saved&&cache&&url.pathname.includes('/vendor/compressed/')){
      const name=url.pathname.split('/').pop().replace(/\.gz$/,'');
      if(self.VISION_PACK?.[name]){const alias=new URL('./vendor/'+(name.startsWith('vision_wasm_')?'wasm/':'')+name,self.location.href);saved=await bounded(cache.match(alias.href),1200,null);}
    }
    if(saved){cacheHits++;return saved;} } catch { cacheAvailable = false; }
  const response = await nativeFetch(input, init);
  if (response.ok && !response.redirected && cache) try { const copy=response.clone();cache.put(url.href,copy).then(()=>cacheWrites++,()=>{cacheAvailable=false;}); } catch { cacheAvailable=false; }
  return response;
}
self.fetch = cachedFetch;
const bytes=(url,phase)=>self.loadVisionAsset(url,cachedFetch,data=>postMessage({type:'progress',...data}),phase);
function copyMask(result) {
  const category = result.categoryMask;
  if (!category) return null;
  const source = category.getAsUint8Array(), width = 192, height = Math.max(1, Math.round(192 * category.height / category.width)), data = new Uint8Array(width * height), alpha = new Uint8Array(width * height);
  const labels = segmenter.getLabels();
  let person = labels.findIndex(s => /person|selfie|foreground/i.test(s));
  if (person < 0) person = 1;
  const confidenceMask = result.confidenceMasks?.[person], confidence = confidenceMask?.getAsFloat32Array();
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x, j = Math.min(category.height - 1, Math.floor(y / height * category.height)) * category.width + Math.min(category.width - 1, Math.floor(x / width * category.width));
    data[i] = source[j] === person ? 1 : 0;
    const k = confidence ? Math.min(confidenceMask.height - 1, Math.floor(y / height * confidenceMask.height)) * confidenceMask.width + Math.min(confidenceMask.width - 1, Math.floor(x / width * confidenceMask.width)) : 0;
    alpha[i] = confidence ? Math.round(Math.max(0, Math.min(1, confidence[k])) * 255) : data[i] * 255;
  }
  return { width, height, data, alpha };
}
async function initialize(requestedRole='face') {
  role=requestedRole;progress('runtime');
  if (faceModel) { postMessage({ type: 'ready', cached: true, segmentation: !!segmenter }); return; }
  const runtime = await bytes(self.VISION_ASSETS.runtime,'runtime');
  const url = URL.createObjectURL(new Blob([runtime], { type: 'application/javascript' }));
  self.exports = {}; self.module = { exports: self.exports };
  try { importScripts(url); } finally { URL.revokeObjectURL(url); }
  const api = self.module.exports;progress('wasm');const files = await api.FilesetResolver.forVisionTasks(self.VISION_ASSETS.wasm);
  // importScripts itself has no asynchronous cache hook, so its loader uses cached bytes.
  const loader = await bytes(files.wasmLoaderPath), loaderURL = URL.createObjectURL(new Blob([loader], { type: 'application/javascript' }));
  const [wasm,model]=await Promise.all([bytes(files.wasmBinaryPath,role==='face'?'download':'wasm'),role==='face'?bytes(self.VISION_ASSETS.model,'download'):Promise.resolve(null)]),wasmURL=URL.createObjectURL(new Blob([wasm],{type:'application/wasm'}));
  const localFiles={...files,wasmLoaderPath:loaderURL,wasmBinaryPath:wasmURL};
  try {
   if(role==='face'){
    progress('face-create');
    faceModel = await api.FaceLandmarker.createFromOptions(localFiles, { baseOptions: { modelAssetBuffer: model, delegate: 'CPU' }, runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true, minFaceDetectionConfidence: .55, minFacePresenceConfidence: .55, minTrackingConfidence: .55 });
    postMessage({ type: 'ready', cached: cacheHits > 0, cacheAvailable, cacheHits, cacheWrites });
    return;
   }
    // Auxiliary models run in a different worker. Their initialization can never
    // block the face worker's frame queue or expression readiness.
    progress('silhouette');
    try {
      const segmentationModel = await bytes(new URL('./vendor/selfie_segmenter.tflite', self.location.href).href);
      segmenter = await api.ImageSegmenter.createFromOptions(localFiles, { baseOptions: { modelAssetBuffer: segmentationModel, delegate: 'CPU' }, runningMode: 'VIDEO', outputCategoryMask: true, outputConfidenceMasks: true });
      postMessage({ type: 'segmentation-ready', labels: segmenter.getLabels(), cached: cacheHits > 0, cacheAvailable });
    } catch (error) { postMessage({ type: 'segmentation-error', message: String(error.message || error) }); }
    postMessage({type:'ready',geometry:true});
    progress('hands');
    // Hands are optional and isolated from expression inference.
    try {
      const handBytes = await bytes(new URL('./vendor/hand_landmarker.task', self.location.href).href);
      handModel = await api.HandLandmarker.createFromOptions(localFiles, {baseOptions:{modelAssetBuffer:handBytes,delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5});
      postMessage({type:'hands-ready',cacheHits,cacheWrites});
    } catch (error) { postMessage({type:'hands-error',message:String(error.message||error)}); }
  } finally { URL.revokeObjectURL(loaderURL);URL.revokeObjectURL(wasmURL); postMessage({type:'models-ready'}); }
}
self.onmessage = async ({ data }) => {
  if (data.type === 'init') { try { await initialize(data.role); } catch (error) { postMessage({ type: 'error', phase: 'init', message: String(error.message || error) }); } return; }
  if (data.type !== 'frame') return;
  const bitmap = data.bitmap;
  try {
    if(role==='face'&&!faceModel)throw new Error('Face model is not ready');
    const start = performance.now(), result = faceModel?faceModel.detectForVideo(bitmap,data.timestamp):{};
    const shapes = result.faceBlendshapes?.[0]?.categories || [], score = name => shapes.find(c => c.categoryName === name)?.score || 0;
    let mask = null;
    if (segmenter && data.timestamp - lastSegment >= 180) {
      try {
        segmenter.segmentForVideo(bitmap, data.timestamp, segmentation => { latestMask = copyMask(segmentation); });
        lastSegment = data.timestamp; mask = latestMask;
      } catch(error) {
        // Optional silhouette errors must not interrupt expression inference.
        try { segmenter.close(); } catch {}
        segmenter=null;latestMask=null;postMessage({type:'segmentation-error',message:String(error.message||error)});
      }
    }
    let hands = null;
    if(handModel && data.trackHands && data.timestamp-lastHands>=90){
      try { hands=handModel.detectForVideo(bitmap,data.timestamp).landmarks;lastHands=data.timestamp; }
      catch(error){handModel.close();handModel=null;postMessage({type:'hands-error',message:String(error.message||error)});hands=[];}
    }
    const message = { role, hands, frameId:data.frameId, type: 'result', timestamp: data.timestamp, inferenceMs: performance.now() - start, face: result.faceLandmarks?.[0] || null, smile: (score('mouthSmileLeft') + score('mouthSmileRight')) / 2, mask };
    postMessage(message, mask ? [mask.data.buffer, mask.alpha.buffer] : []);
    // The transferred array is owned by the main thread; never reuse it.
    if (mask) latestMask = null;
  } catch (error) { postMessage({ type: 'error', phase: 'frame', frameId:data.frameId, message: String(error.message || error) }); }
  finally { bitmap?.close(); }
};
