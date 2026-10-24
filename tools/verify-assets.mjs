import{readFileSync,statSync,readdirSync}from'node:fs';import{createHash}from'node:crypto';import{gunzipSync,gzipSync}from'node:zlib';import{runInNewContext}from'node:vm';import{liveFiles}from'./live-files.mjs';
const root=new URL('../dist/',import.meta.url),scope={self:{}};runInNewContext(readFileSync(new URL('vision-pack.js',root),'utf8'),scope);
const models=[];for(const[name,entry]of Object.entries(scope.self.VISION_PACK)){
 const packed=readFileSync(new URL('vendor/compressed/'+name+'.gz',root)),raw=gunzipSync(packed),sha256=createHash('sha256').update(raw).digest('hex');
 if(raw.length!==entry.bytes||packed.length!==entry.packedBytes||sha256!==entry.sha256)throw Error('Recognition asset integrity failed: '+name);
 models.push({name,rawBytes:raw.length,packedBytes:packed.length,gzipLevel9Bytes:gzipSync(raw,{level:9}).length,sha256});
}
const files=liveFiles(),actual=[];function walk(url,prefix=''){for(const p of readdirSync(url,{withFileTypes:true})){if(p.isDirectory())walk(new URL(p.name+'/',url),prefix+p.name+'/');else actual.push(prefix+p.name);}}walk(root);
if(JSON.stringify(actual.sort())!==JSON.stringify(files))throw Error('Runtime directory contains unused or missing files');
const bytes=files.reduce((sum,path)=>sum+statSync(new URL(path,root)).size,0),faceInitial=['vision_bundle.cjs','vision_wasm_internal.js','vision_wasm_internal.wasm','face_landmarker.task'].reduce((sum,name)=>sum+scope.self.VISION_PACK[name].packedBytes,0);
console.log(JSON.stringify({files:files.length,bytes,faceInitialModelBytes:faceInitial,modelRawBytes:models.reduce((s,p)=>s+p.rawBytes,0),modelPackedBytes:models.reduce((s,p)=>s+p.packedBytes,0),models},null,2));
