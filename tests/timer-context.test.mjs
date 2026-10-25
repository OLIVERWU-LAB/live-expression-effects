import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('browser receiver checks: default timers support startup, frames, retry, pause and restart', async () => {
 const timers=new Map(),workers=[],calls=[];let id=0;
 const valid=receiver=>{calls.push(receiver);if(receiver!=null&&receiver!==browserGlobal)throw new TypeError('Illegal invocation');};
 let browserGlobal;const scope={performance:{now:()=>0},setTimeout:function(fn,ms){valid(this);timers.set(++id,{fn,ms});return id;},clearTimeout:function(key){valid(this);timers.delete(key);}};
 // Evaluate the actual module with browser-like native receiver validation.
 // Node timers and arrow-function mocks do not enforce this browser constraint.
 const source=readFileSync(new URL('../dist/vision-session.mjs',import.meta.url),'utf8');
 runInNewContext('globalThis.__global=globalThis;'+source.replace('export class VisionSession','globalThis.Session=class VisionSession'),scope);
 browserGlobal=scope.__global;
 const session=new scope.Session({createBitmap:async()=>({close(){}}),createWorker:()=>{const w={posts:[],postMessage(data){this.posts.push(data);},terminate(){}};workers.push(w);return w;}});
 session.resume();assert.equal(workers.length,1);assert.equal(session.phase,'runtime');
 const ready=()=>{const w=workers.at(-1);w.onmessage({data:{type:'ready'}});w.onmessage({data:{type:'models-ready'}});};
 ready();await session.start();assert.equal(timers.size,0);
 assert.equal(session.capture({}),true);for(let i=0;i<8;i++)await Promise.resolve();
 workers[0].onmessage({data:{type:'result',frameId:session.frameId}});assert.equal(session.hasResult,true);assert.equal(timers.size,0);
 session.pause();session.resume();assert.equal(workers.length,1);
 workers[0].onmessage({data:{type:'error',phase:'init',message:'Injected worker error'}});assert.equal(session.worker,null);assert.equal(timers.size,1);
 const retry=[...timers.values()][0].fn;timers.clear();retry();assert.equal(workers.length,2);ready();
 const restarted=session.restart();assert.equal(workers.length,3);ready();await restarted;session.dispose();assert.equal(timers.size,0);assert.equal(session.worker,null);assert.ok(calls.length>10);
});
