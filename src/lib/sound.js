// Procedural sound effects (Web Audio, no audio files).
// Every sound is synthesised from short filtered-noise bursts and decaying tones, tuned to read
// as small hard-plastic dominoes on a wooden table.

let ctx = null;
let master = null;
let noise = null;
let roll = null; // continuous ball-rolling voice
let voices = 0;
const MAX_VOICES = 28;
let muted = false;
try { muted = localStorage.getItem('dominoi:muted') === '1'; } catch { /* storage unavailable */ }

function ensure() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.attack.value = 0.002;
    comp.release.value = 0.12;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.7;
    master.connect(comp).connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Browsers only allow audio after a user gesture – call this from the first pointer/key event. */
export function unlockAudio() { ensure(); }

export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('dominoi:muted', m ? '1' : '0'); } catch { /* ignore */ }
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.7, ctx.currentTime, 0.03);
}

const rand = (a, b) => a + Math.random() * (b - a);

function voice(dur) {
  if (voices >= MAX_VOICES) return false;
  voices++;
  setTimeout(() => { voices--; }, (dur + 0.05) * 1000);
  return true;
}

/** Filtered noise burst — the "click" of a hard surface. */
function burst({ t, freq, q = 5, gain = 0.3, decay = 0.04, type = 'bandpass' }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.8);
  src.stop(t + decay + 0.02);
}

/** Short decaying tone — the resonant "body" of a struck piece. */
function tone({ t, freq, gain = 0.2, decay = 0.08, type = 'sine', slide = 1 }) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide !== 1) o.frequency.exponentialRampToValueAtTime(freq * slide, t + decay);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + decay + 0.02);
}

function play(dur, fn, delay = 0) {
  if (muted || !ensure() || !voice(dur)) return;
  fn(ctx.currentTime + delay);
}

