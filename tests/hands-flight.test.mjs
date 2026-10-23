import test from 'node:test';import assert from 'node:assert/strict';
import {HandCollider,withHands} from '../dist/hands.mjs';
import {StickerWorld,SilhouetteCollider} from '../dist/effects.mjs';
import {rocketPoint,planBurst} from '../dist/pyro.mjs';
const hand=()=>[[.5,.75],[.42,.67],[.36,.61],[.32,.55],[.28,.5],[.43,.54],[.42,.43],[.41,.33],[.40,.25],[.50,.52],[.50,.39],[.50,.28],[.50,.20],[.57,.54],[.59,.42],[.60,.33],[.61,.25],[.63,.59],[.67,.51],[.70,.44],[.73,.38]].map(([x,y])=>({x,y,z:0}));
function drop(x,y){return{type:'drop',x,y,vx:0,vy:500,size:23,life:4,maxLife:4,variant:0,angle:0,spin:0,touched:0,generation:0,volume:23**3};}
test('a camera-facing palm and fingers collide even when the person mask misses the entire hand',()=>{
 const h=new HandCollider([hand()],1000,1000,1000,1000),body=new SilhouetteCollider({width:10,height:10,data:new Uint8Array(100)},1000,1000,1000,1000),joint=withHands(body,h);
 assert.equal(h.count,1);assert.ok(h.contains(500,620));assert.ok(h.contains(500,280));assert.equal(h.contains(550,300),false,'gaps between fingers remain open');
 const p=drop(500,680);assert.ok(joint.collide(p,{x:500,y:450}));assert.ok(p.vy<0);assert.ok(p.hitNormal.y<0);
 const finger=drop(500,330);assert.ok(joint.collide(finger,{x:500,y:160}));
});
test('hand geometry has no cupped-palm, depth or handedness requirement',()=>{
 const front=hand(),side=front.map(p=>({...p,x:.5+(p.x-.5)*.18,z:(p.x-.5)*2}));
 for(const raw of[front,side,front.map(p=>({...p,x:1-p.x,z:-.4}))]){const h=new HandCollider([raw],1000,1000,1000,1000);assert.equal(h.count,1);assert.ok(h.contains(500,620));}
});
test('hand points use the same mirrored cover mapping and support both hands',()=>{
 const left=hand(),right=left.map(p=>({...p,x:p.x*.6+.4}));const h=new HandCollider([left,right],640,480,390,844);assert.equal(h.count,2);
 const x=390-(.5*640*(844/480)+(390-640*(844/480))/2);assert.ok(h.contains(x,.62*844));
 assert.equal(new HandCollider([],640,480,390,844).count,0);const body=[];assert.equal(withHands(body,null),body);
 assert.equal(new HandCollider([[{x:NaN,y:0}]],640,480,390,844).count,0);
});
test('rain hitting the independent palm triggers the same bounded splash as a body collision',()=>{
 const w=new StickerWorld(()=>.5),h=new HandCollider([hand()],1000,1000,1000,1000);w.setEffect('smile');w.add(drop(500,500));
 for(let i=0;i<8;i++)w.update(.02,1000,1000,withHands(null,h));
 assert.ok(w.collisions>0);assert.ok(w.particles.some(p=>p.generation===1));assert.ok(w.particles.every(p=>p.generation===1));
});
test('ascending flights have no lateral reversal and stay within ten pixels of their straight chord',()=>{
 for(const x of[60,180,450,720,840]){const w=new StickerWorld(()=>.6);w.setEffect('laugh');w.launch(x,150,900,700);const r=w.rockets[0];let previous=rocketPoint(r,0),previousAngle=null;
  for(let i=1;i<=100;i++){const t=i/100,p=rocketPoint(r,t),q=1-(1-t)**2,straightY=r.sy+(r.ty-r.sy)*q;assert.ok(Math.abs(p.y-straightY)<=10.001);assert.ok(p.y<previous.y);assert.ok((p.x-previous.x)*(r.tx-r.sx)>=0);const angle=Math.atan2(p.y-previous.y,p.x-previous.x);if(previousAngle!==null)assert.ok(Math.abs(angle-previousAngle)<.006);previous=p;previousAngle=angle;}
 }
});
test('a head entering an existing flight cancels it without steering its destination',()=>{
 const w=new StickerWorld(()=>.5);w.setEffect('laugh');w.head={left:250,right:390,top:260,bottom:420};const p=planBurst(640,800,w.head,0,()=>.5);w.launch(p.x,p.y,640,800,p.scale,p);const r=w.rockets[0],target={x:r.tx,y:r.ty};w.head={left:p.x-50,right:p.x+50,top:p.y-50,bottom:p.y+50};for(let i=0;i<42;i++)w.update(.04,640,800,null);assert.equal(r.tx,target.x);assert.equal(r.ty,target.y);assert.equal(w.blooms.length,0);assert.equal(w.rockets.length,0);
});
