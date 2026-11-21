import { DOMINO } from './constants.js';

const { H, T } = DOMINO;
export const AFRAME_TILT = (18 * Math.PI) / 180;

/** A-frames and flat pieces placed on the floor are turned a quarter so the ^ faces the default camera. */
export const kindTurn = (kind) => (kind === 'single' ? 0 : Math.PI / 2);

/** Full pose of a piece (older pieces only carry x, z, r). */
export const poseOf = (d) => ({ x: d.x, y: d.y ?? H / 2, z: d.z, r: d.r, tilt: d.tilt ?? 0 });

/** Quaternion for yaw r about world Y applied after tilt about the piece's own X (width) axis. */
export function quatOf(r, tilt = 0) {
  const sy = Math.sin(r / 2), cy = Math.cos(r / 2);
  const sx = Math.sin(tilt / 2), cx = Math.cos(tilt / 2);
  return { x: cy * sx, y: sy * cx, z: -sy * sx, w: cy * cx };
}

/** Height of the highest point of a piece. */
export function topOf(d) {
  const { y, tilt } = poseOf(d);
  return y + (H / 2) * Math.abs(Math.cos(tilt)) + (T / 2) * Math.abs(Math.sin(tilt));
}

/**
 * Pieces making up one placement.
 *  single – a standing domino
 *  aframe – two dominoes leaning into each other (a ^ / card-house "mountain")
 *  flat   – a domino lying on its face (a roof / bridge for stacking)
 * baseY lifts the whole placement, e.g. to stack it on top of another piece.
 */
export function buildKind(kind, x, z, r, baseY = 0) {
  if (kind === 'flat') return [{ x, y: baseY + T / 2 + 0.002, z, r, tilt: Math.PI / 2 }];
  if (kind === 'aframe') {
    // Two halves leaning symmetrically, top inner edges 3 mm apart (they settle into contact).
    const a = AFRAME_TILT;
    const s = (H / 2) * Math.sin(a) + (T / 2) * Math.cos(a) + 0.003;
    const y = baseY + (H / 2) * Math.cos(a) + (T / 2) * Math.sin(a) + 0.001;
    const fx = Math.sin(r), fz = Math.cos(r);
    return [
      { x: x - fx * s, y, z: z - fz * s, r, tilt: a },
      { x: x + fx * s, y, z: z + fz * s, r, tilt: -a },
    ];
  }
  return [{ x, y: baseY + H / 2 + 0.002, z, r, tilt: 0 }];
}

/** Angle (radians) between two quaternions. */
export function quatAngle(a, b) {
  const d = Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w);
  return 2 * Math.acos(Math.min(1, d));
}

