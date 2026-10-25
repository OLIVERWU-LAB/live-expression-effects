import test from'node:test';import assert from'node:assert/strict';import{RainAudio}from'../dist/rain-audio.mjs';import{testAudioContext}from'./helpers/audio-context.mjs';
const drop={type:'drop',generation:0,life:1,x:50,y:40},world=particles=>({effect:'smile',viewport:{width:390,height:690},particles}),contact=region=>({type:'drop',generation:1,life:.4,size:5,x:150,y:220,contactSpray:true,hitRegion:region});
test('person contact preserves a fast real-water transient while the bed briefly ducks and recovers',()=>{
 const c=testAudioContext(),asset={buffer:c.createBuffer(1,24000,48000)},r=new RainAudio(c,{},()=>.5,asset,1);
 r.update(world([drop]),true);c.advance(.1);r.update(world([drop,contact('head')]),true);
 const hit=[...r.voices].find(v=>!v.loop);assert.equal(hit.source.buffer,asset.buffer);assert.equal(hit.attack,.0025);assert.ok(hit.gain.events.some(e=>e[0]==='linear'&&Math.abs(e[2]-.1025)<1e-9));
 const hp=hit.nodes.find(n=>n.type==='highpass'),lp=hit.nodes.find(n=>n.type==='lowpass');assert.equal(hp.frequency.value,1700);assert.equal(lp.frequency.value,11000);
 const expected=(.15)*.35*(1+.035*Math.sin(.1*.91)+.025*Math.sin(.1*1.73));assert.ok(Math.abs(r.beds[0].level/expected-.66)<1e-9);
 c.advance(.3);r.update(world([drop]),true);const recovered=.15*.35*(1+.035*Math.sin(.3*.91)+.025*Math.sin(.3*1.73));assert.ok(Math.abs(r.beds[0].level-recovered)<1e-9);assert.equal(c.allocations,2);assert.ok(r.voices.size<=6);
});
test('pool contact stays soft and does not duck the bed; stop during a fast attack remains bounded',()=>{
 const c=testAudioContext(),r=new RainAudio(c,{},()=>.5);r.update(world([drop,contact('water')]),true);const hit=[...r.voices].find(v=>!v.loop);assert.ok(hit.peak<.04);assert.equal(hit.attack,.006);assert.ok(r.beds[0].level>.05);assert.equal(r.lastPersonHit,-Infinity);
 const p=testAudioContext(),r2=new RainAudio(p,{},()=>.5);r2.update(world([contact('body')]),true);const v=[...r2.voices][0];p.advance(.001);r2.stop();const hold=v.gain.events.find(e=>e[0]==='set'&&e[2]===.001);assert.ok(Math.abs(hold[1]/v.peak-.4)<1e-9);assert.ok(v.source.stopAt<=v.when+v.duration+.02);
});
