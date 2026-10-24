import {clamp} from './core.mjs?v=5dc30a03a159';
// Resource pressure fades live particles before their slots can be reused.
export const particleVisibility=p=>p.retireRemaining==null?1:clamp(p.retireRemaining/.24);