// ── editing ───────────────────────────────────────────────────
export const sfx = {
  /** A domino set down on the table. */
  place(pitch = 1) {
    play(0.12, (t) => {
      const p = pitch * rand(0.93, 1.08);
      burst({ t, freq: 1900 * p, q: 3, gain: 0.22, decay: 0.035 });
      tone({ t, freq: 420 * p, gain: 0.16, decay: 0.07, slide: 0.8 });
      tone({ t, freq: 1350 * p, gain: 0.05, decay: 0.05 });
    });
  },
  /** A piece set on top of another — brighter, two tiny contacts. */
  stack() {
    play(0.15, (t) => {
      const p = rand(0.95, 1.05);
      burst({ t, freq: 3200 * p, q: 6, gain: 0.2, decay: 0.03 });
      tone({ t, freq: 1150 * p, gain: 0.12, decay: 0.07 });
      burst({ t: t + 0.045, freq: 2800 * p, q: 6, gain: 0.08, decay: 0.025 });
    });
  },
  /** Two pieces leant together into an A-frame. */
  aframe() {
    play(0.2, (t) => {
      const p = rand(0.95, 1.05);
      burst({ t, freq: 2000 * p, q: 4, gain: 0.18, decay: 0.03 });
      tone({ t, freq: 520 * p, gain: 0.12, decay: 0.06 });
      burst({ t: t + 0.07, freq: 2600 * p, q: 6, gain: 0.16, decay: 0.03 });
      tone({ t: t + 0.07, freq: 980 * p, gain: 0.1, decay: 0.06 });
    });
  },
  tick(pitch = 1, gain = 0.07) {
    play(0.05, (t) => {
      burst({ t, freq: 4200 * pitch, q: 9, gain, decay: 0.018 });
    });
  },
  select() {
    play(0.06, (t) => tone({ t, freq: 1600, gain: 0.05, decay: 0.04 }));
  },
  /** Pieces released after a drag. */
  drop() {
    play(0.1, (t) => {
      burst({ t, freq: 1400, q: 2, gain: 0.12, decay: 0.03 });
      tone({ t, freq: 300, gain: 0.1, decay: 0.06, slide: 0.8 });
    });
  },
  remove() {
    play(0.18, (t) => {
      tone({ t, freq: 700, gain: 0.12, decay: 0.12, slide: 0.45, type: 'triangle' });
      burst({ t, freq: 900, q: 1, gain: 0.08, decay: 0.08, type: 'lowpass' });
    });
  },
  /** A rippling run of clicks — templates landing, duplicates appearing. */
  cascade(n = 10) {
    const count = Math.min(16, Math.max(3, n));
    for (let i = 0; i < count; i++) {
      play(0.08, (t) => {
        const p = rand(0.9, 1.15) * (1 + i * 0.012);
        burst({ t, freq: 2200 * p, q: 4, gain: 0.1, decay: 0.03 });
        tone({ t, freq: 460 * p, gain: 0.06, decay: 0.05 });
      }, i * 0.028 + rand(0, 0.01));
    }
  },
  /** Clearing the table. */
  sweep() {
    play(0.5, (t) => {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 1.2;
      f.frequency.setValueAtTime(3500, t);
      f.frequency.exponentialRampToValueAtTime(300, t + 0.45);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      src.connect(f).connect(g).connect(master);
      src.start(t);
      src.stop(t + 0.5);
    });
  },
  ui() {
    play(0.05, (t) => tone({ t, freq: 900, gain: 0.04, decay: 0.035 }));
  },

  // ── ball ────────────────────────────────────────────────────
  /** Ball set down: a weighty little bounce. */
  ballDrop() {
    play(0.3, (t) => {
      tone({ t, freq: 150, gain: 0.3, decay: 0.12, slide: 0.6 });
      burst({ t, freq: 700, q: 1.5, gain: 0.12, decay: 0.05, type: 'lowpass' });
      tone({ t: t + 0.13, freq: 160, gain: 0.1, decay: 0.07, slide: 0.6 });
    });
  },
  /** Aiming: a soft ratchet whose pitch rises with launch power. */
  aim(power) {
    play(0.05, (t) => {
      burst({ t, freq: 1500 + power * 3500, q: 12, gain: 0.07, decay: 0.02 });
      tone({ t, freq: 500 + power * 700, gain: 0.025, decay: 0.03 });
    });
  },
  launch(power = 0.3) {
    play(0.4, (t) => {
      tone({ t, freq: 180, gain: 0.22, decay: 0.1, slide: 0.7 });
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 0.9;
      f.frequency.setValueAtTime(500, t);
      f.frequency.exponentialRampToValueAtTime(1800 + power * 2000, t + 0.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      src.connect(f).connect(g).connect(master);
      src.start(t);
      src.stop(t + 0.4);
    });
  },
  /** Continuous rolling rumble, driven every frame by the ball's speed (0 = silent). */
  roll(speed) {
    if (muted || !ctx) return;
    if (!roll) {
      if (speed < 0.2) return;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 260;
      f.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(master);
      src.start();
      roll = { src, f, g };
    }
    const s = Math.min(1, speed / 12);
    roll.g.gain.setTargetAtTime(s * 0.35, ctx.currentTime, 0.05);
    roll.f.frequency.setTargetAtTime(160 + s * 500, ctx.currentTime, 0.05);
  },
  stopRoll() {
    if (!roll || !ctx) return;
    const r = roll;
    roll = null;
    r.g.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
    setTimeout(() => { try { r.src.stop(); } catch { /* already stopped */ } }, 300);
  },

  // ── chain reaction ──────────────────────────────────────────
  /** One domino striking the next: the classic bright clack. */
  hit(intensity = 1) {
    play(0.1, (t) => {
      const k = Math.min(1, Math.max(0.25, intensity));
      const p = rand(0.88, 1.15);
      burst({ t, freq: 3000 * p, q: 7, gain: 0.26 * k, decay: 0.03 });
      tone({ t, freq: 1250 * p, gain: 0.1 * k, decay: 0.05 });
      tone({ t, freq: 2650 * p, gain: 0.04 * k, decay: 0.03 });
    });
  },
  /** A domino coming to rest on the table. */
  land(intensity = 1) {
    play(0.12, (t) => {
      const k = Math.min(1, Math.max(0.2, intensity));
      const p = rand(0.85, 1.1);
      burst({ t, freq: 1100 * p, q: 2, gain: 0.14 * k, decay: 0.04 });
      tone({ t, freq: 240 * p, gain: 0.12 * k, decay: 0.07, slide: 0.8 });
    });
  },
  /** Gentle two-note chime when everything has settled. */
  done(complete = true) {
    const notes = complete ? [784, 1175] : [659, 587];
    notes.forEach((f, i) => play(0.9, (t) => {
      tone({ t, freq: f, gain: 0.07, decay: 0.8, type: 'sine' });
      tone({ t, freq: f * 2, gain: 0.015, decay: 0.5, type: 'sine' });
    }, 0.12 + i * 0.14));
  },
};
