/* Asset transport only; camera frames are never sent over the network. */
self.loadVisionAsset=async function(input,fetcher,progress=()=>{},phase='runtime'){
 const original=new URL(input,self.location.href),name=original.pathname.split('/').pop(),entry=self.VISION_PACK?.[name],packed=!!entry&&entry.packed!==false&&typeof DecompressionStream==='function';
 if(entry&&self.VISION_ASSETS.compressedOnly&&!packed)throw new Error('浏览器缺少压缩资源支持，请更新 Chrome、Edge 或 Safari。');
 const address=packed?new URL(name+'.gz',self.VISION_ASSETS.compressed).href:original.href,controller=new AbortController();let timer;
 const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(),20000);};arm();
 try{
  let response=await fetcher(address,{signal:controller.signal});
  let gzip=packed;if(packed&&response.status===404){response=await fetcher(original.href,{signal:controller.signal});gzip=false;}
  if(!response.ok)throw new Error(`资源下载失败（HTTP ${response.status}）：${name}`);
  const total=Number(response.headers?.get('content-length'))||0;let data;
  if(response.body?.getReader){
   const reader=response.body.getReader(),chunks=[];let loaded=0,last=-Infinity;
   for(;;){const {done,value}=await reader.read();if(done)break;arm();chunks.push(value);loaded+=value.byteLength;const now=performance.now();if(now-last>120){last=now;progress({phase,loaded,total,asset:name});}}
   data=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}progress({phase,loaded,total,asset:name});
  }else data=new Uint8Array(await response.arrayBuffer());
  if(gzip&&data[0]===0x1f&&data[1]===0x8b)data=new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  if(entry){if(data.byteLength!==entry.bytes)throw new Error('资源长度校验失败：'+name);const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==entry.sha256)throw new Error('资源内容校验失败：'+name);}
  return data;
 }catch(error){if(controller.signal.aborted)throw new Error('下载暂时中断：'+name+'，正在重新连接');throw error;}finally{clearTimeout(timer);}
};
