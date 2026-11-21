// Pick a rendering tier once at startup. Phones/tablets get a lighter pipeline (lower pixel
// ratio, smaller shadow map, cheaper ambient occlusion) so the simulation stays smooth.
//
// Deliberately NOT based on navigator.hardwareConcurrency: Brave, Firefox and Safari privacy
// protections fake or under-report it, which wrongly put fast desktops on the low tier.
// Override with ?quality=high or ?quality=low in the URL.
const mq = (q) => typeof window !== 'undefined' && window.matchMedia?.(q).matches;
const param = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('quality') : null;

const coarse = mq('(pointer: coarse)') && !mq('(pointer: fine)');
const small = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 600;

export const LOW_POWER = param === 'low' ? true : param === 'high' ? false : coarse || small;

const deviceDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

export const QUALITY = LOW_POWER
  ? // Phones: up to 2× (sharp on 3× screens without the cost of full native resolution), floor 1.25×.
    { maxDpr: Math.min(deviceDpr, 2), minDpr: Math.min(deviceDpr, 1.25), shadowMap: 1024, ao: 'low' }
  : // Desktop never drops below 1.5× on Retina screens — dropping to 1× is what makes it look blurry.
    { maxDpr: Math.min(deviceDpr, 2), minDpr: Math.min(deviceDpr, 1.5), shadowMap: 2048, ao: 'high' };
