import {thinFlat,prioritizeFlat} from './flat-budget.mjs';
import{thinCinema,interleaveCinema}from'./particle-quality.mjs';
import {REFINED_CINEMA_PATTERN,refinedCinemaShell,refinedCinemaChildren} from './cinema-refined-particles.mjs';
import {ORIGINAL_CINEMA_PATTERN,originalCinemaShell,originalCinemaChildren} from './cinema-original-particles.mjs';
import {contactRain,lineRainEntry,rainRate} from './rain-style.mjs';
import {handShell,handRing} from './handglow-particles.mjs';
import {FLAT_PATTERN,FLAT_PATTERNS,ACTIVE_FLAT_PATTERNS,FLAT_PALETTE,flatShell,flatChildren,flatOpening,flatAfterglints} from './flat-fireworks.mjs';
import {withHeadCollider,resolveBurstPoint} from './head-collision.mjs';
import {GIFT_PATTERNS,CINEMA_PATTERNS,GIFT_PALETTE,GIFT_BEAD_COLORS,giftShell,giftBeadChildren,cinemaShell,cinemaRingChildren,referencePattern} from './reference-bursts.mjs';
import {GIFT_COLORS,giftMaterial,giftSplash,giftLaunchOrigin,giftConfetti} from './gift-style.mjs';
import { clamp, collide, coverPoint } from './core.mjs';
import {chooseColors,roundColor} from './dandelion.mjs';
import {bouquetShell,poppingFlower,innerCrownParticles} from './bouquet.mjs';
import { SHELLS, PATTERNS, ACTIVE_PATTERNS, STAGED_PATTERNS, STICKER_PATTERN_BAG, rocketPoint, shellParticles, crossetteChildren, burstIsSafe, boundsDistance } from './pyro.mjs';

export class WaterSurface {
  constructor() { this.level = 0; this.y = new Float32Array(64); this.v = new Float32Array(64); }
  clear() { this.level = 0; this.y.fill(0); this.v.fill(0); }
  impact(x, width, size) {
    this.level += clamp(size * size * .42 / Math.max(width, 1), .16, .9);
    const i = Math.round(clamp(x / width) * 63); this.v[i] += 40 + size * 1.2;
    if (i > 0) this.v[i - 1] -= 14; if (i < 63) this.v[i + 1] -= 14;
  }
  update(dt, height, raining) {
    this.level = clamp(this.level, 0, height * .24);
    if (!raining) this.level = Math.max(0, this.level - dt * (8 + this.level * .10));
    const count = Math.max(1, Math.ceil(dt / .012)), step = dt / count;
    for (let s = 0; s < count; s++) {
      for (let i = 0; i < 64; i++) {
        const left = this.y[Math.max(0, i - 1)], right = this.y[Math.min(63, i + 1)];
        this.v[i] += (-48 * this.y[i] + 34 * (left + right - 2 * this.y[i]) - this.v[i] * 3.7) * step;
      }
      for (let i = 0; i < 64; i++) this.y[i] = clamp(this.y[i] + this.v[i] * step, -13, 13);
    }
  }
  surface(x, width, height) { return height - this.level + this.y[Math.round(clamp(x / width) * 63)]; }
}

// Downsampled person mask mapped through the exact mirrored video cover transform.
export class SilhouetteCollider {
  constructor(mask, vw, vh, width, height) { this.mask = mask; this.vw = vw; this.vh = vh; this.width = width; this.height = height; }
  contains(x, y) {
    const { mask, vw, vh, width, height } = this;
    const scale = Math.max(width / vw, height / vh);
    const u = ((width - x) - (width - vw * scale) / 2) / (vw * scale);
    const v = (y - (height - vh * scale) / 2) / (vh * scale);
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
    return !!mask.data[Math.floor(v * mask.height) * mask.width + Math.floor(u * mask.width)];
  }
  collide(p, old) {
    const dx = p.x - old.x, dy = p.y - old.y, steps = clamp(Math.ceil(Math.hypot(dx, dy) / 4), 1, 30);
    let hit = null, last = old;
    if (this.contains(old.x, old.y)) hit = old;
    else for (let i = 1; i <= steps; i++) {
      const q = { x: old.x + dx * i / steps, y: old.y + dy * i / steps };
      if (this.contains(q.x, q.y)) { hit = q; break; } last = q;
    }
    if (!hit) return false;
    let a = last, b = hit;
    if (!this.contains(a.x, a.y)) for (let i = 0; i < 5; i++) { const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; if (this.contains(m.x, m.y)) b = m; else a = m; }
    const radius = Math.max(6, this.width / this.mask.width * 2);
    let nx = 0, ny = 0;
    for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2, x = Math.cos(t), y = Math.sin(t); if (this.contains(b.x + x * radius, b.y + y * radius)) { nx -= x; ny -= y; } }
    if (Math.hypot(nx, ny) < .1) { nx = -p.vx; ny = -p.vy; }
    const length = Math.hypot(nx, ny) || 1; nx /= length; ny /= length;
    p.hitNormal = { x: nx, y: ny };
    p.x = b.x + nx * 4; p.y = b.y + ny * 4;
    for (let i = 0; i < 16 && this.contains(p.x, p.y); i++) { p.x += nx * 4; p.y += ny * 4; }
    const dot = p.vx * nx + p.vy * ny;
    if (dot < 0) { p.vx -= 1.68 * dot * nx; p.vy -= 1.68 * dot * ny; }
    return true;
  }
  boundaryPoints() {
    const result = [], { mask } = this;
    for (let y = 1; y < mask.height - 1; y += 2) for (let x = 1; x < mask.width - 1; x += 2) {
      const i = y * mask.width + x;
      if (mask.data[i] && (!mask.data[i - 1] || !mask.data[i + 1] || !mask.data[i - mask.width] || !mask.data[i + mask.width])) result.push(coverPoint({ x: x / mask.width, y: y / mask.height }, this.vw, this.vh, this.width, this.height));
    }
    return result;
  }
}

