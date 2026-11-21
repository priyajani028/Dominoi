import { buildKind, topOf } from './pieces.js';
import { turtlePoints, curvePoints, samplePolyline, centre, roundedPolyline } from './paths.js';

const D = Math.PI / 180;

// Rotate a polyline so it starts at fraction `f` of its length (for closed loops).
function rotateLoop(pts, f) {
  const i = Math.floor(pts.length * f);
  return [...pts.slice(i), ...pts.slice(1, i + 1)];
}
// Leave a gap at the end of a closed loop so the chain has a clear start, like a real setup.
const trimEnd = (list, n) => list.slice(0, Math.max(1, list.length - n));

function finish(list) {
  const out = centre(list);
  const f = out[0];
  const back = 2.6;
  const ball = {
    x: f.x - Math.sin(f.r) * back,
    z: f.z - Math.cos(f.r) * back,
    angle: f.r,
    power: 0.2,
  };
  return { dominoes: out, ball };
}

function polar(rFn, turns = 1) {
  return curvePoints((t) => {
    const r = rFn(t);
    return [Math.cos(t) * r, Math.sin(t) * r];
  }, 0, Math.PI * 2 * turns, 6000);
}

function heart() {
  // Ball rolls up into the bottom tip; a fork piece there sends the chain up both sides at once,
  // around the lobes, meeting again at the top dip.
  const build = (len) => turtlePoints([['A', 3.4, 180], ['L', len]], [0, 0], 225 * D);
  let half = build(0);
  const endX = half[half.length - 1][0];
  half = build(-endX / Math.sin(45 * D)); // dip → tip, ending on the centre line
  const tip = half[half.length - 1];
  const left = half.slice().reverse();
  const right = left.map(([x, z]) => [-x, z]);
  const branch = (pts) => samplePolyline(pts).slice(1).filter((d) => Math.abs(d.x) > 0.4 || d.z > tip[1] - 3);
  return [{ x: tip[0], z: tip[1], r: Math.PI }, ...branch(left), ...branch(right)];
}

function infinity() {
  // Ball enters from below and hits a fork piece at the centre, which sets off both loops at once.
  // (Avoids a self-crossing, which real-world chains can't reliably jump.)
  const R = 2.8, e = 1.3;
  const right = turtlePoints([['L', R], ['A', R, -270], ['L', R - e]], [0, 0], 135 * D);
  const left = turtlePoints([['L', R], ['A', R, 270], ['L', R - e]], [0, 0], 225 * D);
  return [{ x: 0, z: 0, r: Math.PI }, ...samplePolyline(right).slice(1), ...samplePolyline(left).slice(1)];
}

/**
 * Towers & mountains: a winding chain where some pieces carry a second (or third) domino stacked
 * on top, running into a range of A-frame "mountains", the last one capped with a flat roof and a
 * smaller peak.
 */
export function towers(afSpacing = 1.05) {
  const pts = curvePoints((t) => [t, 1.6 * Math.sin(t / 2.2)], -11, 4);
  const line = samplePolyline(pts);
  const out = [];
  let g = 1;
  line.forEach((d, i) => {
    out.push(d);
    if (i > 2 && i % 4 === 2) {
      const gid = g++;
      out[out.length - 1] = { ...d, g: gid };
      const levels = i % 8 === 6 ? 2 : 1;
      let top = topOf(d);
      for (let k = 0; k < levels; k++) {
        const [p] = buildKind('single', d.x, d.z, d.r, top);
        out.push({ ...p, g: gid });
        top = topOf(p);
      }
    }
  });
  // mountains continue straight on from the end of the chain
  const last = line[line.length - 1];
  const fx = Math.sin(last.r), fz = Math.cos(last.r);
  const n = 4;
  for (let k = 1; k <= n; k++) {
    const cx = last.x + fx * (0.55 + k * afSpacing - afSpacing / 2), cz = last.z + fz * (0.55 + k * afSpacing - afSpacing / 2);
    const gid = g++;
    const frame = buildKind('aframe', cx, cz, last.r).map((p) => ({ ...p, g: gid }));
    out.push(...frame);
    if (k === n) {
      const roof = buildKind('flat', cx, cz, last.r, Math.max(...frame.map(topOf))).map((p) => ({ ...p, g: gid }));
      out.push(...roof, ...buildKind('aframe', cx, cz, last.r, topOf(roof[0])).map((p) => ({ ...p, g: gid })));
    }
  }
  return out;
}

