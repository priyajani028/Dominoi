import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DOMINO, BALL_R } from '../lib/constants.js';

const { W, H, T } = DOMINO;

function paint(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  const c = new THREE.Color(hex);
  const arr = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < arr.length; i += 3) { arr[i] = c.r; arr[i + 1] = c.g; arr[i + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Bevelled domino body with a faint engraved divider line on both faces. */
function makeDominoGeometry() {
  const body = paint(new RoundedBoxGeometry(W, H, T, 4, 0.028), '#ffffff');
  const line = paint(new THREE.BoxGeometry(W * 0.78, 0.012, T + 0.004), '#d8d3ca');
  const geo = mergeGeometries([body, line]);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

export const dominoGeometry = makeDominoGeometry();

export const dominoMaterial = new THREE.MeshPhysicalMaterial({
  color: '#fbf9f5',
  vertexColors: true,
  roughness: 0.34,
  metalness: 0,
  clearcoat: 0.55,
  clearcoatRoughness: 0.28,
  sheen: 0.15,
  sheenRoughness: 0.6,
  envMapIntensity: 1.4,
});

export const ghostMaterial = new THREE.MeshStandardMaterial({
  color: '#e8173d', transparent: true, opacity: 0.28, depthWrite: false, roughness: 0.6,
});

export const ballGeometry = new THREE.SphereGeometry(BALL_R, 64, 48);
export const ballMaterial = new THREE.MeshPhysicalMaterial({
  color: '#e3123a',
  roughness: 0.14,
  metalness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.04,
  sheen: 0.3,
  sheenColor: new THREE.Color('#ff7a90'),
});

export const COLORS = {
  base: new THREE.Color('#ffffff'),
  hover: new THREE.Color('#ffd9df'),
  selected: new THREE.Color('#ff8fa3'),
};
