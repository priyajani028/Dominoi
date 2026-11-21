import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Lightformer } from '@react-three/drei';
import { QUALITY } from '../lib/quality.js';
import { Physics, CuboidCollider } from '@react-three/rapier';
import { EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { usePlayground } from '../store/usePlayground.js';
import { GRAVITY } from '../lib/constants.js';
import { PHYS } from '../lib/physicsParams.js';
import EditDominoes from './EditDominoes.jsx';
import SimWorld from './SimWorld.jsx';
import { EditBall, AimArrow, Ghost } from './Helpers.jsx';
import Controller from './Controller.jsx';
import CameraRig from './CameraRig.jsx';

export const BG = '#ecebe7';

/** Marks the app as ready after the first frame with the scene in it (fades out the splash). */
function ReadySignal() {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => usePlayground.getState().setReady());
  });
  return null;
}

export default function Scene() {
  const phase = usePlayground((s) => s.phase);
  const runId = usePlayground((s) => s.runId);
  const tool = usePlayground((s) => s.tool);
  const spaceHeld = usePlayground((s) => s.spaceHeld);
  const orbitLeft = phase !== 'edit' || tool === 'view' || spaceHeld;

  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 45, 140]} />

      <StudioLights />
      <Environment resolution={256} frames={1} environmentIntensity={0.45}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-6, 3, 4]} rotation-y={Math.PI / 3} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[6, 3, -4]} rotation-y={-Math.PI / 3} scale={[8, 3, 1]} />
        <Lightformer form="ring" color="#fff3ec" intensity={1.5} position={[0, 4, -8]} scale={4} />
      </Environment>

      <Floor />

      <Suspense fallback={null}>
        <Physics gravity={[0, GRAVITY, 0]} timeStep={PHYS.timeStep} paused={phase === 'edit'} interpolate>
          <CuboidCollider
            args={[1000, 0.5, 1000]}
            position={[0, -0.5, 0]}
            friction={PHYS.floor.friction}
            restitution={PHYS.floor.restitution}
          />
          {phase === 'edit' ? <EditDominoes /> : <SimWorld key={runId} />}
          <ReadySignal />
        </Physics>
      </Suspense>

      {phase === 'edit' && <EditBall />}
      {phase === 'edit' && <Ghost />}
      <AimArrow />

      <OrbitControls
        makeDefault
        enableDamping
        zoomToCursor
        dampingFactor={0.08}
        screenSpacePanning={false}
        maxPolarAngle={Math.PI / 2 - 0.12}
        minDistance={3}
        maxDistance={160}
        mouseButtons={{ LEFT: orbitLeft ? THREE.MOUSE.ROTATE : -1, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }}
        touches={{ ONE: orbitLeft ? THREE.TOUCH.ROTATE : -1, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
      <CameraRig />
      <Controller />

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <N8AO
          aoRadius={0.9}
          distanceFalloff={0.6}
          intensity={2.2}
          color="#5a4f46"
          halfRes
          quality={QUALITY.ao === 'low' ? 'performance' : 'medium'}
        />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <SMAA />
      </EffectComposer>
    </>
  );
}

/** Soft studio key light whose shadow frustum follows the camera target, so shadows work anywhere. */
function StudioLights() {
  const light = useRef();
  const controls = useThree((s) => s.controls);
  useEffect(() => {
    const l = light.current;
    Object.assign(l.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 120 });
    l.shadow.camera.updateProjectionMatrix();
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.02;
    l.shadow.radius = 6;
  }, []);
  useFrame(() => {
    const t = controls?.target;
    if (!t || !light.current) return;
    // Snap to shadow-texel grid to avoid shimmering while panning.
    const snap = 48 / QUALITY.shadowMap;
    const x = Math.round(t.x / snap) * snap, z = Math.round(t.z / snap) * snap;
    light.current.position.set(x - 18, 26, z + 12);
    light.current.target.position.set(x, 0, z);
    light.current.target.updateMatrixWorld();
  });
  return (
    <>
      <hemisphereLight args={['#ffffff', '#dcd8d2', 0.95]} />
      <directionalLight ref={light} castShadow intensity={2.4} color="#fffaf3" shadow-mapSize={[QUALITY.shadowMap, QUALITY.shadowMap]} />
      <directionalLight position={[16, 10, -12]} intensity={0.45} color="#f1f4ff" />
      <directionalLight position={[4, 8, 20]} intensity={0.5} color="#fffdf8" />
    </>
  );
}

function Floor() {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow name="floor">
      <planeGeometry args={[2400, 2400]} />
      <meshStandardMaterial color="#e6e3de" roughness={0.95} metalness={0} envMapIntensity={0.6} />
    </mesh>
  );
}
