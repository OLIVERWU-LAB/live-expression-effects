import {GIFT_BANKS} from '../dist/gift-banks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GIFT_MATERIALS,giftMaterialTint} from '../dist/gift-materials.mjs';
import {GIFT_ASSETS} from '../dist/reference-bursts.mjs';
import {giftAssetPath} from '../dist/gift-shapes.mjs';
import {GiftRenderer} from '../dist/gift-renderer.mjs';
test('soft candy loads every selected shape and uses the current saturated soft lighting palette',async()=>{
 const original=globalThis.Image;
 globalThis.Image=class{set src(url){const b=readFileSync(new URL(url));this.naturalWidth=b.readUInt32BE(16);this.naturalHeight=b.readUInt32BE(20);queueMicrotask(()=>this.onload());}};
 try{const r=new GiftRenderer();assert.equal(await r.load('soft-candy'),true);assert.equal(r.material,'soft-candy');assert.equal(r.images.size,Object.keys(GIFT_BANKS['soft-candy'].items).length);for(let i=0;i<6;i++)assert.match(giftMaterialTint({variant:i},'soft-candy'),/^#[0-9a-f]{6}$/i);assert.deepEqual(GIFT_MATERIALS,['light','soft','candy','soft-candy']);}finally{globalThis.Image=original;}
});
test('soft candy atlases retain single-pose frames within a bounded new texture bank',()=>{
 const base=new URL('../dist/assets/gift-v37/soft-candy/',import.meta.url),m=JSON.parse(readFileSync(new URL('manifest.json',base)));let decoded=0,bytes=0;
 for(const[k,colors]of Object.entries(GIFT_ASSETS))for(const c of colors){const path=giftAssetPath('soft-candy',k,c),b=readFileSync(new URL('../dist/'+path,import.meta.url));decoded+=b.readUInt32BE(16)*b.readUInt32BE(20)*4;if(['drop','popper','capsule'].includes(k))continue;const a=m.assets.find(a=>a.file===k+'-'+c+'.png');assert.ok(a);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);assert.equal(a.frames,['bead','twinkle'].includes(k)?1:24);assert.equal(b.readUInt32BE(16),128*a.frames);assert.equal(b.readUInt32BE(20),128);bytes+=b.length;}
 assert.ok(decoded<38*1024*1024);assert.ok(bytes<4_000_000);
});