export const TEMPLATES = [
  {
    id: 'circle', name: 'Perfect Circle',
    build: () => finish(trimEnd(samplePolyline(turtlePoints([['A', 5.5, 360]], [0, 0], 90 * D)), 4)),
  },
  {
    id: 'spiral', name: 'Spiral',
    build: () => {
      const turns = 2.25, r0 = 9.5, r1 = 2.6;
      const pts = curvePoints((t) => {
        const k = t / (Math.PI * 2 * turns);
        const r = r0 + (r1 - r0) * k;
        return [Math.cos(t) * r, Math.sin(t) * r];
      }, 0, Math.PI * 2 * turns, 8000);
      return finish(samplePolyline(pts));
    },
  },
  { id: 'heart', name: 'Heart', build: () => finish(heart()) },
  { id: 'infinity', name: 'Infinity', build: () => finish(infinity()) },
  {
    id: 'star', name: 'Star',
    build: () => finish(trimEnd(samplePolyline(rotateLoop(polar((t) => 6.5 * (1 + 0.14 * Math.cos(5 * t))), 0.1)), 3)),
  },
  {
    id: 'flower', name: 'Flower',
    build: () => {
      const cmds = [];
      for (let i = 0; i < 6; i++) cmds.push(['A', 1.5, 240], ['A', 1.9, -180]);
      return finish(trimEnd(samplePolyline(turtlePoints(cmds, [0, 0], 0)), 3));
    },
  },
  {
    id: 'wave', name: 'Wave',
    build: () => finish(samplePolyline(curvePoints((t) => [t, 2.2 * Math.sin((t * 2 * Math.PI) / 9)], -15, 15))),
  },
  {
    id: 'zigzag', name: 'Zigzag',
    build: () => {
      const cmds = [['L', 1.5]];
      for (let i = 0; i < 7; i++) cmds.push(['A', 1, 90], ['L', 2.6], ['A', 1, -90], ['L', 2.6]);
      return finish(samplePolyline(turtlePoints(cmds, [0, 0], 45 * D)));
    },
  },
  {
    id: 'maze', name: 'Maze',
    build: () => {
      const g = [[0, 0], [5, 0], [5, 1], [1, 1], [1, 2], [5, 2], [5, 5], [0, 5], [0, 3], [3, 3], [3, 4], [1, 4]];
      const c = 2.6;
      return finish(samplePolyline(roundedPolyline(g.map(([x, z]) => [x * c, z * c]), 1)));
    },
  },
  {
    id: 'double', name: 'Double Circle',
    build: () => finish(samplePolyline(turtlePoints([['A', 3.6, 300], ['L', 0.6], ['A', 3.6, -300]], [0, 0], 120 * D))),
  },
  {
    id: 'galaxy', name: 'Galaxy',
    build: () => {
      // Two interleaved Archimedean arms joined by an S-curve through the centre.
      const c = 2.7 / (2 * Math.PI), t0 = 2 * Math.PI, t1 = 5 * Math.PI;
      const arm = curvePoints((t) => [c * t * Math.cos(t), c * t * Math.sin(t)], t1, t0, 5000);
      const R = c * t0, h = R / 2;
      const s1 = curvePoints((a) => [h + h * Math.cos(a), h * Math.sin(a)], 0, -Math.PI, 400);
      const s2 = curvePoints((a) => [-h + h * Math.cos(a), h * Math.sin(a)], 0, Math.PI, 400);
      const armB = arm.slice().reverse().map(([x, z]) => [-x, -z]);
      return finish(samplePolyline([...arm, ...s1.slice(1), ...s2.slice(1), ...armB.slice(1)]));
    },
  },
  { id: 'towers', name: 'Towers & Peaks', build: () => finish(towers()) },
  {
    id: 'comet', name: 'Comet',
    build: () => {
      const cmds = [['L', 7]];
      for (let r = 6.5; r > 2.2; r -= 0.75) cmds.push(['A', r, -180]);
      return finish(samplePolyline(turtlePoints(cmds, [0, 0], 90 * D)));
    },
  },
];

export const getTemplate = (id) => TEMPLATES.find((t) => t.id === id);
