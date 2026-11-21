// Headless check: run every template through Rapier and count how many dominoes topple.
import RAPIER from '@dimforge/rapier3d-compat';
import { TEMPLATES } from '../src/lib/templates.js';
import { DOMINO, BALL_R, GRAVITY, speedFromPower } from '../src/lib/constants.js';
import { PHYS } from '../src/lib/physicsParams.js';
import { poseOf, quatOf, quatAngle } from '../src/lib/pieces.js';

await RAPIER.init({});
const only = process.argv[2];
for (const t of TEMPLATES) {
  if (only && t.id !== only) continue;
  const { dominoes, ball } = t.build();
  const world = new RAPIER.World({ x: 0, y: GRAVITY, z: 0 });
  world.timestep = PHYS.timeStep;
  world.createCollider(RAPIER.ColliderDesc.cuboid(500, 0.5, 500).setTranslation(0, -0.5, 0)
    .setFriction(PHYS.floor.friction).setRestitution(PHYS.floor.restitution));
  const init = [];
  const bodies = dominoes.map((d) => {
    const p = poseOf(d);
    const q = quatOf(p.r, p.tilt);
    init.push({ p, q });
    // pieces start asleep, as in the app: they rest as built until something touches them
    const b = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z).setRotation(q).setSleeping(true)
      .setLinearDamping(PHYS.domino.linearDamping).setAngularDamping(PHYS.domino.angularDamping));
    world.createCollider(RAPIER.ColliderDesc.cuboid(DOMINO.W / 2, DOMINO.H / 2, DOMINO.T / 2)
      .setDensity(PHYS.domino.density).setFriction(PHYS.domino.friction).setRestitution(PHYS.domino.restitution), b);
    return b;
  });
  const bb = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(ball.x, BALL_R, ball.z).setCcdEnabled(true)
    .setLinearDamping(PHYS.ball.linearDamping).setAngularDamping(PHYS.ball.angularDamping));
  world.createCollider(RAPIER.ColliderDesc.ball(BALL_R).setDensity(PHYS.ball.density).setFriction(PHYS.ball.friction).setRestitution(PHYS.ball.restitution), bb);
  const v = speedFromPower(process.env.POWER ? +process.env.POWER : ball.power);
  const vx = Math.sin(ball.angle) * v, vz = Math.cos(ball.angle) * v;
  bb.setLinvel({ x: vx, y: 0, z: vz }, true);
  bb.setAngvel({ x: vz / BALL_R, y: 0, z: -vx / BALL_R }, true);
  let steps = 0, settledAt = null;
  const isDown = (b, i) => {
    const t = b.translation(), p0 = init[i].p;
    return quatAngle(init[i].q, b.rotation()) > 0.17 || Math.hypot(t.x - p0.x, t.y - p0.y, t.z - p0.z) > 0.3;
  };
  const fallen = () => bodies.filter(isDown).length;
  while (steps < 120 * 40) {
    world.step(); steps++;
    if (steps % 60 === 0 && steps > 240 && bodies.every((b) => b.isSleeping())) { settledAt = steps / 120; break; }
  }
  const f = fallen();
  const standing = bodies.map((b, i) => i).filter((i) => !isDown(bodies[i], i));
  console.log(`${f === bodies.length ? 'PASS' : 'FAIL'} ${t.id.padEnd(9)} ${f}/${bodies.length} fallen, settled ${settledAt ?? '>40'}s${standing.length ? ' standing: ' + standing.slice(0, 12).join(',') : ''}`);
}
