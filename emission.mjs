import {clamp} from './core.mjs?v=2adad563e72b';
import {FIRE_COLORS,PAPER_COLORS} from './pyro.mjs?v=2adad563e72b';

export const hexRGB=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
export function mixHex(a,b,t){const x=hexRGB(a),y=hexRGB(b);return '#'+x.map((v,i)=>Math.round((v+(y[i]-v)*clamp(t))*255).toString(16).padStart(2,'0')).join('');}
// A single colour timeline drives spark trails, bloom, atmosphere and reflected light.
// Only a tiny point core is hotter: the broad light never has a white component added.
export const EMBER_COLORS=FIRE_COLORS.map(color=>Array.from({length:10},(_,i)=>
 i<2?mixHex(color,'#FFE4AF',.14*(1-i)):mixHex(color,'#C56832',Math.max(0,(i-5)/4))));
export function emberPhase(p){const age=Math.max(0,p.maxLife-p.life),phase=clamp(1-p.life/p.maxLife);return age<.06?0:phase<.62?Math.min(5,2+Math.floor(phase*6)):Math.min(9,6+Math.floor((phase-.62)/.38*4));}
export function emissionColor(p,digital){return p.tint|| (digital?EMBER_COLORS[p.variant%5][emberPhase(p)]:PAPER_COLORS[p.variant%5]);}
