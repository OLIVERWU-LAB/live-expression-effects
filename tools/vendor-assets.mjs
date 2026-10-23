import { mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const stage = path.join(root, '.vendor-download');
const base = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
const items = [ ['hand_landmarker.task', 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'], ['selfie_segmenter.tflite', 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite'], ['vision_bundle.cjs', `${base}/vision_bundle.cjs`], ['wasm/vision_wasm_internal.js', `${base}/wasm/vision_wasm_internal.js`], ['wasm/vision_wasm_internal.wasm', `${base}/wasm/vision_wasm_internal.wasm`], ['wasm/vision_wasm_nosimd_internal.js', `${base}/wasm/vision_wasm_nosimd_internal.js`], ['wasm/vision_wasm_nosimd_internal.wasm', `${base}/wasm/vision_wasm_nosimd_internal.wasm`], ['face_landmarker.task', 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'] ];
await mkdir(stage, { recursive: true });
try {
  for (const [name, url] of items) {
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Download failed: ${response.status} (${name})`);
    const dest = path.join(stage, name); await mkdir(path.dirname(dest), { recursive: true }); await writeFile(dest, new Uint8Array(await response.arrayBuffer())); console.log(`Downloaded ${name}`);
  }
  await mkdir(path.join(root, 'dist/vendor/wasm'), { recursive: true });
  for (const [name] of items) await rename(path.join(stage, name), path.join(root, 'dist/vendor', name));
  await writeFile(path.join(root, 'dist/vision-config.js'), "self.VISION_ASSETS = {runtime: './vendor/vision_bundle.cjs', wasm: new URL('./vendor/wasm', self.location.href).href, model: new URL('./vendor/face_landmarker.task', self.location.href).href};\n");
  console.log('All recognition assets are now self-hosted.');
} finally { await rm(stage, { recursive: true, force: true }); }
