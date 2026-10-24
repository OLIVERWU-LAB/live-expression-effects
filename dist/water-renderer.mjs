// Smooth filled water plus one restrained surface highlight, shared by all styles.
export function traceWaterSurface(g,water,width,height){
 const n=24,points=Array.from({length:n+1},(_,i)=>({x:i/n*width,y:water.surface(i/n*width,width,height)}));
 g.beginPath();g.moveTo(points[0].x,points[0].y);
 for(let i=0;i<n;i++){const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(n,i+2)];g.bezierCurveTo(b.x+(c.x-a.x)/6,b.y+(c.y-a.y)/6,c.x-(d.x-b.x)/6,c.y-(d.y-b.y)/6,c.x,c.y);}
}
export function drawWaterSurface(g,water,width,height,digital=false){
 if(water.level<.3)return;g.save();traceWaterSurface(g,water,width,height);g.lineTo(width,height+2);g.lineTo(0,height+2);g.closePath();
 const fill=g.createLinearGradient(0,height-water.level,0,height);fill.addColorStop(0,digital?'#82C4E52B':'#67B8DC82');fill.addColorStop(1,digital?'#163A6266':'#348FC4AE');g.fillStyle=fill;g.fill();
 traceWaterSurface(g,water,width,height);g.strokeStyle=digital?'#E8FFFF70':'#E8FFFFA0';g.lineWidth=digital?1.15:1.3;g.lineCap='round';g.lineJoin='round';g.stroke();g.restore();
}
// Native-video styles only sample the small water area, not a full-frame WebGL pass.
export function drawWaterRefraction(g,image,water,width,height,time,mirror=false){
 const vw=image?.videoWidth||image?.width,vh=image?.videoHeight||image?.height;if(!(water.level>=2)||!vw||!vh)return;
 const scale=Math.max(width/vw,height/vh),ox=(width-vw*scale)/2,oy=(height-vh*scale)/2,top=Math.max(0,height-water.level-6),bands=Math.max(1,Math.min(24,Math.ceil((height-top)/8))),step=(height-top)/bands;
 g.save();traceWaterSurface(g,water,width,height);g.lineTo(width,height);g.lineTo(0,height);g.closePath();g.clip();g.globalAlpha=.55;
 if(mirror){g.translate(width,0);g.scale(-1,1);}
 for(let i=0;i<bands;i++){
  const y=top+i*step,depth=Math.min(1,(y-top)/24),dx=(Math.sin(y*.045+time*.0011)*1.3+Math.sin(y*.018-time*.0007)*.6)*depth,dy=Math.sin(i*.57+time*.001)*.55*depth,sw=width/scale/1.006,sh=(step+.6)/scale;
  const sx=Math.max(0,Math.min(vw-sw,(-ox+dx)/scale+(width/scale-sw)/2)),sy=Math.max(0,Math.min(vh-sh,(y-oy+dy)/scale));
  g.drawImage(image,sx,sy,sw,sh,0,y,width,step+.6);
 }
 g.restore();
}
