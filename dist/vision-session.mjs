// One worker and one transferred frame at a time. A failed worker is replaced
// automatically; late messages/bitmaps never touch its successor's watchdog.
export class VisionSession {
 constructor({createWorker,createBitmap,onEvent=()=>{},onState=()=>{},onError=()=>{},active=()=>true,setTimer=setTimeout,clearTimer=clearTimeout,initOptions={},now=()=>performance.now()}){
  Object.assign(this,{createWorker,createBitmap,onEvent,onState,onError,active,setTimer,clearTimer,initOptions,now});this.worker=null;this.ready=false;this.preparing=false;this.pending=false;this.sequence=0;this.failures=0;this.attempt=0;this.timer=null;this.retry=null;this.paused=false;this.phase='idle';this.lastError=null;this.hasResult=false;this.startedAt=0;
 }
 notify(){this.onState({ready:this.ready,preparing:this.preparing,recovering:!!this.retry,attempt:this.attempt,phase:this.phase,lastError:this.lastError,hasResult:this.hasResult});}
 watch(ms,reason){this.clearTimer(this.timer);if(!this.paused)this.timer=this.setTimer(()=>this.fail(new Error(reason),'timeout'),ms);}
 start(){
  this.clearTimer(this.retry);this.retry=null;
  if(this.ready)return Promise.resolve();if(this.promise)return this.promise;
  this.promise=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});const promise=this.promise;
  try{
   this.phase='runtime';this.hasResult=false;this.progress=null;this.startedAt=this.now();const current=this.createWorker();this.worker=current;this.watch(90000,'识别组件未响应');this.notify();
   current.onerror=e=>{if(current!==this.worker)return;e.preventDefault?.();this.fail(new Error(e.message||'Recognition worker failed'),'worker');};
   current.onmessage=({data})=>{
    if(current!==this.worker)return;
    if(data.type==='progress'){this.phase=data.phase;this.progress=data;if(!this.ready)this.watch(Math.max(1,Math.min(45000,300000-(this.now()-this.startedAt))),this.phase==='face-create'?'人脸模型启动超时':'识别资源下载已停滞');this.notify();}
    if(data.type==='ready'){this.phase='detecting';this.progress=null;this.ready=true;this.failures=0;this.preparing=true;this.clearTimer(this.timer);this.resolve?.();this.resolve=null;this.reject=null;this.notify();}
    if(data.type==='models-ready'){this.preparing=false;if(this.pending)this.watch(12000,'Recognition frame timed out');this.notify();}
    if(data.type==='error'){if(data.phase==='frame'&&(!this.pending||data.frameId!==this.frameId))return;this.frameError(new Error(data.message),data.phase);return;}
    if(data.type==='result'){
     if(!this.pending||data.frameId!==this.frameId)return;
     this.pending=false;this.clearTimer(this.timer);this.failures=0;this.attempt=0;this.hasResult=true;this.lastError=null;this.phase='ready';this.notify();
    }
    this.onEvent(data);
   };
   current.postMessage({type:'init',...this.initOptions});
  }catch(error){this.fail(error,'init');}
  return promise;
 }
 frameError(error,phase='frame'){
  this.pending=false;this.clearTimer(this.timer);
  if(phase!=='frame'||++this.failures>=3){this.fail(error,phase);return;}
  this.lastError=String(error.message||error);this.onError(error,'dropped-frame');this.notify();
 }
 fail(error,phase){
  this.lastError=String(error.message||error);this.hasResult=false;this.onError(error,phase);this.clearTimer(this.timer);this.sequence++;this.worker?.terminate();this.worker=null;this.ready=false;this.preparing=false;this.pending=false;
  this.reject?.(error);this.promise=null;this.resolve=null;this.reject=null;
  if(this.active()&&!this.paused){const delay=Math.min(8000,750*2**Math.min(this.attempt++,4));this.retry=this.setTimer(()=>{this.retry=null;if(this.active()&&!this.paused)this.start().catch(()=>{});},delay);}
  this.notify();
 }
 capture(source,options={}){
  if(!this.ready||this.pending||this.paused||!this.active())return false;
  const current=this.worker,id=++this.sequence;this.frameId=id;this.pending=true;this.watch(this.preparing?60000:12000,'Recognition frame timed out');
  Promise.resolve().then(()=>this.createBitmap(source)).then(bitmap=>{
   if(current!==this.worker||id!==this.frameId||!this.pending||this.paused||!this.active()){bitmap.close();return;}
   try{current.postMessage({type:'frame',...options,frameId:id,bitmap},[bitmap]);}catch(error){bitmap.close();throw error;}
  }).catch(error=>{if(current===this.worker&&id===this.frameId&&this.pending)this.frameError(error);});
  return true;
 }
 restart(){this.dispose();this.paused=false;this.attempt=0;return this.start();}
 dispose(){this.pause();this.worker?.terminate();this.worker=null;this.ready=false;this.preparing=false;this.hasResult=false;this.progress=null;this.reject?.(new Error('Session closed'));this.promise=null;this.resolve=null;this.reject=null;}
 pause(){this.paused=true;this.pending=false;this.frameId=++this.sequence;this.clearTimer(this.timer);this.clearTimer(this.retry);this.retry=null;}
 resume(){this.paused=false;if(this.pending)this.watch(this.preparing?60000:12000,'Recognition frame timed out');else if(this.worker&&!this.ready)this.watch(90000,'识别组件未响应');else if(!this.ready&&this.active())this.start().catch(()=>{});}
}
