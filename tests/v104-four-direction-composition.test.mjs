import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {flatShell,flatChildren,ACTIVE_FLAT_PATTERNS} from '../dist/flat-fireworks.mjs';
import {flatRandom,flatFlowerSites} from '../dist/flat-placement.mjs';

test('each retained form always makes four scattered centres around the apex, with variation across launches',()=>{
 const arrangements=new Set();
 for(let seed=0;seed<100;seed++){
  const sites=flatFlowerSites(.8,seed),angles=sites.map(p=>(Math.atan2(p.y,p.x)+Math.PI*2)%(Math.PI*2)).sort((a,b)=>a-b);
  assert.equal(sites.length,4);assert.ok(sites.some(p=>p.x<0)&&sites.some(p=>p.x>0)&&sites.some(p=>p.y<0)&&sites.some(p=>p.y>0));
  for(let i=0;i<4;i++){const gap=(angles[(i+1)%4]-angles[i]+Math.PI*2)%(Math.PI*2);assert.ok(gap<Math.PI,'four centres must not fan out into just one half of the screen');}
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)assert.ok(Math.hypot(sites[i].x-sites[j].x,sites[i].y-sites[j].y)>145*.8);
  assert.ok(Math.max(...sites.map(p=>p.y))-Math.min(...sites.map(p=>p.y))>100*.8,'avoid a horizontal row');
  arrangements.add(sites.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(';'));
  for(const pattern of ACTIVE_FLAT_PATTERNS)assert.equal(flatShell(100,100,.8,flatRandom(seed),pattern).particles.length,4);
 }
 assert.equal(arrangements.size,100);
});

test('the accepted individual flower factories retain their exact previous visual and timing data',()=>{
 const accepted={
  'flat-medallion':'168b91f3e83af0a39d29627a935443f393eee4432104701951d1d61e9ee04983',
  'flat-star-crown':'683f1dd04b6e68154a93bc9faa3bb10581c9337d3bd50734b4fcb4697c67ff13',
  'flat-festival':'d6cd33ec42a6821ffa32cd3449a8e917bd3f6a132edf23e94f313c76f3a36dd5'
 };
 for(const pattern of ACTIVE_FLAT_PATTERNS){
  const particles=flatChildren({pattern,x:400,y:120,scale:.8,seed:13,variant:3,turn:.43,cascade:true,flowerScale:1,vx:199,vy:200,clusterIndex:1,flatDensity:.5},flatRandom(2));
  assert.equal(createHash('sha256').update(JSON.stringify(particles)).digest('hex'),accepted[pattern]);
 }
});
