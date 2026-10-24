import {cameraFrameReader} from './camera-frame.mjs?v=7838a126173a';
import {fitFlatViewport} from './flat-budget.mjs?v=7838a126173a';
import {VisionSession} from './vision-session.mjs?v=7838a126173a';
import{ParticleQuality}from'./particle-quality.mjs?v=7838a126173a';
import {applyLiveStyle,lockedState} from './live-playback.mjs?v=7838a126173a';
import {REFERENCE_NAMES} from './reference-bursts.mjs?v=7838a126173a';
import { ExpressionController, clamp, headPolygon, previewHead } from './core.mjs?v=7838a126173a';
import { StickerWorld, SilhouetteCollider } from './effects.mjs?v=7838a126173a';
import {HandCollider,withHands} from './hands.mjs?v=7838a126173a';
import { Renderer } from './renderer.mjs?v=7838a126173a';
import { SHELLS, planBurst } from './pyro.mjs?v=7838a126173a';
import {BOUQUET_NAME} from './bouquet.mjs?v=7838a126173a';
import { SoundDesigner } from './sound.mjs?v=7838a126173a';
const $ = id => document.getElementById(id), stage = $('stage'), video = $('camera');
const renderer = new Renderer($('scene')), world = new StickerWorld(), expression = new ExpressionController();
renderer.gift.tileSize=matchMedia('(max-width: 600px)').matches?96:0;
const sound = new SoundDesigner();
try { sound.setEnabled(localStorage.getItem('expression-sound') !== 'off'); } catch {}
function syncSound() { const on = sound.enabled && sound.ready; $('sound-toggle').setAttribute('aria-pressed', String(on)); $('sound-toggle').setAttribute('aria-label', on ? '关闭声音' : '开启声音'); $('sound-toggle').title = on ? '关闭声音' : '开启声音'; $('sound-status').textContent = !sound.enabled ? '静音' : !sound.ready ? '点击右上角开启' : world.style==='cinema' ? '呼啸 · 爆裂 · 余响' : '轻响 · 弹跳 · 铃音'; }
sound.onstate = syncSound; syncSound();
function activateAudio() { if(sound.enabled) sound.unlock().then(syncSound); }
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const quality=new ParticleQuality(reduced?180:700);world.limit=quality.limit;
let mode = 'idle', wanted = false, stream = null, engineReady = false;
let cameraStartup = 'idle', cameraStartupError = null;
let cameraRequest = null, cameraEpoch = 0, suspended = document.hidden, lastVideoTime = -1, lastInference = 0, interval = 65;
let width = 1, height = 1, landmarks = null, mask = null, maskTime = 0, faceTime = -Infinity, polygon = null, silhouette = null, silhouetteKey = '', lastCenter = null;
let lockedEffect=null,fireworkLaunches=0;
let state = 'neutral', previewStrength = .35, previewX = .5, previewY = .37, pointerDown = false;
let lastFrame = 0, uiTime = 0, nextLaunchAt = 0, burstSide = 0, launchGap = 1800, fps = 0, fpsTime = 0, frames = 0, inferenceMs = 0, log = [], sessionStart = performance.now();
let lastMetric = null, segmentationReady = false, handsReady = false, handLandmarks = [], handTime = -Infinity, hands = null, handKey = '';
applyLiveStyle(world,'cinema');
world.giftMaterialStyle='random';
renderer.gift.material=world.giftMaterialStyle;
stage.dataset.build='v68';
const readFaceFrame=cameraFrameReader(480),readGeometryFrame=cameraFrameReader(320);
let lastGeometryCapture=0,lastGeometryVideoTime=-1;
const vision=new VisionSession({
 createWorker:()=>new Worker(new URL('./vision.worker.js?v=7838a126173a',import.meta.url)),
 createBitmap:()=>readFaceFrame(video),
 initOptions:{role:'face'},
 active:()=>wanted&&mode==='camera'&&!suspended,
 onState:status=>{engineReady=status.ready;if(mode==='camera'&&!status.ready){$('status-copy').textContent=status.attempt?'正在恢复表情识别…':'识别准备中';}syncLoading();},
 onError:(error,phase)=>{record('vision-error',{phase,message:String(error)});if(phase!=='dropped-frame'){segmentationReady=false;handsReady=false;mask=null;silhouette=null;handLandmarks=[];hands=null;faceTime=-Infinity;}},
 onEvent:handleVisionEvent
});
const geometry=new VisionSession({
 createWorker:()=>new Worker(new URL('./vision.worker.js?v=7838a126173a',import.meta.url)),
 createBitmap:()=>readGeometryFrame(video),initOptions:{role:'geometry'},
 active:()=>wanted&&mode==='camera'&&!suspended&&engineReady,
 onError:(error,phase)=>{record('geometry-error',{phase,message:String(error)});if(phase!=='dropped-frame'){segmentationReady=false;handsReady=false;mask=null;silhouette=null;hands=null;}},
 onEvent:handleGeometryEvent
});
const visionSteps={download:'正在下载识别资源…',runtime:'正在加载识别运行库…',wasm:'正在下载识别引擎…','face-model':'正在下载人脸模型…','face-create':'正在启动人脸模型…',detecting:'正在读取摄像头画面…',ready:'正在恢复表情识别…',idle:'正在准备表情识别…'};
function syncLoading(){
 const live=mode!=='idle'&&!suspended,recognition=live&&mode==='camera'&&(!engineReady||!vision.hasResult),gift=live&&world.style==='gift'&&!renderer.gift.ready;
 const text=cameraStartupError&&recognition?'识别启动未完成':recognition?(visionSteps[vision.phase]||'正在恢复表情识别…'):gift?(renderer.gift.error?'礼物素材加载失败':'正在加载礼物素材…'):'';
 const bytes=vision.progress,download=recognition&&bytes?.loaded&&bytes?.total?' '+(bytes.loaded/1048576).toFixed(1)+' / '+(bytes.total/1048576).toFixed(1)+' MB':'';
 $('loading').hidden=!text;$('loading-copy').textContent=text+download;
 const failure=cameraStartupError||vision.lastError;
 $('loading-detail').textContent=recognition&&failure?'上次未成功：'+failure.slice(0,180):'';
 $('loading-detail').hidden=!$('loading-detail').textContent;
 $('loading-retry').hidden=recognition?!failure:!gift||!renderer.gift.error;
 $('loading-diagnostics').hidden=!recognition||(!vision.lastError&&performance.now()-vision.startedAt<10000);
 stage.setAttribute('aria-busy',String(!!text));
}
$('loading-retry').addEventListener('click',()=>{
 if(mode==='camera'&&(!engineReady||!vision.hasResult)){cameraStartupError=null;cameraStartup='recognition';record('recognition-retry');geometry.dispose();vision.restart().catch(()=>{});}
 else renderer.gift.load(world.giftMaterialStyle).then(syncLoading);syncLoading();
});
$('loading-diagnostics').addEventListener('click',async()=>{
 const detail=JSON.stringify({version:68,browser:navigator.userAgent,source:mode,startup:cameraStartup,startupError:cameraStartupError,wanted,suspended,workerCreated:!!vision.worker,phase:vision.phase,error:vision.lastError,ready:vision.ready,resultReceived:vision.hasResult,pending:vision.pending,attempts:vision.attempt,video:{width:video.videoWidth,height:video.videoHeight,time:video.currentTime,readyState:video.readyState,paused:video.paused},events:log.slice(-18)},null,2);
 try{await navigator.clipboard.writeText(detail);$('loading-diagnostics').textContent='已复制诊断';}catch{window.prompt('复制以下诊断信息',detail);}
});
function syncStyle() {
  stage.dataset.style=world.style;
  if(world.style==='gift')renderer.gift.load(world.giftMaterialStyle).then(syncLoading);
  syncLoading();
  stage.dataset.giftMaterial=world.giftMaterialStyle;
  for(const b of document.querySelectorAll('.version-switch [data-style]'))b.setAttribute('aria-pressed',String(b.dataset.style===world.style));
  syncPlayback();
}
function syncPlayback(){
  for(const b of document.querySelectorAll('[data-playback]'))b.setAttribute('aria-pressed',String(b.dataset.playback===lockedEffect));
  stage.dataset.lockedPlayback=lockedEffect||'auto';
}
function choosePlayback(effect){
  lockedEffect=lockedEffect===effect?null:effect;
  if(lockedEffect&&mode==='idle')usePreview();
  sound.stopAll();world.clear();state='neutral';nextLaunchAt=0;
  syncPlayback();setState(expression.state);record('locked-playback',{effect:lockedEffect||'auto'});
}
syncStyle();
$('optics-status').textContent = renderer.optics ? '粒子合成 · 人物受光' : '基础绘制（光学降级）';
const names = { neutral: '待机', smile: '雨滴', laugh: '烟花' };
const storage = { get() { try { return localStorage.getItem('expression-camera-intent'); } catch { return null; } }, set(value) { try { localStorage.setItem('expression-camera-intent', value ? 'yes' : 'no'); } catch {} } };
function record(type, detail = {}) { log.push({ elapsedMs: Math.round(performance.now() - sessionStart), type, ...detail }); if (log.length > 200) log.shift(); }
function notify(text = '') { $('notice').textContent = text; $('notice').hidden = !text; }
function metrics() { return { source: mode, renderFps: +fps.toFixed(1), inferenceMs: inferenceMs ? +inferenceMs.toFixed(1) : null, particleCount: world.particles.length, particleLimit: world.limit, innerRayCount:world.particles.filter(p=>p.innerRay).length,innerGlintCount:world.particles.filter(p=>p.cinemaDust).length, collisions: world.collisions, waterDepthPx: +world.water.level.toFixed(1), silhouetteReady: segmentationReady, handTrackingReady: handsReady, trackedHands: hands?.count || 0, visualStyle: world.style, renderMs: +renderer.drawMs.toFixed(2), opticalComposition: !!renderer.optics && !renderer.optics.lost, rockets: world.rockets.length, launches:fireworkLaunches,afterglows: world.afterglows.length, pattern: world.lastPattern, soundEnabled: sound.enabled, audioReady: sound.ready, audioVoices: sound.voices.size }; }
function resetSignals() { handLandmarks=[];hands=null;handTime=-Infinity;handKey=''; sound.stopAll(); sound.setScene('neutral', world.style); expression.reset(); state = 'neutral'; landmarks = null; mask = null; polygon = null; silhouette = null; faceTime = -Infinity; lastCenter = null; world.setEffect('neutral'); }
function resize() { const r = stage.getBoundingClientRect(); width = r.width; height = r.height; renderer.resize(width, height); silhouetteKey = ''; polygon = null; }
new ResizeObserver(resize).observe(stage);
function showSession(source) {
  mode = source; $('welcome').hidden = true; $('hud').hidden = false; $('preview-strength').hidden = source !== 'preview'; stage.dataset.mode=source;
  $('stop-camera').hidden = false; $('resume-camera').hidden = source === 'camera'; $('resume-camera').textContent='预览'; $('source-label').textContent = source === 'camera' ? 'LIVE CAMERA' : 'PREVIEW';
  syncLoading();
  $('live-dot').classList.add('active'); $('bottom-note').textContent = source === 'camera' ? '本地识别 · 5–45% 落雨 / 45–100% 烟花' : '模拟预览 · 拖动画面移动人物';
}
function releaseTracks() { cameraEpoch++; stream?.getTracks().forEach(t => t.stop()); stream = null; video.srcObject = null; stage.classList.remove('camera-active'); }
function stop() {
  record('session-ended', metrics()); lastMetric = metrics(); wanted = false; vision.pause();geometry.pause(); storage.set(false); releaseTracks(); mode = 'idle'; stage.dataset.mode='idle'; resetSignals(); world.clear();
  $('welcome').hidden = false; $('hud').hidden = true; $('face-hint').hidden = true; $('stop-camera').hidden = true; $('resume-camera').hidden = true;
  $('source-label').textContent = 'CAMERA OFF'; $('status-copy').textContent = '表情互动特效'; $('live-dot').classList.remove('active'); $('bottom-note').textContent = '开启摄像头以使用表情控制。'; stage.classList.remove('rain', 'firework');
  $('start-camera').disabled = false; notify();syncLoading();
  // Keep the initialized engine in memory for a later start in this same page.
}
function usePreview() {
  wanted = false; vision.pause();geometry.pause(); storage.set(false); releaseTracks(); resetSignals(); world.clear(); sessionStart = performance.now(); log = []; showSession('preview');
  previewX = .5; previewY = .37; previewStrength = .35; $('preview-strength').value = 35; $('status-copy').textContent = '模拟信号 · 非摄像头识别'; notify(); record('preview-start');
}
function ensureEngine(){return vision.start();}
function handleVisionEvent(data){
    if (data.type === 'ready') {
      $('cache-status').textContent = data.cacheAvailable === false ? '浏览器未开放持久缓存' : data.cached ? '已从本机缓存读取' : '已保存，后续优先复用';
      record('engine-ready', { cached: !!data.cached, cacheHits: data.cacheHits, cacheWrites: data.cacheWrites });
    } else if (data.type === 'segmentation-ready') { segmentationReady = true; record('silhouette-ready', { labels: data.labels }); }
    else if (data.type === 'segmentation-error') { segmentationReady = false; record('silhouette-error', { message: data.message }); if (mode === 'camera') notify('人物轮廓暂未就绪，目前使用头部轮廓。表情识别会继续运行。'); }
    else if(data.type==='hands-ready'){handsReady=true;record('hands-ready');}
    else if(data.type==='hands-error'){handsReady=false;handLandmarks=[];hands=null;record('hands-error',{message:data.message});}
    else if (data.type === 'result') {
      inferenceMs = inferenceMs ? inferenceMs * .8 + data.inferenceMs * .2 : data.inferenceMs; interval = clamp(inferenceMs * 1.2, 50, 160);
      if (mode !== 'camera' || suspended) return;
      if(data.hands!==null&&data.hands!==undefined){handLandmarks=data.hands;handTime=performance.now();handKey='';}
      if (data.mask) { mask = data.mask; maskTime = performance.now(); silhouetteKey = ''; }
      if (data.face) {
        landmarks = data.face; faceTime = performance.now();
        if(geometry.paused)geometry.resume();else if(!geometry.worker&&!geometry.retry)geometry.start().catch(()=>{});
        const result = expression.sample(data.smile, faceTime); setState(result.state);
      } else { landmarks = null; expression.reset(); setState('neutral'); }
    }
}
function handleGeometryEvent(data){
 if(mode!=='camera'||suspended)return;
 if(data.type==='result'){
  if(data.mask){mask=data.mask;maskTime=performance.now();silhouetteKey='';}
  if(data.hands!=null){handLandmarks=data.hands;handTime=performance.now();handKey='';}
 }else if(data.type==='segmentation-ready'){segmentationReady=true;record('silhouette-ready');}
 else if(data.type==='hands-ready'){handsReady=true;record('hands-ready');}
 else if(data.type==='segmentation-error'){segmentationReady=false;record('silhouette-error',{message:data.message});}
 else if(data.type==='hands-error'){handsReady=false;handLandmarks=[];hands=null;record('hands-error',{message:data.message});}
}
function setState(next) {
  next=lockedState(next,lockedEffect,mode);
  if (next !== state) { record('expression', { state: next, strength: +expression.smile.toFixed(3) }); state = next; if(world.requestEffect(next))sound.stopAll(); nextLaunchAt = 0; }
}
async function acquireCamera() {
  if (stream?.getVideoTracks().some(t => t.readyState === 'live')) { stream.getVideoTracks().forEach(t => t.enabled = !suspended); video.srcObject = stream; await video.play(); return; }
  if (cameraRequest) return cameraRequest;
  const epoch = cameraEpoch;
  cameraRequest = navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } } }).then(async value => {
    if (epoch !== cameraEpoch || !wanted) { value.getTracks().forEach(t => t.stop()); return; }
    stream = value; video.srcObject = stream; stream.getVideoTracks().forEach(t => t.enabled = !suspended);
    for (const track of stream.getVideoTracks()) track.addEventListener('ended', () => { if (wanted && !suspended) startCamera(true); }, { once: true });
    await video.play();
  }).finally(() => cameraRequest = null);
  return cameraRequest;
}
async function startCamera(automatic = false) {
  if (!isSecureContext || !navigator.mediaDevices?.getUserMedia) { notify('请通过 HTTPS 或 localhost，在支持摄像头的浏览器中体验。'); return; }
  if (!window.Worker || !window.createImageBitmap || !window.OffscreenCanvas) { notify('当前浏览器缺少本地识别能力，请使用新版 Chrome、Edge 或 Safari。'); return; }
  wanted = true; storage.set(true); notify(); $('start-camera').disabled = true;cameraStartupError=null;
  if (mode !== 'camera') { world.clear(); resetSignals(); sessionStart = performance.now(); log = []; }
  try {
    cameraStartup='camera';record('camera-requested');
    await acquireCamera(); if (!wanted || !stream) return;
    // Begin recognition before updating the session UI. A UI failure must never
    // leave a live camera with an idle recognition session.
    mode='camera';cameraStartup='recognition';record('camera-playing');
    record('recognition-requested');vision.resume();const engine=ensureEngine();engine.catch(()=>{});
    showSession('camera'); stage.classList.add('camera-active'); $('status-copy').textContent = engineReady ? '表情识别已就绪' : '画面已就绪 · 识别准备中';
    $('start-camera').disabled = false; lastVideoTime = -1;
    await engine; if (!wanted) return;cameraStartup='ready';
    $('status-copy').textContent = suspended ? '已暂停 · 返回继续' : '本地识别中'; $('resume-camera').hidden = true; notify();
    record(automatic ? 'camera-auto-resumed' : 'camera-started');
  } catch (error) {
    $('start-camera').disabled = false;
    record('camera-startup-error',{step:cameraStartup,message:String(error?.message||error)});
    if (stream) {
      // Worker failures already have a retry and a visible reason. Other errors
      // must also remain visible instead of being silently mistaken for loading.
      if(!vision.lastError){cameraStartupError=String(error?.message||error);syncLoading();}
      return;
    }
    const messages = { NotAllowedError: '请允许此网站使用摄像头，然后再试一次。', NotFoundError: '没有找到摄像头，可以先看效果预览。', NotReadableError: '摄像头可能正被其他应用占用，请关闭占用后再试。' };
    notify(messages[error.name] || '摄像头暂时无法开启，请检查设备后重试。'); wanted = false; storage.set(false);
  }
}
function capture(now){
 if(mode!=='camera'||suspended||!engineReady||video.readyState<2)return;
 if(!vision.pending&&video.currentTime!==lastVideoTime&&now-lastInference>=interval){
  if(vision.capture(video,{timestamp:performance.now()})){lastInference=now;lastVideoTime=video.currentTime;}
 }
 if(geometry.ready&&!geometry.pending&&video.currentTime!==lastGeometryVideoTime&&now-lastGeometryCapture>=180){
  if(geometry.capture(video,{trackHands:state==='smile',timestamp:performance.now()})){lastGeometryCapture=now;lastGeometryVideoTime=video.currentTime;}
 }
}
function previewPolygon() {
  const r = Math.min(width * .13, height * .14), cx = width * previewX, cy = height * previewY, ry = r * 1.28;
  const points = [];
  for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + i / 16 * Math.PI * 5 / 6; points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * ry }); }
  points.push({ x: cx + r * .43, y: cy + r * 1.4 }, { x: cx + r * 1.6, y: cy + r * 1.7 }, { x: cx + r * 2.3, y: cy + r * 3.9 }, { x: cx - r * 2.3, y: cy + r * 3.9 }, { x: cx - r * 1.6, y: cy + r * 1.7 }, { x: cx - r * .43, y: cy + r * 1.4 });
  for (let i = 0; i <= 16; i++) { const a = Math.PI * 2 / 3 + i / 16 * Math.PI * 5 / 6; points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * ry }); }
  return points;
}
function collisionGeometry(now, dt) {
  if (mode === 'preview') { hands=null; polygon = previewPolygon(); silhouette = null; return polygon; }
  let next = landmarks && now - faceTime < 1800 ? headPolygon(landmarks, video.videoWidth, video.videoHeight, width, height) : null;
  if (next && polygon?.length === next.length) { const a = 1 - Math.exp(-dt / .045); next = next.map((p, i) => ({ x: polygon[i].x + (p.x - polygon[i].x) * a, y: polygon[i].y + (p.y - polygon[i].y) * a })); }
  polygon = next;
  if (mask && now - maskTime < 1800 && video.videoWidth) {
    const key = `${maskTime}-${width}-${height}`;
    if (key !== silhouetteKey) { silhouette = new SilhouetteCollider(mask, video.videoWidth, video.videoHeight, width, height); silhouetteKey = key; }
  } else silhouette = null;
  if(handLandmarks.length&&now-handTime<280&&video.videoWidth&&(state==='smile'||state==='laugh')){
    const key=`${handTime}-${width}-${height}`;
    if(key!==handKey){hands=new HandCollider(handLandmarks,video.videoWidth,video.videoHeight,width,height);handKey=key;}
  }else hands=null;
  return withHands(silhouette || polygon,hands);
}
function currentHeadBounds() {
  if(mode==='preview'){const r=Math.min(width*.13,height*.14),x=width*previewX,y=height*previewY;return{left:x-r*1.10,right:x+r*1.10,top:y-r*1.4,bottom:y+r*1.4};}
  if(!polygon?.length)return null;
  const left=Math.min(...polygon.map(p=>p.x)),right=Math.max(...polygon.map(p=>p.x)),top=Math.min(...polygon.map(p=>p.y)),bottom=Math.max(...polygon.map(p=>p.y));
  return{left:left-(right-left)*.10,right:right+(right-left)*.10,top:top-(bottom-top)*.18,bottom};
}
function updateUI(now) {
  if (now - uiTime < 100) return; uiTime = now;
  syncLoading();
  stage.dataset.giftAssets=renderer.gift.ready?'ready':renderer.gift.error?'failed':'loading';
  const value = Math.round(expression.smile * 100); $('strength-value').textContent = String(value); $('gauge-cursor').style.left = `calc(${value}% + ${5-value*.1}px)`; $('smile-gauge').setAttribute('aria-valuenow',String(value)); $('smile-gauge').setAttribute('aria-valuetext',`${value}% ${names[state]}`); $('effect-name').textContent = names[state];
  stage.classList.toggle('rain', state === 'smile'); stage.classList.toggle('firework', state === 'laugh');
  $('face-hint').hidden = !!lockedEffect || mode !== 'camera' || !engineReady || suspended || now - faceTime < 900;
  if (mode === 'camera' && engineReady && !suspended) $('status-copy').textContent = now - faceTime < 1800 ? '本地识别中' : '等待笑脸进入画面';
  document.querySelectorAll('[data-strength]').forEach(b => b.classList.toggle('active', +b.dataset.strength === Math.round(previewStrength * 100)));
  $('diag-fps').textContent = fps ? `${Math.round(fps)} fps` : '—'; $('diag-inference').textContent = inferenceMs ? `${Math.round(inferenceMs)} ms` : '—';
  $('diag-particles').textContent = `${world.particles.length} / ${world.limit}`; $('diag-collisions').textContent = String(world.collisions); $('diag-water').textContent = `${Math.round(world.water.level)} px`; $('diag-render').textContent = `${renderer.drawMs.toFixed(1)} ms`; $('optics-status').textContent = renderer.optics && !renderer.optics.lost ? '粒子合成 · 人物受光' : '基础绘制（光学降级）';
  $('hand-status').textContent=!handsReady?'轮廓碰撞':hands?.count?`${hands.count} 只手 · 已跟踪`:'已就绪';
  $('diag-rockets').textContent = String(world.rockets.length); $('diag-pattern').textContent = (REFERENCE_NAMES[world.lastPattern]||(world.lastPattern==='bouquet'?BOUQUET_NAME:SHELLS[world.lastPattern]?.name)) || '—'; $('diag-audio').textContent = String(sound.voices.size); syncSound();
  $('diag-source').textContent = mode === 'camera' ? '真实摄像头' : mode === 'preview' ? '模拟预览' : '未启动';
}
function frame(now) {
  const gap=lastFrame?now-lastFrame:16,dt=clamp(gap/1000,0,.05);lastFrame=now;let sampledFPS=false;
  if (suspended || mode==='idle') { requestAnimationFrame(frame); return; }
  frames++; if (!fpsTime) fpsTime = now;
  if(now-fpsTime>=1000){fps=frames*1000/(now-fpsTime);fpsTime=now;frames=0;sampledFPS=true;}
  if (mode === 'preview') setState(expression.sample(previewStrength, now).state);
  else if (mode === 'camera' && now - faceTime > 1800) { expression.reset(); setState('neutral'); landmarks = null; }
  const collider = collisionGeometry(now, dt), active = mode === 'preview' || (mode === 'camera' && (!!lockedEffect || (engineReady && now - faceTime < 1800)));
  if(sampledFPS){const before=world.limit;world.limit=quality.sample({now,fps,drawMs:renderer.drawMs,active,visible:!document.hidden,gap});if(world.style==='flat'&&world.effect==='laugh'&&(world.particles.length||world.pendingParticles.length||world.rockets.length))world.limit=before;if(before!==world.limit)record('particle-budget-adjusted',{limit:world.limit});}
  if(world.style==='flat'&&world.effect==='laugh'&&!world.particles.length&&!world.pendingParticles.length&&!world.rockets.length)world.limit=quality.limit;
  if (active && state === 'smile') world.rain(dt * (reduced ? .45 : 1), width, height, expression.smile);
  world.head=currentHeadBounds();
  const reviewBusy=(lockedEffect==='fireworks'||world.style==='flat')&&(world.style==='cinema'?world.rockets.length>0:(world.rockets.length||world.launchers.length||world.particles.length||world.blooms.length||world.afterglows.length||world.innerBursts.length));
  if(active&&state==='laugh'&&(world.style!=='gift'||renderer.gift.ready)&&!reviewBusy&&now>=nextLaunchAt){
    const plan=planBurst(width,height,world.head,burstSide++),layout=world.style==='flat'?fitFlatViewport(plan,width,height):plan;
    if(layout&&world.launch(layout.x,layout.y,width,height,layout.scale,layout)){
      stage.dataset.launchCount=String(++fireworkLaunches);
      launchGap=world.style==='cinema'?1500+Math.random()*160:lockedEffect?450:world.style==='gift'?1750+Math.random()*200:world.style==='flat'?(world.lastPattern==='flat-petals-slow'?2600:1750):1100+Math.random()*250;
      nextLaunchAt=now+(reduced?2800:launchGap);record('firework-launch',{zone:layout.zone,radius:Math.round(layout.radius)});
    }else nextLaunchAt=now+160;
  }
  world.update(dt, width, height, active ? collider : null);
  const events=world.consumeEvents();stage.dataset.headCollisions=String(world.headCollisions);stage.dataset.burstCount=String(+(stage.dataset.burstCount||0)+events.filter(e=>e.type==='burst').length);if(events.some(e=>e.type==='flight-blocked')){nextLaunchAt=Math.min(nextLaunchAt,now+100);record('firework-blocked');}sound.setScene(world.effect, world.style); sound.handle(events); sound.update(dt);
  renderer.draw(world, { time: now, camera: mode === 'camera' && !!stream, video, preview: mode === 'preview', strength: expression.smile, previewX, previewY, tracking: $('show-tracking').checked, polygon, silhouette, hands });
  capture(now); updateUI(now); requestAnimationFrame(frame);
}
async function resume() {
  await sound.resume(); suspended = false; lastFrame = 0; fpsTime = 0; frames = 0; lastVideoTime = -1; resetSignals();
  if (!wanted || mode !== 'camera') return;
  if (stream?.getVideoTracks().some(t => t.readyState === 'live')) { stream.getVideoTracks().forEach(t => t.enabled = true); try { await video.play(); } catch { await startCamera(true); } }
  else await startCamera(true);
  vision.resume();geometry.resume();
  $('status-copy').textContent = engineReady ? '本地识别中' : '识别准备中'; record('resumed');
}
function pause() {
  sound.pause(); suspended = true; vision.pause();geometry.pause(); video.pause(); stream?.getVideoTracks().forEach(t => t.enabled = false); resetSignals(); $('status-copy').textContent = '已暂停 · 返回继续'; record('paused');
}

