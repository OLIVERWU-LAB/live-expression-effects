import{StickerWorld}from'./effects.mjs';import{CINEMA_COMPARISON_PATTERNS}from'./reference-bursts.mjs';
const rng=s=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
// Independent worlds share one clock and seed; neither version borrows the other's particles.
export class CinemaComparison{
 constructor(seed=31,patterns=CINEMA_COMPARISON_PATTERNS){this.seed=seed;this.patterns=[...patterns];this.reset();}
 reset(){this.time=0;this.worlds=this.patterns.map(pattern=>{const w=new StickerWorld(rng(this.seed));w.setStyle('cinema');w.setEffect('laugh');w.setPattern(pattern);w.burst(500,270,.9,pattern);return w;});return this;}
 seek(time){this.reset();return this.advance(time);}
 advance(time){time=Math.max(0,Math.min(6,time));if(time<this.time)this.reset();while(this.time<time-1e-9){const dt=Math.min(.01,time-this.time);for(const w of this.worlds)w.update(dt,1000,800,null);this.time+=dt;}return this.worlds;}
}
