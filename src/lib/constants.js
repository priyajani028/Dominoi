// Physical dimensions (world units). A domino is 1 unit tall.
export const DOMINO = { H: 1, W: 0.5, T: 0.16 };
export const SPACING = 0.5; // centre-to-centre distance along a chain
export const BALL_R = 0.32;
export const GRAVITY = -30; // scaled gravity so 1-unit dominoes feel toy-sized
export const MIN_SPEED = 5;
export const MAX_SPEED = 16;
export const speedFromPower = (p) => MIN_SPEED + (MAX_SPEED - MIN_SPEED) * Math.min(1, Math.max(0, p));