// Gamma(k=3) weights make a continuous, skewed fragment population. Sizes are
// cube roots of volume fractions, not arbitrary equal diameter multipliers.
export function fragmentDrops(parent, random = Math.random) {
  const speed = Math.hypot(parent.impactVX ?? parent.vx, parent.impactVY ?? parent.vy);
  const n = parent.hitNormal || { x: 0, y: -1 };
  const normalSpeed = Math.abs((parent.impactVX ?? parent.vx) * n.x + (parent.impactVY ?? parent.vy) * n.y);
  // Dimensionless art scale inspired by We proportional to normal speed squared × diameter.
  // CSS pixels are not SI units; this is an appearance control, not a measured Weber number.
  const energy = clamp((normalSpeed / 600) ** 2 * parent.size / 24);
  const count = 2 + (random() < energy * .7 ? 1 : 0) + (random() < energy * .25 ? 1 : 0);
  const weights = Array.from({ length: count }, () => -Math.log(Math.max(1e-8, random() * random() * random())));
  const sum = weights.reduce((a, b) => a + b, 0), retained = .74 - energy * .12;
  return weights.map((weight, i) => {
    const ratio = Math.cbrt(weight / sum * retained);
    const angle = (i / (count - 1) - .5) * 1.8 + (random() - .5) * .2;
    const nx = n.x * Math.cos(angle) - n.y * Math.sin(angle), ny = n.x * Math.sin(angle) + n.y * Math.cos(angle);
    const launch = Math.min(speed * .70, 330) * (.7 + random() * .3) * (.9 + (1 - ratio) * .3);
    const life = 1.1 + random() * .9;
    return { ...parent, x: parent.x + nx * 5, y: parent.y + ny * 5,
      vx: nx * launch + (parent.impactVX || 0) * .12, vy: ny * launch,
      size: parent.size * ratio, life, maxLife: life, generation: 1, touched: .20,
      angle: Math.atan2(nx, -ny), spin: (random() - .5) * 1.6, volume: (parent.volume ?? parent.size ** 3) * ratio ** 3 };
  });
}

export function fireworkEnvelope(p) {
  const remaining = clamp(p.life / p.maxLife), age = 1 - remaining;
  return { size: (.14 + .86 * Math.pow(remaining, .65)), light: Math.pow(remaining, 1.45) * Math.min(1, age * 32 + .35) };
}

// Compatibility state for saved sessions; screen droplets and trails are removed.
export class LensRain {
 constructor(){this.style='sticker';this.drops=[];this.trails=[];}
 clear(){this.drops.length=0;this.trails.length=0;}
 setStyle(style){this.style=style;this.clear();}
 update(){this.clear();}
}

