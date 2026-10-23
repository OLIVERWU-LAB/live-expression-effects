import test from'node:test';import assert from'node:assert/strict';import{StickerWorld}from'../dist/effects.mjs';import{ACTIVE_CINEMA_PATTERNS}from'../dist/reference-bursts.mjs';import{flatLongTailFade,flatChildren,flatShell}from'../dist/flat-fireworks.mjs';import{cinemaRepriseEnvelope}from'../dist/cinema-renderer.mjs';
const rng=s=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
test('realistic live mode only launches reprises, migrates retired selections and leaves glow modes intact',()=>{
 assert.deepEqual(ACTIVE_CINEMA_PATTERNS,['cinema-rings']);const w=new StickerWorld(rng(4));w.setStyle('cinema');w.setPattern('cinema-shell');assert.equal(w.pattern,'cinema-rings');for(const selection of['auto','cinema-shell','cinema-rings']){w.pattern=selection;for(let i=0;i<20;i++)assert.equal(w.nextPattern(),'cinema-rings');}w.setStyle('glow');w.setPattern('cinema-shell');assert.equal(w.nextPattern(),'cinema-shell');w.setStyle('cinema');assert.equal(w.pattern,'cinema-rings');
});
test('medallion tails begin fading earlier and finish smoothly before the old lingering interval',()=>{
 const seed=flatShell(500,300,1,rng(4),'flat-medallion').particles[0],ps=flatChildren(seed,rng(5)),tails=ps.filter(p=>p.longTrail);assert.ok(tails.length>0);assert.ok(tails.every(p=>p.maxLife>=1.78&&p.maxLife<=1.96));assert.ok(ps.filter(p=>p.flatFine).every(p=>p.maxLife<=1.67));
 const p=tails[0],at=t=>flatLongTailFade({...p,life:p.maxLife-t});assert.ok(at(1.35)<.75);assert.ok(at(p.maxLife-.1)<1e-12);let previous=1;for(let t=0;t<p.maxLife;t+=.01){const alpha=at(t);assert.ok(alpha<=previous+1e-8);assert.ok(previous-alpha<.05);previous=alpha;}assert.equal(at(p.maxLife),0);
});
test('reprise keeps independently phased brightness and continuous scraps-to-glints timing',()=>{
 const ps=Array.from({length:20},(_,i)=>({maxLife:3,life:2.4,seed:i*3.7,luminosity:.55+(i%5)/10,erosionAt:.34,blinkRate:5+i%6})),levels=ps.map(p=>{const e=cinemaRepriseEnvelope(p);return e.alpha*e.brightness;});assert.ok(Math.max(...levels)-Math.min(...levels)>.4);for(const p of ps){let before=cinemaRepriseEnvelope({...p,life:3});for(let i=1;i<=300;i++){const after=cinemaRepriseEnvelope({...p,life:3-i*.01});assert.ok(Math.abs(after.scraps-before.scraps)<.04);assert.ok(Math.abs(after.dust-before.dust)<.04);before=after;}assert.equal(before.dust,1);}
});
