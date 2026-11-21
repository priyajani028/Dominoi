import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { usePlayground } from '../store/usePlayground.js';

/** Smoothly frames the camera on a requested region (e.g. after loading a template). */
export default function CameraRig() {
  const fit = usePlayground((s) => s.fit);
  const controls = useThree((s) => s.controls);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const anim = useRef(null);

  useEffect(() => {
    if (!fit || !controls) return;
    const cx = (fit.minX + fit.maxX) / 2, cz = (fit.minZ + fit.maxZ) / 2;
    // Fit both width and depth into the view for the current aspect ratio (portrait phones need
    // to pull back much further for wide layouts), leaving room for the floating UI.
    const w = Math.max(fit.maxX - fit.minX, 4) + 3;
    const h = Math.max(fit.maxZ - fit.minZ, 4) * 1.25 + 3;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const aspect = size.width / size.height;
    const uiPad = size.width < 640 ? 1.35 : 1.15;
    const dist = Math.min(150, Math.max(h / 2 / t, w / 2 / (t * aspect)) * uiPad + 2);
    const span = Math.max(w, h);
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
    // keep the current viewing angle but avoid going too flat
    if (dir.y < 0.6) dir.set(dir.x, 0.6, dir.z).normalize();
    // nudge toward the camera so the creation sits above the bottom toolbar
    const target = new THREE.Vector3(cx, 0, cz + span * 0.04);
    anim.current = {
      t: 0,
      fromT: controls.target.clone(),
      toT: target,
      fromP: camera.position.clone(),
      toP: target.clone().addScaledVector(dir, dist),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reframe only on new requests, not on resize
  }, [fit, controls, camera]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (!a || !controls) return;
    a.t = Math.min(1, a.t + dt / 0.9);
    const k = 1 - Math.pow(1 - a.t, 3);
    controls.target.lerpVectors(a.fromT, a.toT, k);
    camera.position.lerpVectors(a.fromP, a.toP, k);
    controls.update();
    if (a.t >= 1) anim.current = null;
  });
  return null;
}
