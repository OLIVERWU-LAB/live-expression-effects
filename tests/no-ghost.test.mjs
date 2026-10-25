import test from 'node:test';import assert from 'node:assert/strict';
import {GiftRenderer,giftFrameIndex} from '../dist/gift-renderer.mjs';
test('rotation renders exactly one pose without mixing two silhouettes or changing opacity',()=>{
 const renderer=new GiftRenderer(),im={naturalWidth:3072,naturalHeight:128};renderer.images.set('ring0',im);
 for(let i=-80;i<200;i++){
  const calls=[],g={save(){},restore(){},drawImage(...args){calls.push({args,alpha:this.globalAlpha});},globalAlpha:1};
  const phase=i*.079;renderer.sprite(g,'ring',0,40,50,30,32,phase,.72);
  assert.equal(calls.length,1);const c=calls[0];assert.equal(c.args[0],im);assert.equal(c.args[1],giftFrameIndex(phase,24)*128);
  assert.deepEqual(c.args.slice(2),[0,128,128,25,34,30,32]);assert.equal(c.alpha,.72);
 }
});
test('dense pose selection wraps continuously and stays within half an angular sample',()=>{
 const tau=2*Math.PI;
 for(let i=-1000;i<1000;i++){
  const phase=i*.013,index=giftFrameIndex(phase,24),angle=((phase%tau)+tau)%tau;
  const error=Math.abs(Math.atan2(Math.sin(index*tau/24-angle),Math.cos(index*tau/24-angle)));
  assert.ok(error<=tau/48+1e-12);assert.ok(index>=0&&index<24);
 }
 assert.equal(giftFrameIndex(-.00001,24),0);assert.equal(giftFrameIndex(2*Math.PI,24),0);
});
