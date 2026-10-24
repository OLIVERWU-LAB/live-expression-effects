import test from'node:test';import assert from'node:assert/strict';import{FlatPreview,PREVIEW_STYLES,PREVIEW_DURATION}from'../dist/flat-preview-model.mjs';import{ACTIVE_FLAT_PATTERNS}from'../dist/flat-fireworks.mjs';import{liveFiles}from'../tools/live-files.mjs';
const snapshot=p=>p.world.particles.map(q=>[q.flatRole,q.x,q.y,q.life,q.tint]);
test('preview contains exactly the currently active flat styles and replay/rewind reproduces their real particles',()=>{
 assert.deepEqual(PREVIEW_STYLES.map(s=>s.pattern),ACTIVE_FLAT_PATTERNS);assert.deepEqual(PREVIEW_STYLES.map(s=>s.number),['02','03','04']);
 for(const style of PREVIEW_STYLES){const p=new FlatPreview(style.pattern);assert.equal(p.world.rockets.length,1);p.advance(1.7);const expected=snapshot(p);assert.ok(expected.length>100);p.advance(3.5);p.advance(1.7);assert.deepEqual(snapshot(p),expected);p.reset();p.advance(1.7);assert.deepEqual(snapshot(p),expected);}
});
test('every preview includes all five flowers, stays within budget and finishes before its loop restarts',()=>{
 for(const style of PREVIEW_STYLES){const p=new FlatPreview(style.pattern),clusters=new Set();for(let f=0;f<=576;f++){p.advance(f/120);assert.ok(p.world.particles.length<=700);for(const q of p.world.particles){if(q.flatRole!=='seed'&&q.clusterIndex!=null)clusters.add(q.clusterIndex);assert.ok(Number.isFinite(q.x+q.y+q.life));}}assert.equal(clusters.size,5);assert.equal(p.time,PREVIEW_DURATION);assert.equal(p.world.particles.length,0);assert.equal(p.world.pendingParticles.length,0);assert.equal(p.world.rockets.length,0);}
});
test('standalone preview ships its entry, stylesheet and modules without historical QA or new image/video assets',()=>{const files=liveFiles();for(const p of['flat-preview.html','flat-preview.css','flat-preview.mjs','flat-preview-model.mjs'])assert.ok(files.includes(p));assert.ok(!files.some(p=>p.startsWith('qa/')));});
