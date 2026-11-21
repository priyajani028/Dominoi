import { SPACING } from './constants.js';

// Heading convention: r = rotation about Y. Direction = (sin r, cos r) in the XZ plane.
// Positive turn angles turn left as seen from the default camera.
const D2R = Math.PI / 180;

/** Turtle path → dense polyline. cmds: ['L', len] | ['A', radius, deg] */
export function turtlePoints(cmds, start = [0, 0], heading = 0, step = 0.02) {
  let [x, z] = start;
  let h = heading;
  const pts = [[x, z]];
  for (const c of cmds) {
    if (c[0] === 'L') {
      const n = Math.max(1, Math.ceil(c[1] / step));
      const d = c[1] / n;
      for (let i = 0; i < n; i++) {
        x += Math.sin(h) * d;
        z += Math.cos(h) * d;
        pts.push([x, z]);
      }
    } else if (c[0] === 'A') {
      const [, r, deg] = c;
      const total = Math.abs(deg * D2R) * r;
      const n = Math.max(1, Math.ceil(total / step));
      const dh = (deg * D2R) / n;
      const d = total / n;
      for (let i = 0; i < n; i++) {
        h += dh / 2;
        x += Math.sin(h) * d;
        z += Math.cos(h) * d;
        h += dh / 2;
        pts.push([x, z]);
      }
    }
  }
  return pts;
}

/** Parametric curve f(t) → [x,z] sampled densely on [t0,t1]. */
export function curvePoints(f, t0, t1, n = 4000) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(f(t0 + ((t1 - t0) * i) / n));
  return pts;
}

/** Walk a polyline, dropping a domino every `spacing` of arc length, oriented along the tangent. */
export function samplePolyline(pts, spacing = SPACING, offset = 0) {
  const out = [];
  let acc = spacing - offset;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1];
    const [bx, bz] = pts[i];
    const seg = Math.hypot(bx - ax, bz - az);
    if (seg === 0) continue;
    let t = 0;
    while (acc + (seg - t) >= spacing) {
      const need = spacing - acc;
      t += need;
      const k = t / seg;
      out.push({ x: ax + (bx - ax) * k, z: az + (bz - az) * k, r: Math.atan2(bx - ax, bz - az) });
      acc = 0;
    }
    acc += seg - t;
  }
  return out;
}

export function centre(list) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const d of list) {
    minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x);
    minZ = Math.min(minZ, d.z); maxZ = Math.max(maxZ, d.z);
  }
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  return list.map((d) => ({ ...d, x: d.x - cx, z: d.z - cz }));
}

export function bounds(list) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const d of list) {
    minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x);
    minZ = Math.min(minZ, d.z); maxZ = Math.max(maxZ, d.z);
  }
  return { minX, maxX, minZ, maxZ };
}

/** Polyline with sharp corners → dense points with each corner rounded by an arc of `radius`. */
export function roundedPolyline(corners, radius = 1, step = 0.02) {
  const out = [];
  const pushLine = (a, b) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(len / step));
    for (let i = out.length ? 1 : 0; i <= n; i++) out.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
  };
  let cur = corners[0];
  for (let i = 1; i < corners.length - 1; i++) {
    const p = corners[i], prev = corners[i - 1], next = corners[i + 1];
    const a = norm([p[0] - prev[0], p[1] - prev[1]]);
    const b = norm([next[0] - p[0], next[1] - p[1]]);
    const turn = Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
    const tl = radius * Math.tan(Math.abs(turn) / 2);
    const s = [p[0] - a[0] * tl, p[1] - a[1] * tl];
    const e = [p[0] + b[0] * tl, p[1] + b[1] * tl];
    pushLine(cur, s);
    // arc from s to e
    const nrm = turn > 0 ? [-a[1], a[0]] : [a[1], -a[0]];
    const c = [s[0] + nrm[0] * radius, s[1] + nrm[1] * radius];
    const a0 = Math.atan2(s[1] - c[1], s[0] - c[0]);
    const n = Math.max(2, Math.ceil((Math.abs(turn) * radius) / step));
    for (let k = 1; k <= n; k++) {
      const ang = a0 + (turn * k) / n;
      out.push([c[0] + Math.cos(ang) * radius, c[1] + Math.sin(ang) * radius]);
    }
    cur = e;
  }
  pushLine(cur, corners[corners.length - 1]);
  return out;
}
const norm = ([x, y]) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
