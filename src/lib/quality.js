// Pick a rendering tier once at startup. Phones and low-core devices get a lighter pipeline
// (lower pixel ratio, smaller shadow map, cheaper ambient occlusion) so the simulation stays smooth.
const mq = (q) => typeof window !== 'undefined' && window.matchMedia?.(q).matches;

const coarse = mq('(pointer: coarse)');
const small = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 700;
const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 8;

export const LOW_POWER = coarse || small || cores <= 4;

export const QUALITY = LOW_POWER
  ? { maxDpr: 1.5, shadowMap: 1024, ao: 'low' }
  : { maxDpr: 2, shadowMap: 2048, ao: 'high' };
