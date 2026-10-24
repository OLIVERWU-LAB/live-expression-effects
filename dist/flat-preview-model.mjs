import{StickerWorld}from'./effects.mjs';
import{ACTIVE_FLAT_PATTERNS,drawFlatFireworks,drawFlatLaunch}from'./flat-fireworks.mjs';

const names={'flat-petals':'花瓣涟漪','flat-medallion':'同心礼花','flat-star-crown':'星冠绽放','flat-festival':'锦簇花火'};
export const PREVIEW_STYLES=Object.freeze(ACTIVE_FLAT_PATTERNS.map((pattern,i)=>Object.freeze({pattern,number:String(i+1).padStart(2,'0'),name:names[pattern]})));
export const PREVIEW_WIDTH=1200,PREVIEW_HEIGHT=1050,PREVIEW_DURATION=4.8;
const randomFor=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);

// Same live world, launch and drawing functions. Only the neutral viewing stage
// and a fixed random seed are specific to this comparison; no camera or audio.
export class FlatPreview{
 constructor(pattern){if(!ACTIVE_FLAT_PATTERNS.includes(pattern))throw Error('Unknown live flat style');this.pattern=pattern;this.reset();}
 reset(){const world=new StickerWorld(randomFor(31));world.setStyle('flat');world.setPattern(this.pattern);world.setEffect('laugh');world.limit=700;world.viewport={width:PREVIEW_WIDTH,height:PREVIEW_HEIGHT};world.launch(PREVIEW_WIDTH/2,330,PREVIEW_WIDTH,PREVIEW_HEIGHT,.78,{launchX:PREVIEW_WIDTH/2});this.world=world;this.time=0;}
 advance(target){target=Math.max(0,Math.min(PREVIEW_DURATION,target));if(target<this.time-1e-8)this.reset();while(this.time<target-1e-8){const dt=Math.min(1/120,target-this.time);this.world.update(dt,PREVIEW_WIDTH,PREVIEW_HEIGHT,null);this.world.consumeEvents();this.time+=dt;}return this.world;}
}
export function paintFlatPreview(canvas,preview){
 const g=canvas.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,canvas.width,canvas.height);g.fillStyle='#090b10';g.fillRect(0,0,canvas.width,canvas.height);g.save();g.scale(canvas.width/960,canvas.height/840);g.translate(-120,-70);for(const rocket of preview.world.rockets)drawFlatLaunch(g,rocket);drawFlatFireworks(g,preview.world);g.restore();
}