export class StickerWorld {
  constructor(random = Math.random) { this.random = random;this.simulationTime=0; this.particles = [];this.pendingParticles=[]; this.blooms = []; this.rockets = [];this.launchers=[];this.innerBursts=[]; this.afterglows = []; this.events = []; this.head=null; this.giftMaterialStyle='random'; this.pattern = 'auto'; this.patternBag = []; this.lastPattern = null; this.limit = 700; this.collisions = 0;this.headCollisions=0; this.rainCredit = 0; this.effect = 'neutral'; this.pendingEffect=null;this.finishRemaining=0;this.style = 'sticker'; this.water = new WaterSurface(); this.lens = new LensRain(random); }
  clear() {this.pendingEffect=null;this.finishRemaining=0; this.particles.length = 0;this.pendingParticles.length=0; this.blooms.length = 0; this.rockets.length = 0;this.launchers.length=0;this.innerBursts.length=0; this.afterglows.length = 0; this.events.length = 0; this.collisions = 0;this.headCollisions=0; this.rainCredit = 0; this.water.clear(); this.lens.clear(); this.effect = 'neutral'; }
  setStyle(style) {if(['bloom','dandelion'].includes(style))style='coherent'; if (!['sticker', 'cinema', 'coherent','gift','flat','glow'].includes(style) || style === this.style) return; if([ORIGINAL_CINEMA_PATTERN,REFINED_CINEMA_PATTERN].includes(this.pattern)&&style!=='cinema')this.pattern='auto';this.pendingEffect=null;this.finishRemaining=0;this.patternBag=[];if((style==='flat'&&!FLAT_PATTERNS.includes(this.pattern))||(style!=='flat'&&FLAT_PATTERNS.includes(this.pattern)))this.pattern='auto';if(!['cinema','glow'].includes(style)&&this.pattern==='orbit')this.pattern='auto';if(['cinema','glow'].includes(style)&&this.pattern==='bouquet')this.pattern='auto';if((style==='gift'&&!GIFT_PATTERNS.includes(this.pattern))||(style!=='gift'&&this.pattern.startsWith('gift-'))||(!['cinema','glow'].includes(style)&&CINEMA_PATTERNS.includes(this.pattern)))this.pattern='auto';this.style = style;if(style==='cinema'&&this.pattern==='cinema-shell')this.pattern='cinema-rings'; this.lens.setStyle(style); this.particles.length = 0;this.pendingParticles.length=0; this.blooms.length = 0; this.rockets.length = 0;this.launchers.length=0;this.innerBursts.length=0; this.afterglows.length = 0; this.events.length = 0; this.rainCredit = 0; }
  requestEffect(next){
    const before=this.effect;
    if(next==='laugh'){this.pendingEffect=null;this.finishRemaining=0;this.setEffect(next);}
    else if(next==='smile'&&this.effect==='laugh'){
      // Fade the outgoing scene briefly; do not wait for every secondary burst.
      if(this.pendingEffect!=='smile')this.finishRemaining=.24;
      this.pendingEffect='smile';
    }else if(this.pendingEffect==='smile'){this.pendingEffect=next;}
    else if(this.effect==='laugh'&&(this.rockets.length||this.blooms.some(b=>b.age<.78)||((referencePattern(this.style,this.lastPattern)||FLAT_PATTERNS.includes(this.lastPattern))&&(this.particles.length||this.pendingParticles.length||this.innerBursts.length)))){
      this.pendingEffect=next;
      const staged=STAGED_PATTERNS.includes(this.lastPattern)||this.rockets.some(r=>STAGED_PATTERNS.includes(r.pattern))||(!['cinema','glow'].includes(this.style)&&(['crossette','bouquet'].includes(this.lastPattern)||this.rockets.some(r=>['crossette','bouquet'].includes(r.pattern))));
      const reference=[this.lastPattern,...this.rockets.map(r=>r.pattern)].some(p=>referencePattern(this.style,p)||FLAT_PATTERNS.includes(p));
      this.finishRemaining=Math.max(0,...this.rockets.map(r=>r.duration-r.age+(r.delayRemaining||0)))+(reference?(this.style==='flat'?5.6:this.style==='gift'?3.4:4.1):staged?2.2:.65);
    }else if(this.pendingEffect){this.pendingEffect=next;}
    else this.setEffect(next);
    return before!==this.effect;
  }
  setEffect(next) {
    this.pendingEffect=null;this.finishRemaining=0;
    if (next === this.effect) return;
    this.effect = next; this.particles.length = 0;this.pendingParticles.length=0; this.blooms.length = 0; this.rockets.length = 0;this.launchers.length=0;this.innerBursts.length=0; this.afterglows.length = 0; this.events.length = 0; this.rainCredit = next==='smile'?1:0;
    if (next === 'laugh') { this.water.clear(); this.lens.clear(); }
  }
  add(p) { if(this.style==='gift'&&p.type!=='drop'){p.giftMaterial=giftMaterial(p);p.tint ||= p.giftMaterial.kind==='twinkle'?GIFT_BEAD_COLORS[p.giftMaterial.color]:GIFT_PALETTE[p.giftMaterial.color];}if (this.particles.length < this.limit) this.particles.push(p); }
  makeRoom(count){
    const alive=this.particles.filter(p=>p.life>0),needed=Math.max(0,alive.length+count-this.limit),retiring=alive.filter(p=>p.retireRemaining!=null).length;
    if(needed<=retiring)return;
    // Reclaim slots only after a visible fade. Live emitters keep their children.
    const score=p=>(p.snowAnchor?4:p.cinemaDust?0:p.secondary?1:3)+p.life/Math.max(.01,p.maxLife);
    const candidates=alive.filter(p=>(!p.flatFx||p.flatRole==='dust'||p.flatFine)&&p.flatEmitAt==null&&p.ringSplitAt==null&&p.handSplitAt==null&&!p.ringAnchor&&p.retireRemaining==null&&!(p.delay>0)&&p.maxLife-p.life>.12).sort((a,b)=>score(a)-score(b));
    const layers=this.style==='cinema'?['innerRay','cinemaDust']:[],remaining=Object.fromEntries(layers.map(key=>[key,alive.filter(p=>p[key]&&p.retireRemaining==null).length])),floor=Math.max(4,Math.ceil(this.limit*.05));
    let marked=0;for(const p of candidates){if(marked>=needed-retiring)break;const layer=layers.find(key=>p[key]);if(layer&&remaining[layer]<=floor)continue;p.retireRemaining=.24;marked++;if(layer)remaining[layer]--; }
  }
  fitBatch(particles,share=.80){
    // Remove expired slots, never opaque particles, before admitting a new cohort.
    this.particles=this.particles.filter(p=>{if(p.life>0)return true;this.keepTrail(p);return false;});
    if(this.style==='flat')particles=thinFlat(particles);
    const budget=Math.min(particles.length,Math.max(1,Math.floor(this.limit*share))),major=particles.filter(p=>!p.cinemaDust),dust=particles.filter(p=>p.cinemaDust),sample=(arr,n)=>Array.from({length:n},(_,i)=>arr[Math.floor(i*arr.length/n)]);
    let picked=(this.style==='flat'?prioritizeFlat(particles,budget):this.style==='cinema'?thinCinema(particles,budget):null)||(major.length>budget?sample(major,budget):[...major,...sample(dust,Math.min(dust.length,budget-major.length))]);
    const room=Math.max(0,this.limit-this.particles.length);if(this.style==='cinema'&&room<picked.length)picked=interleaveCinema(picked);const immediate=picked.slice(0,room),waiting=picked.slice(room);
    // Bound deferred births too. Excess new detail is thinned before it becomes visible.
    this.pendingParticles.push(...waiting.slice(0,Math.max(0,this.limit-this.pendingParticles.length)));
    this.makeRoom(this.pendingParticles.length+immediate.length);return immediate;
  }
  admitPending(){
    const room=Math.max(0,this.limit-this.particles.length);
    for(const p of this.pendingParticles.splice(0,room))this.add(p);
    if(this.pendingParticles.length)this.makeRoom(this.pendingParticles.length);
  }
  rain(dt, width, height, strength) {
    if (this.effect !== 'smile') return;
    const digital = ['cinema','glow'].includes(this.style);
    this.rainCredit = Math.min(10, this.rainCredit + dt * rainRate(this.style,width,height,strength));
    while (this.rainCredit >= 1) {
      this.rainCredit--;
      const depth = .35 + this.random() * .65;
      const size = digital ? (7.2 + Math.pow(this.random(), 1.25) * 6.8) * (.78+depth*.22) : this.style==='gift'?(18+this.random()*13)*2/3*.78:this.style==='flat'?5+this.random()**1.5*17:18+this.random()*13;
      const life = height / 210 + 4;
      const spawnRandom=this.random(),rainX=this.style==='gift'?(((this.rainSequence=(this.rainSequence||0)+1)*.61803398875+spawnRandom*.12)%1)*width:spawnRandom*width,entry=digital?lineRainEntry(width,height,depth,spawnRandom):null;
      this.add({ type: 'drop', x: entry?.x??rainX, y: entry?.y??-45, vx: digital?entry.vx:this.style==='flat'?52+depth*45:-10+this.random()*20, vy: digital ? entry.vy : 360 + this.random() * 180, gravity:digital?620:this.style==='gift'?500:this.style==='flat'?470:65, size, life, maxLife: life, variant: Math.floor(this.random() * 5), angle: this.style==='flat'?-.23:0, spin: 0, touched: 0, generation: 0, depth, rainTone:Math.floor(this.random()*5),rainVariant:this.random()<.10?'hollow':this.random()<.16?'soft':'solid',dropShape:Math.floor(this.random()*3),rainLength:digital?26+depth*44:0, volume: size ** 3 });
    }
  }
  split(parent) { const parts=['gift','cinema','glow'].includes(this.style)?contactRain(parent,this.random,this.style):fragmentDrops(parent,this.random),flatScale=this.style==='flat'?Math.min(.78,8.5/Math.max(...parts.map(p=>p.size))):1;for(const child of parts){if(this.style==='flat'){child.size*=flatScale;child.volume=child.size**3;child.flatRound=true;child.rainVariant='solid';child.noRecollision=true;child.gravity=620;child.life=child.maxLife=.52+this.random()*.12;}this.add(child);} }
  setPattern(pattern) { if(this.style==='cinema'&&[ORIGINAL_CINEMA_PATTERN,REFINED_CINEMA_PATTERN].includes(pattern)){this.pattern=pattern;return;} if(this.style==='flat'&&pattern==='flat-reprise')pattern='flat-petals';if(this.style==='gift'&&pattern!=='auto')pattern='gift-twinkle';if(pattern==='cinema-inner')pattern='cinema-shell';if(this.style==='cinema'&&pattern==='cinema-shell')pattern='cinema-rings'; if(this.style==='flat'&&FLAT_PATTERNS.includes(pattern)){this.pattern=pattern;return;}if((this.style==='gift'&&GIFT_PATTERNS.includes(pattern))||(['cinema','glow'].includes(this.style)&&CINEMA_PATTERNS.includes(pattern))){this.pattern=pattern;return;}if(!['cinema','glow'].includes(this.style)&&pattern==='orbit')return;if (pattern === 'auto' || (this.style!=='flat'&&SHELLS[pattern]) || (pattern==='bouquet'&&!['cinema','glow'].includes(this.style))) this.pattern = pattern; }
  nextPattern() {
    if(this.style==='flat'&&this.pattern==='flat-reprise')return 'flat-petals';
    if(this.style==='gift')return 'gift-twinkle';
    if(this.style==='cinema'&&(this.pattern==='auto'||this.pattern==='cinema-shell'))return 'cinema-rings';
    if (this.pattern !== 'auto') return this.pattern;
    if (!this.patternBag.length) {
      this.patternBag = [...(this.style==='gift'?GIFT_PATTERNS:['cinema','glow'].includes(this.style)?CINEMA_PATTERNS:this.style==='flat'?ACTIVE_FLAT_PATTERNS:STICKER_PATTERN_BAG)];
      for(let i=this.patternBag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.patternBag[i],this.patternBag[j]]=[this.patternBag[j],this.patternBag[i]];}
      if (this.patternBag.at(-1) === this.lastPattern) [this.patternBag[0], this.patternBag[this.patternBag.length-1]] = [this.patternBag.at(-1), this.patternBag[0]];
    }
    if(this.patternBag.at(-1)===this.lastPattern){const different=this.patternBag.findIndex(p=>p!==this.lastPattern);if(different>=0)[this.patternBag[different],this.patternBag[this.patternBag.length-1]]=[this.patternBag.at(-1),this.patternBag[different]];}
    return this.patternBag.pop();
  }
  event(type, detail) { if(this.events.length<48)this.events.push({type,style:this.style,...detail}); }
  consumeEvents() { return this.events.splice(0); }
  launch(x,y,width,height,scale=1,layout=null) {
    if (this.effect !== 'laugh' || this.rockets.length >= 3) return false;
    const gift=this.style==='gift',pattern=this.nextPattern(),preferredX=layout?.launchX??width*(.24+this.random()*.52),origin=gift?giftLaunchOrigin(preferredX,x,width,height,this.head):{x:preferredX,y:height+22},sx=origin.x,sy=origin.y;
    const duration=(gift?.52:.58)+this.random()*.10;
    this.rockets.push({sx,sy,tx:x,ty:y,x:sx,y:sy,arc:clamp((sy-y)*(.045+this.random()*.025),12,40),age:0,delayRemaining:0,duration,scale,pattern,variant:pattern==='willow'?3:Math.floor(this.random()*5),trail:[],trailClock:0,radius:layout?.radius||scale*205,planned:!!layout,clearance:layout?.clearance??84});
    this.event('launch',{x:sx/width,pattern,duration});return true;
  }
  burst(x,y,scale=1,pattern=this.nextPattern(),eventX=.5) {
    if(this.effect!=='laugh')return;
    if(this.style==='flat'&&pattern==='flat-reprise')pattern='flat-petals';
    if(pattern==='cinema-inner')pattern='cinema-shell';
    if(this.style==='gift')pattern='gift-twinkle';
    if(!['cinema','glow'].includes(this.style)&&pattern==='orbit')pattern='crossette';
    this.lastPattern=pattern;
    const flat=this.style==='flat'&&FLAT_PATTERNS.includes(pattern),digital=['cinema','glow'].includes(this.style),referenceCinema=digital&&referencePattern(this.style,pattern),shell=flat?flatShell(x,y,scale,this.random,pattern):this.style==='gift'?giftShell(pattern,x,y,scale,this.random,this.giftMaterialStyle):referenceCinema?(pattern===REFINED_CINEMA_PATTERN?refinedCinemaShell(x,y,scale,this.random,this.simulationTime):pattern===ORIGINAL_CINEMA_PATTERN?originalCinemaShell(x,y,scale,this.random):(this.style==='glow'?handShell:cinemaShell)(pattern,x,y,scale,this.random)):pattern==='bouquet'?bouquetShell(x,y,scale,this.random):shellParticles(pattern,x,y,scale,digital,this.random);
    this.blooms.push({x,y,age:0,flatFx:flat,life:digital?1.8:.9,size:Math.min(digital?46:62,Math.max(digital?24:38,(digital?38:52)*scale)),rotation:this.random()*1.2,variant:shell.variant,pattern,power:digital?.5:.55,seed:this.random()*100,referenceCinema,tint:referenceCinema?'#FFD54A':undefined});
    if([ORIGINAL_CINEMA_PATTERN,REFINED_CINEMA_PATTERN].includes(pattern))this.blooms.at(-1).classicCinema=true;
    if(pattern===REFINED_CINEMA_PATTERN)this.blooms.at(-1).refinedCinema=true;
    if(referenceCinema)this.blooms.at(-1).size=Math.min(115,Math.max(48,90*scale));
    if(this.blooms.length>80)this.blooms.shift();
    if(flat&&this.style==='coherent')for(const p of shell.particles){p.tint=FLAT_PALETTE[shell.variant];p.variant=shell.variant;}
    if(this.style==='coherent'&&!flat){
      const bloom=this.blooms.at(-1),pair=chooseColors(()=>((shell.variant*.19+bloom.seed*.0042)%1));
      bloom.tint=pair[0];for(const p of shell.particles){p.roundColors=pair;p.tint=pair[0];p.fireworkStage=1;}
    }
    if(this.style==='glow')this.blooms.at(-1).tint=shell.tint;
    if(flat){shell.particles.push(...flatOpening(x,y,scale,shell.variant,this.random,pattern));const density=this.limit>=700?1:Math.max(.12,(this.limit-20)/700);for(const p of shell.particles)p.flatDensity=density;}
    if(this.style==='gift'){this.blooms.at(-1).tint=GIFT_COLORS[0];this.blooms.at(-1).giftFinish=shell.finish;}
    for(const p of (this.style==='gift'||referenceCinema||flat?this.fitBatch(shell.particles):shell.particles))this.add(p);
    if(pattern==='chrysanthemum-inner'){
      const b=this.blooms.at(-1),p=shell.particles[0];
      this.innerBursts.push({x,y,scale,variant:shell.variant,roundColors:p.roundColors,seed:b.seed,age:0,delay:.64,pattern});
      if(this.innerBursts.length>3)this.innerBursts.shift();
    }
    this.event('burst',{x:eventX,pattern,scale});
  }
  keepTrail(p,life=.65) {
    if(this.style==='cinema'&&p.ringBlob)return; // A spent short reprise tail must not reappear as a lingering trail.
    if((!['cinema','glow'].includes(this.style)&&!p.flowerCarrier&&!p.carrier)||!p.trail||p.trail.length<2||this.afterglows.length>=150)return;
    this.afterglows.push({carrier:p.carrier,tint:p.cinematic&&!p.handDrawn?(p.trailTint||p.tint):p.tint,fireworkStage:p.fireworkStage,points:p.trail.map(q=>({...q})),x:p.x,y:p.y,life,maxLife:life,variant:p.variant,size:p.size,light:fireworkEnvelope(p).light || .04});
  }
  update(dt, width, height, collider, velocity) {
    dt = clamp(dt, 0, .05);const particleRate=this.effect==='laugh'?(this.style==='gift'?1.35:this.style==='flat'?.88:!(['cinema','glow'].includes(this.style)&&referencePattern(this.style,this.lastPattern))?1.20:1):1,particleDT=dt*particleRate;
    this.simulationTime+=particleDT;
    if(this.head&&(this.style==='gift'||['cinema','glow'].includes(this.style)||this.style==='flat'))collider=withHeadCollider(collider,this.head);
    for(const tail of this.afterglows)tail.life-=particleDT;
    this.afterglows=this.afterglows.filter(t=>t.life>0);
    for(const launcher of this.launchers)launcher.age+=dt;
    this.launchers=this.launchers.filter(p=>p.age<.80);
    for(const r of this.rockets){
      let flightDT=dt;
      if(r.delayRemaining>0){flightDT=Math.max(0,dt-r.delayRemaining);r.delayRemaining=Math.max(0,r.delayRemaining-dt);if(r.delayRemaining>0)continue;this.event('launch',{x:r.sx/width,pattern:r.pattern,duration:r.duration});}
      r.age+=flightDT;r.trailClock+=flightDT;
      if(!referencePattern(this.style,r.pattern)&&r.planned&&this.head&&r.age/r.duration>.72&&!burstIsSafe({x:r.tx,y:r.ty,clearance:r.clearance},this.head)){
        // Never steer an already launched shell. A blocked flight is cancelled;
        // the next launch chooses a fresh clear destination.
        r.cancelled=true;this.event('flight-blocked',{x:r.tx/width});
      }
      const q=rocketPoint(r,r.age/r.duration);r.x=q.x;r.y=q.y;
      // A short-lived white wake shrinks naturally as the payload slows.
      if(r.trailClock>=.016){r.trailClock%=.016;r.trail.unshift({x:r.x,y:r.y,age:r.age});}
      r.trail=r.trail.filter(p=>r.age-p.age<=.09).slice(0,8);
      if(r.age>=r.duration&&!r.cancelled&&!r.detonated){
        const point=referencePattern(this.style,r.pattern)&&r.planned?resolveBurstPoint(r,this.head,width,height):{x:r.tx,y:r.ty};
        if(point){if(Math.hypot(point.x-r.tx,point.y-r.ty)>1)this.event('flight-adjusted',{x:point.x/width});this.burst(point.x,point.y,r.scale,r.pattern,point.x/width);r.detonated=true;}
        else{r.clearWait=(r.clearWait||0)+dt;if(r.clearWait>.85){r.cancelled=true;this.event('flight-blocked',{x:r.tx/width,reason:'no-clear-sky'});}}
      }
    }
    this.rockets=this.rockets.filter(r=>!r.detonated&&!r.cancelled);
    for(const inner of this.innerBursts){
      inner.age+=dt;if(inner.age<inner.delay)continue;inner.done=true;
      if(!burstIsSafe({x:inner.x,y:inner.y,clearance:84},this.head))continue;
      const parent={...inner,vx:0,vy:0},children=innerCrownParticles(parent,this.random);
      for(const p of children){p.pattern=inner.pattern;p.burstStage=2;}
      // Keep the small inner sphere visible when the device has reduced its budget.
      for(const p of this.fitBatch(children,.55))this.add(p);
      this.blooms.push({x:inner.x,y:inner.y,age:0,life:.7,size:30*inner.scale,rotation:0,variant:inner.variant,tint:roundColor(parent,2),pattern:inner.pattern,secondary:true,seed:inner.seed});
      if(this.blooms.length>80)this.blooms.shift();this.event('crackle',{x:inner.x/width,pattern:inner.pattern,stage:2,inner:true});
    }
    this.innerBursts=this.innerBursts.filter(b=>!b.done);
    if(this.particles.length>this.limit)this.makeRoom(0);
    if(this.pendingParticles.length>this.limit)this.pendingParticles.length=this.limit;
    this.water.update(dt,height,this.effect==='smile');this.lens.clear();
    const additions = [], secondary = [], steps = Math.max(1, Math.ceil(particleDT / .012)), step = particleDT / steps;
    for (const p of this.particles) if (!p.flatFx && p.trail && p.tailLength!==0 && !p.micro && !(p.delay>0)) { p.trailClock = (p.trailClock || 0) + particleDT; if (p.trailClock >= .024) { p.trailClock %= .024; p.trail.unshift({ x: p.x, y: p.y }); if (p.trail.length > (p.tailLength || 25)) p.trail.pop(); } }
    for (let s = 0; s < steps; s++) for (const p of this.particles) {
      if (p.life <= 0) continue;
      if(p.delay>0){p.delay=Math.max(0,p.delay-step);continue;}
      if(p.retireRemaining!=null){p.retireRemaining-=step;if(p.retireRemaining<=0){p.life=0;continue;}}
      const old = { x: p.x, y: p.y }; p.life -= step;p.wallAge=(p.wallAge||0)+step/particleRate;
      if(p.flatEmitAt!=null&&(p.maxLife-p.life>=p.flatEmitAt||(p.flatStopSpeed&&p.maxLife-p.life>.12&&Math.hypot(p.vx,p.vy)<=p.flatStopSpeed))){
        // Children inherit the emitter's actual position, including any collision.
        secondary.push(...flatChildren(p,this.random));this.event('crackle',{x:clamp(p.x/width),pattern:p.pattern,stage:p.flatRole==='seed'||p.flatReprise?2:3});
        p.flatEmitAt=null;p.life=0;continue;
      }
      if(p.handSplitAt!=null&&p.maxLife-p.life>=p.handSplitAt){if(!p.hasCollided&&(!this.head||boundsDistance(p.x,p.y,this.head)>=40)){secondary.push(...handRing({...p,scale:p.scale*.62},this.random));this.event('crackle',{x:clamp(p.x/width),pattern:p.pattern,stage:2});}p.handSplitAt=null;}
      if(p.ringSplitAt!=null&&p.maxLife-p.life>=p.ringSplitAt){
        const safe=(!this.head||boundsDistance(p.x,p.y,this.head)>=48)&&p.x>12&&p.x<width-12&&p.y>28&&p.y<height*.78;
        if(safe){secondary.push(...(p.refinedCinema?refinedCinemaChildren:p.classicCinema?originalCinemaChildren:cinemaRingChildren)(p,this.random));this.event('crackle',{x:clamp(p.x/width),pattern:p.pattern,stage:2});}
        p.reprised=safe;p.ringSplitAt=null;
      }
      if((p.carrier||p.flowerCarrier)&&(p.flowerAt||p.splitAt)&&p.maxLife-p.life>=(p.flowerAt||p.splitAt)&&p.vy>22){
        const gap=this.head?clamp((this.head.bottom-this.head.top)*.20,48,76):0;
        const safe=(!this.head||boundsDistance(p.x,p.y,this.head)>=gap)&&p.x>12&&p.x<width-12&&p.y>35&&p.y<height*.78;
        if(safe){secondary.push(...poppingFlower(p,this.random,p.flowerCarrier?{stars:5,sparks:3,mini:true}:STAGED_PATTERNS.includes(p.pattern)?{stars:18,sparks:8,mini:true,spread:3.3,lifeScale:1.25}:{}).map(child=>({...child,pattern:p.pattern,burstStage:p.flowerCarrier?3:2})));this.keepTrail(p,.48);p.trail.length=0;p.life=0;
          this.blooms.push({x:p.x,y:p.y,age:0,life:.7,size:STAGED_PATTERNS.includes(p.pattern)?30+this.random()*8:17+this.random()*9,rotation:this.random()*6.28,variant:p.variant,tint:roundColor(p,p.flowerCarrier?3:2),pattern:p.pattern,secondary:true,seed:p.seed});
          if(this.blooms.length>80)this.blooms.shift();this.event('crackle',{x:clamp(p.x/width),pattern:p.pattern,stage:p.flowerCarrier?3:2});
        }
        p.splitAt=null;p.flowerAt=null;continue;
      }
      if(p.splitAt && !p.carrier && !p.secondary && p.maxLife-p.life>=p.splitAt){secondary.push(...crossetteChildren(p,this.random,!['cinema','glow'].includes(this.style)));
        if(!['cinema','glow'].includes(this.style)){this.blooms.push({x:p.x,y:p.y,age:0,life:.7,size:18,rotation:p.angle,variant:p.variant,tint:roundColor(p,2),pattern:p.pattern,secondary:true,seed:p.seed});if(this.blooms.length>80)this.blooms.shift();}
        this.keepTrail(p,.6);p.trail.length=0;p.life=0;this.event('crackle',{x:clamp(p.x/width),pattern:p.pattern,stage:2});continue;}
      if(p.hasCollided)p.hitAge=(p.hitAge||0)+step;
      p.touched = Math.max(0, p.touched - step);
      p.vy += (p.giftSplash?0:p.type === 'drop' ? p.gravity??(p.generation ? 500 : ['cinema','glow'].includes(this.style) ? 130 : 65) : (p.gravity ?? (['cinema','glow'].includes(this.style) ? 95 : 180))) * step;
      if (p.type !== 'drop' || p.generation) { const drag = Math.exp(-step * (p.giftSplash?7:p.generation ? (p.drag??1.1) : (p.drag ?? .55))); p.vx *= drag; p.vy *= drag; }
      if(p.type!=='drop')p.vx+=(p.drift||0)*step;
      p.x += p.vx * step; p.y += p.vy * step; p.angle += (p.spin || 0) * step;
      const impactVX = p.vx, impactVY = p.vy;
      const collision = !(p.flatFx&&p.flatRole==='ring')&&!p.giftSplash&&!p.noRecollision&&(p.type==='drop'||(!p.hasCollided&&p.vy>0&&p.wallAge>=(p.collisionDelay||0))) && p.touched === 0 && (collider?.collide ? collider.collide(p, old) : collide(p, old, collider, velocity));
      if (collision) {
        this.collisions++;if(p.hitRegion==='head')this.headCollisions++;p.hitAge=0; p.touched = .20;
        if(p.trail){this.keepTrail(p,.35);p.trail.length=0;}
        if (p.type === 'drop' && p.generation === 0) { additions.push({ ...p, impactVX, impactVY }); p.life = 0; }
        // A first-wave gift piece shatters at the resolved surface contact.
        // Child paper pieces are marked collided so they cannot recursively shatter.
        if(this.style==='gift'&&p.referenceGift&&!p.secondary){
          secondary.push(...giftConfetti({...p,vx:impactVX,vy:impactVY},this.random).map(child=>({...child,hasCollided:true,hitAge:0,hitRegion:p.hitRegion,hitNormal:p.hitNormal,touched:.32,collisionBorn:true,delay:0})));
          this.event('crackle',{x:clamp(p.x/width),pattern:p.pattern,stage:2,collision:true,region:p.hitRegion});p.giftSplitAt=null;p.life=0;continue;
        }
        if(p.type!=='drop'){const reference=p.referenceGift||p.cinematic||p.flatFx;p.vx*=reference?.78:.64;p.vy*=reference?.88:.42;p.hasCollided=true;if(!reference)p.life=Math.min(p.life,.65);p.touched=.32;}
      }
      if(p.flatFx&&p.trail&&p.tailLength){
        p.trailClock=(p.trailClock||0)+step;
        if(p.trailClock>=.016){p.trailClock%=.016;p.trail.unshift({x:p.x,y:p.y,age:p.maxLife-p.life});}
        const age=p.maxLife-p.life;p.trail=p.trail.filter(q=>age-q.age<=(p.trailAge??.28)).slice(0,p.tailLength);
      }
      if(p.outerGlints&&p.pattern!=='flat-medallion'&&!p.outerSpent&&p.life<=.32){p.outerSpent=true;if(p.retireRemaining==null)secondary.push(...flatAfterglints(p,this.random));}
      if (p.type === 'drop' && !p.giftSplash && !p.rainRipple && p.life > 0 && p.y >= this.water.surface(p.x, width, height) - 2) { if(['cinema','glow'].includes(this.style)&&!p.generation)additions.push({...p,hitNormal:{x:0,y:-1}});this.water.impact(p.x, width, ['cinema','glow'].includes(this.style) ? Math.cbrt(p.volume ?? p.size ** 3) * 3.2 : p.size); p.life = 0; }
    }
    for (const p of additions) this.split(p);
    for(const p of (secondary.some(p=>p.referenceGift||p.cinematic||p.flatFx)?this.fitBatch(secondary,.70):secondary))this.add(p);
    let n = 0; for (const p of this.particles) { if (p.life > 0 && (p.flatFx || (p.y < height + 100 && p.x > -150 && p.x < width + 150))) this.particles[n++] = p; else if(p.life<=0)this.keepTrail(p,p.pattern==='willow'?.9:.55); }
    this.particles.length = n;this.admitPending();
    for (const b of this.blooms){b.age+=particleDT;if(this.style==='gift')b.tint=GIFT_COLORS[0];}
    this.blooms = this.blooms.filter(b => b.age < b.life);
    if(this.pendingEffect){this.finishRemaining-=dt;if(this.finishRemaining<=0)this.setEffect(this.pendingEffect);}
  }
}
