import {clamp} from './core.mjs?v=af1483e5221b';
// Resource pressure fades live particles before their slots can be reused.
export const particleVisibility=p=>p.retireRemaining==null?1:clamp(p.retireRemaining/.24);
