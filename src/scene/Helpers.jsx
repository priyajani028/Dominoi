import { useMemo } from 'react';
import * as THREE from 'three';
import { usePlayground } from '../store/usePlayground.js';
import { dominoGeometry, ghostMaterial, ballGeometry, ballMaterial } from './assets.js';
import { BALL_R } from '../lib/constants.js';
import { buildKind, kindTurn } from '../lib/pieces.js';

/** The ball as an editable object (before the simulation exists). */
export function EditBall() {
  const ball = usePlayground((s) => s.ball);
  if (!ball) return null;
  return (
    <group position={[ball.x, BALL_R, ball.z]}>
      <mesh geometry={ballGeometry} material={ballMaterial} castShadow receiveShadow />
    </group>
  );
}

/** Translucent preview of the next domino for the Add tool. */
export function Ghost() {
  const tool = usePlayground((s) => s.tool);
  const ghost = usePlayground((s) => s.ghost);
  const kind = usePlayground((s) => s.pieceKind);
  const rot = usePlayground((s) => s.ghostRot);
  if (tool !== 'add' || !ghost) return null;
  return buildKind(kind, ghost.x, ghost.z, ghost.r ?? rot + kindTurn(kind), ghost.top).map((p, i) => (
    <mesh
      key={i}
      geometry={dominoGeometry}
      material={ghostMaterial}
      position={[p.x, p.y, p.z]}
      rotation={[p.tilt, p.r, 0, 'YXZ']}
      raycast={() => null}
    />
  ));
}

const arrowMat = new THREE.MeshBasicMaterial({ color: '#e3123a', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
const dotGeo = new THREE.CircleGeometry(0.06, 20);
const headGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0.36); s.lineTo(-0.24, 0); s.lineTo(0.24, 0); s.closePath();
  return new THREE.ShapeGeometry(s);
})();

/** Dotted aim line from the ball, length scaled by launch power. */
export function AimArrow() {
  const ball = usePlayground((s) => s.ball);
  const tool = usePlayground((s) => s.tool);
  const phase = usePlayground((s) => s.phase);
  const visible = ball && ((phase === 'edit' && tool === 'ball') || phase === 'ready');
  const len = ball ? 1.2 + ball.power * 4.5 : 0;
  const dots = useMemo(() => {
    const out = [];
    for (let d = BALL_R + 0.35; d < len; d += 0.32) out.push(d);
    return out;
  }, [len]);
  if (!visible) return null;
  return (
    <group position={[ball.x, 0.012, ball.z]} rotation={[0, ball.angle, 0]}>
      {dots.map((d, i) => (
        <mesh key={i} geometry={dotGeo} material={arrowMat} position={[0, 0, d]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} />
      ))}
      <mesh geometry={headGeo} material={arrowMat} position={[0, 0, len]} rotation={[Math.PI / 2, 0, 0]} raycast={() => null} />
    </group>
  );
}
