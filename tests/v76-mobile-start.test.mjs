import test from'node:test';import assert from'node:assert/strict';import{execFileSync}from'node:child_process';import{readFileSync}from'node:fs';import{simulationSlices}from'../dist/live-playback.mjs';
test('the first tap before module initialization requests one camera and reaches recognition',()=>{
 const output=execFileSync(process.execPath,['--experimental-vm-modules',new URL('./helpers/v67-app-smoke.mjs',import.meta.url).pathname,'--early-tap'],{encoding:'utf8',timeout:15000});assert.match(output,/First tap before app download is consumed once/);assert.match(output,/accepts a first face result/);
});
test('the camera bootstrap is inline before the application graph, and matches its tested source',()=>{
 const root=new URL('../dist/',import.meta.url),html=readFileSync(new URL('index.html',root),'utf8'),source=readFileSync(new URL('camera-entry.js',root),'utf8');assert.ok(html.includes('<script id="camera-entry">'+source+'</script>'));assert.ok(html.indexOf('id="camera-entry"')<html.indexOf('type="module"'));assert.ok(!html.includes('src="./camera-entry.js"'));
});
test('flat physics preserves elapsed time on slow phones with bounded substeps and no backlog',()=>{
 for(const fps of[12,15,20,24,60]){const slices=simulationSlices(1000/fps,'flat');assert.ok(slices.length<=2);assert.ok(slices.every(dt=>dt<=.05));assert.ok(Math.abs(slices.reduce((a,b)=>a+b,0)-1/fps)<1e-9);}
 assert.deepEqual(simulationSlices(5000,'flat'),[.05]);assert.deepEqual(simulationSlices(100,'cinema'),[.05]);
});