$('toggle-ui').addEventListener('click',()=>{const hidden=stage.classList.toggle('ui-hidden');$('toggle-ui').setAttribute('aria-pressed',String(hidden));$('toggle-ui').setAttribute('aria-label',hidden?'显示界面':'隐藏界面');$('toggle-ui').title=hidden?'显示界面':'隐藏界面';});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&stage.classList.contains('ui-hidden'))$('toggle-ui').click();});
document.addEventListener('fullscreenchange',()=>{const label=document.fullscreenElement?'退出全屏':'进入全屏';$('fullscreen').setAttribute('aria-label',label);$('fullscreen').title=label;});

$('start-camera').addEventListener('click', () => { activateAudio(); startCamera(); }); $('resume-camera').addEventListener('click', () => { activateAudio(); startCamera(); }); $('stop-camera').addEventListener('click', stop); $('start-preview').addEventListener('click', () => { activateAudio(); usePreview(); });
$('sound-toggle').addEventListener('click', async () => { if(sound.enabled && sound.ready) sound.setEnabled(false); else { sound.setEnabled(true); await sound.unlock(); } try { localStorage.setItem('expression-sound', sound.enabled ? 'on' : 'off'); } catch {} syncSound(); });
$('pattern-picker').addEventListener('click',e=>{const b=e.target.closest('button[data-playback]');if(!b)return;activateAudio();choosePlayback(b.dataset.playback);});
$('preview-strength').addEventListener('input', e => previewStrength = +e.target.value / 100);
for (const b of document.querySelectorAll('[data-strength]')) b.addEventListener('click', () => { previewStrength = +b.dataset.strength / 100; $('preview-strength').value = b.dataset.strength; });
$('settings-button').addEventListener('click', () => $('settings').hidden = !$('settings').hidden); $('close-settings').addEventListener('click', () => $('settings').hidden = true);
$('fullscreen').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else if (stage.requestFullscreen) await stage.requestFullscreen(); else notify('画面已铺满窗口；当前浏览器不支持进一步隐藏系统栏。'); } catch { notify('当前浏览器限制了系统全屏，画面仍会铺满可用窗口。'); } });
for (const b of document.querySelectorAll('.version-switch [data-style]')) b.addEventListener('click', () => { sound.stopAll(); applyLiveStyle(world,b.dataset.style);world.clear();state='neutral';syncStyle();setState(expression.state);syncSound();nextLaunchAt=0; record('visual-style', {style: world.style}); });
let dragStart = null;
stage.addEventListener('pointerdown', e => { if (mode !== 'preview' || e.target.closest('button,input,aside,.hud')) return; pointerDown = true; dragStart = e.pointerId; stage.setPointerCapture(e.pointerId); move(e); });
function move(e) { if (!pointerDown || mode !== 'preview') return; previewX = clamp(e.clientX / width, .18, .82); previewY = clamp(e.clientY / height, .2, .58); }
stage.addEventListener('pointermove', move); stage.addEventListener('pointerup', () => pointerDown = false); stage.addEventListener('pointercancel', () => pointerDown = false);
$('export-session').addEventListener('click', () => { const data = { version: 68, exportedAt: new Date().toISOString(), metrics: mode === 'idle' ? lastMetric : metrics(), note: 'Aggregate performance and interaction events only; no images or face geometry.', events: log }; const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'expression-session.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume());
window.addEventListener('pagehide', e => { pause(); if (!e.persisted) { releaseTracks(); vision.dispose();geometry.dispose(); } });
window.addEventListener('pageshow', e => { if (e.persisted) resume(); });
async function autoStart() {
  // Existing camera permission can resume even on the first visit to this revision;
  // an explicit stop is respected. Never automatically trigger a permission prompt.
  if(new URLSearchParams(location.search).has('start')||storage.get()==='no'||document.hidden)return;
  try { const permission = await navigator.permissions.query({ name: 'camera' }); if (permission.state === 'granted' && mode === 'idle') await startCamera(true); } catch { /* A browser without camera permission queries keeps the explicit start button. */ }
}
if (reduced) world.limit = 180;
resize(); requestAnimationFrame(frame); autoStart();
