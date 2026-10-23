/* Inference stays off the render thread. Assets persist in Cache Storage. */
importScripts('./vision-config.js');
let faceModel = null, handModel = null, lastHands = -Infinity, segmenter = null, latestMask = null, lastSegment = -Infinity;
const nativeFetch = self.fetch.bind(self), cacheName = 'expression-assets-mp-0.10.21-v1';
let cacheHits = 0, cacheWrites = 0, cacheAvailable = true;
async function cachedFetch(input, init) {
  const url = new URL(typeof input === 'string' ? input : input.url || String(input), self.location.href);
  if (!url.pathname.includes('/vendor/')) return nativeFetch(input, init);
  let cache;
  try { cache = await caches.open(cacheName); const saved = await cache.match(url.href); if (saved) { cacheHits++; return saved; } } catch { cacheAvailable = false; }
  const response = await nativeFetch(input, init);
  if (response.ok && !response.redirected && cache) try { await cache.put(url.href, response.clone()); cacheWrites++; } catch { cacheAvailable = false; }
  return response;
}
self.fetch = cachedFetch;
async function bytes(url) { const r = await cachedFetch(url); if (!r.ok) throw new Error(`Asset HTTP ${r.status}`); return new Uint8Array(await r.arrayBuffer()); }
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
async function initialize() {
  if (faceModel) { postMessage({ type: 'ready', cached: true, segmentation: !!segmenter }); return; }
  const runtime = await bytes(self.VISION_ASSETS.runtime);
  const url = URL.createObjectURL(new Blob([runtime], { type: 'application/javascript' }));
  self.exports = {}; self.module = { exports: self.exports };
  try { importScripts(url); } finally { URL.revokeObjectURL(url); }
  const api = self.module.exports, files = await api.FilesetResolver.forVisionTasks(self.VISION_ASSETS.wasm);
  // importScripts itself has no asynchronous cache hook, so its loader uses cached bytes.
  const loader = await bytes(files.wasmLoaderPath), loaderURL = URL.createObjectURL(new Blob([loader], { type: 'application/javascript' }));
  const localFiles = { ...files, wasmLoaderPath: loaderURL };
  const model = await bytes(self.VISION_ASSETS.model);
  try {
    faceModel = await api.FaceLandmarker.createFromOptions(localFiles, { baseOptions: { modelAssetBuffer: model, delegate: 'CPU' }, runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true, minFaceDetectionConfidence: .55, minFacePresenceConfidence: .55, minTrackingConfidence: .55 });
    postMessage({ type: 'ready', cached: cacheHits > 0, cacheAvailable, cacheHits, cacheWrites });
    // Load the small silhouette model after expression inference is available.
    try {
      const segmentationModel = await bytes(new URL('./vendor/selfie_segmenter.tflite', self.location.href).href);
      segmenter = await api.ImageSegmenter.createFromOptions(localFiles, { baseOptions: { modelAssetBuffer: segmentationModel, delegate: 'CPU' }, runningMode: 'VIDEO', outputCategoryMask: true, outputConfidenceMasks: true });
      postMessage({ type: 'segmentation-ready', labels: segmenter.getLabels(), cached: cacheHits > 0, cacheAvailable });
    } catch (error) { postMessage({ type: 'segmentation-error', message: String(error.message || error) }); }
    // Hands share the same runtime, but never block the first camera picture or face readiness.
    try {
      const handBytes = await bytes(new URL('./vendor/hand_landmarker.task', self.location.href).href);
      handModel = await api.HandLandmarker.createFromOptions(localFiles, {baseOptions:{modelAssetBuffer:handBytes,delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5});
      postMessage({type:'hands-ready',cacheHits,cacheWrites});
    } catch (error) { postMessage({type:'hands-error',message:String(error.message||error)}); }
  } finally { URL.revokeObjectURL(loaderURL); }
}
self.onmessage = async ({ data }) => {
  if (data.type === 'init') { try { await initialize(); } catch (error) { postMessage({ type: 'error', phase: 'init', message: String(error.message || error) }); } return; }
  if (data.type !== 'frame') return;
  const bitmap = data.bitmap;
  try {
    if (!faceModel) throw new Error('Face model is not ready');
    const start = performance.now(), result = faceModel.detectForVideo(bitmap, data.timestamp);
    const shapes = result.faceBlendshapes?.[0]?.categories || [], score = name => shapes.find(c => c.categoryName === name)?.score || 0;
    let mask = null;
    if (segmenter && data.timestamp - lastSegment >= 180) {
      segmenter.segmentForVideo(bitmap, data.timestamp, segmentation => { latestMask = copyMask(segmentation); });
      lastSegment = data.timestamp; mask = latestMask;
    }
    let hands = null;
    if(handModel && data.trackHands && data.timestamp-lastHands>=90){
      try { hands=handModel.detectForVideo(bitmap,data.timestamp).landmarks;lastHands=data.timestamp; }
      catch(error){handModel.close();handModel=null;postMessage({type:'hands-error',message:String(error.message||error)});hands=[];}
    }
    const message = { hands, type: 'result', timestamp: data.timestamp, inferenceMs: performance.now() - start, face: result.faceLandmarks?.[0] || null, smile: (score('mouthSmileLeft') + score('mouthSmileRight')) / 2, mask };
    postMessage(message, mask ? [mask.data.buffer, mask.alpha.buffer] : []);
    // The transferred array is owned by the main thread; never reuse it.
    if (mask) latestMask = null;
  } catch (error) { postMessage({ type: 'error', phase: 'frame', message: String(error.message || error) }); }
  finally { bitmap?.close(); }
};
