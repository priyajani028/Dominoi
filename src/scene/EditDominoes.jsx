import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { usePlayground, sceneRefs } from '../store/usePlayground.js';
import { dominoGeometry, dominoMaterial, COLORS } from './assets.js';
import { poseOf } from '../lib/pieces.js';

const dummy = new THREE.Object3D();
dummy.rotation.order = 'YXZ'; // yaw about world Y, tilt about the piece's own width axis

/** Static, editable dominoes rendered as one instanced mesh (fast for thousands of pieces). */
export default function EditDominoes() {
  const dominoes = usePlayground((s) => s.dominoes);
  const selected = usePlayground((s) => s.selected);
  const hovered = usePlayground((s) => s.hovered);
  const capacity = useMemo(() => Math.max(64, 2 ** Math.ceil(Math.log2(dominoes.length + 1))), [dominoes.length]);
  return <Instances key={capacity} capacity={capacity} dominoes={dominoes} selected={selected} hovered={hovered} />;
}

function Instances({ capacity, dominoes, selected, hovered }) {
  const ref = useRef();

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh.instanceColor) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3).fill(1), 3);
    }
    sceneRefs.dominoMesh = mesh;
    return () => { if (sceneRefs.dominoMesh === mesh) sceneRefs.dominoMesh = null; };
  }, [capacity]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    dominoes.forEach((d, i) => {
      const p = poseOf(d);
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.tilt, p.r, 0, 'YXZ');
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.count = dominoes.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.computeBoundingBox?.();
    sceneRefs.dominoIds = dominoes.map((d) => d.id);
  }, [dominoes]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    dominoes.forEach((d, i) => {
      mesh.setColorAt(i, selected.has(d.id) ? COLORS.selected : hovered === d.id ? COLORS.hover : COLORS.base);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [dominoes, selected, hovered]);

  return (
    <instancedMesh
      ref={ref}
      args={[dominoGeometry, dominoMaterial, capacity]}
      castShadow
      receiveShadow
      frustumCulled={false}
    />
  );
}
