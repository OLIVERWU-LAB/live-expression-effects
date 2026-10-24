import {clamp} from './core.mjs?v=a9c88dfd0e4a';
// Resource pressure fades live particles before their slots can be reused.
export const particleVisibility=p=>p.retireRemaining==null?1:clamp(p.retireRemaining/.24);
