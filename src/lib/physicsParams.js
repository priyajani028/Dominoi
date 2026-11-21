// Shared physical material parameters (used by the app and the headless verification script).
export const PHYS = {
  timeStep: 1 / 120,
  domino: { density: 1, friction: 0.45, restitution: 0.02, linearDamping: 0.02, angularDamping: 0.05 },
  ball: { density: 4, friction: 0.7, restitution: 0.1, linearDamping: 0.35, angularDamping: 1.2 },
  floor: { friction: 0.65, restitution: 0.05 },
};
