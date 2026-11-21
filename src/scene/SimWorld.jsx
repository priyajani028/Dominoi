import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedRigidBodies, RigidBody, CuboidCollider, BallCollider } from '@react-three/rapier';
import { usePlayground } from '../store/usePlayground.js';
import { dominoGeometry, dominoMaterial, ballGeometry, ballMaterial } from './assets.js';
import { DOMINO, BALL_R, speedFromPower } from '../lib/constants.js';
import { PHYS } from '../lib/physicsParams.js';
import { poseOf, quatOf, quatAngle } from '../lib/pieces.js';
import { sfx } from '../lib/sound.js';

/**
 * The live physics scene. Built fresh from the saved arrangement each run (keyed by runId),
 * so the original layout in the store is never mutated and can be replayed endlessly.
 */
export default function SimWorld() {
  const phase = usePlayground((s) => s.phase);
  const bodies = useRef([]);
  const ballBody = useRef();

  // Snapshot the arrangement at mount; later store edits can't affect a running sim.
  const { instances, meta, ball } = useMemo(() => {
    const s = usePlayground.getState();
    const meta = s.dominoes.map((d) => {
      const p = poseOf(d);
      return { p0: p, q0: quatOf(p.r, p.tilt) };
    });
    return {
      instances: s.dominoes.map((d, i) => {
        const { p0: p, q0: q } = meta[i];
        return { key: d.id, position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w] };
      }),
      meta,
      ball: s.ball,
    };
  }, []);

  // Launch when the phase flips to running.
  useEffect(() => {
    if (phase !== 'running' || !ballBody.current) return;
    const { angle, power } = usePlayground.getState().ball;
    const v = speedFromPower(power);
    const vx = Math.sin(angle) * v, vz = Math.cos(angle) * v;
    ballBody.current.wakeUp();
    ballBody.current.setLinvel({ x: vx, y: 0, z: vz }, true);
    // roll without slipping: ω = (up × v) / r
    ballBody.current.setAngvel({ x: vz / BALL_R, y: 0, z: -vx / BALL_R }, true);
    monitor.current = { t: 0, quiet: 0, acc: 0 };
  }, [phase]);

  // Start every piece asleep: stacks and A-frames rest exactly as built until something touches them,
  // then their island wakes and real physics takes over.
  useEffect(() => {
    const id = requestAnimationFrame(() => bodies.current.forEach((b) => b?.sleep()));
    return () => cancelAnimationFrame(id);
  }, []);

  // Replay: launch automatically shortly after the rebuilt scene settles in.
  useEffect(() => {
    if (!usePlayground.getState().autoLaunch) return;
    const t = setTimeout(() => usePlayground.getState().launch(), 450);
    return () => clearTimeout(t);
  }, []);

  // Track fallen pieces and detect when everything has come to rest.
  const monitor = useRef({ t: 0, quiet: 0, acc: 0 });
  // Per-piece sound state: 0 = untouched, 1 = struck (clacked), 2 = landed (thudded).
  const audio = useRef(null);
  if (!audio.current) audio.current = { state: new Uint8Array(instances.length), budget: 0 };
  useEffect(() => () => sfx.stopRoll(), []);

  useFrame((_, dt) => {
    const st = usePlayground.getState();
    if (st.phase !== 'running') return;

    // ── sound, every frame ──
    const a = audio.current;
    a.budget = Math.min(6, a.budget + dt * 45); // at most ~45 sounds per second
    for (let i = 0; i < bodies.current.length; i++) {
      const b = bodies.current[i];
      if (!b || a.state[i] === 2 || b.isSleeping()) continue;
      const w = b.angvel();
      const spin = Math.hypot(w.x, w.y, w.z);
      if (a.state[i] === 0) {
        if (spin > 0.6 || quatAngle(meta[i].q0, b.rotation()) > 0.03) {
          a.state[i] = 1;
          if (a.budget >= 1) { a.budget -= 1; sfx.hit(0.4 + spin / 12); }
        }
      } else if (spin < 0.4 && quatAngle(meta[i].q0, b.rotation()) > 0.5) {
        a.state[i] = 2;
        if (a.budget >= 1) { a.budget -= 1; sfx.land(0.6); }
      }
    }
    const bb = ballBody.current;
    if (bb) {
      const v = bb.linvel();
      const onFloor = bb.translation().y < BALL_R + 0.05;
      sfx.roll(onFloor ? Math.hypot(v.x, v.z) : 0);
    }

    const m = monitor.current;
    m.t += dt; m.acc += dt;
    if (m.acc < 0.2) return;
    const step = m.acc; m.acc = 0;
    let fallen = 0, maxV = 0;
    for (let i = 0; i < bodies.current.length; i++) {
      const b = bodies.current[i];
      if (!b) continue;
      const t = b.translation(), p0 = meta[i].p0;
      if (quatAngle(meta[i].q0, b.rotation()) > 0.17 || Math.hypot(t.x - p0.x, t.y - p0.y, t.z - p0.z) > 0.3) fallen++;
      if (!b.isSleeping()) {
        const v = b.linvel();
        maxV = Math.max(maxV, Math.hypot(v.x, v.y, v.z));
      }
    }
    const bv = ballBody.current?.linvel();
    const ballSpeed = bv ? Math.hypot(bv.x, bv.y, bv.z) : 0;
    if (fallen !== st.stats.fallen) st.setStats({ fallen, total: instances.length });
    m.quiet = maxV < 0.05 && ballSpeed < 0.4 ? m.quiet + step : 0;
    if ((m.t > 1.5 && m.quiet > 1.2) || m.t > 90) st.finish();
  });

  return (
    <>
      {instances.length > 0 && (
        <InstancedRigidBodies
          ref={bodies}
          instances={instances}
          colliders={false}
          linearDamping={PHYS.domino.linearDamping}
          angularDamping={PHYS.domino.angularDamping}
          colliderNodes={[
            <CuboidCollider
              key="c"
              args={[DOMINO.W / 2, DOMINO.H / 2, DOMINO.T / 2]}
              density={PHYS.domino.density}
              friction={PHYS.domino.friction}
              restitution={PHYS.domino.restitution}
            />,
          ]}
        >
          <instancedMesh
            args={[dominoGeometry, dominoMaterial, instances.length]}
            castShadow
            receiveShadow
            frustumCulled={false}
          />
        </InstancedRigidBodies>
      )}
      {ball && (
        <RigidBody
          ref={ballBody}
          colliders={false}
          ccd
          position={[ball.x, BALL_R, ball.z]}
          linearDamping={PHYS.ball.linearDamping}
          angularDamping={PHYS.ball.angularDamping}
        >
          <BallCollider args={[BALL_R]} density={PHYS.ball.density} friction={PHYS.ball.friction} restitution={PHYS.ball.restitution} />
          <mesh geometry={ballGeometry} material={ballMaterial} castShadow receiveShadow />
        </RigidBody>
      )}
    </>
  );
}
