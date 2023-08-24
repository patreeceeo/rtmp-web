export const Player = Object.freeze({
  WIDTH: 16,
  HEIGHT: 32,
  RUN_ACCELERATION: 2,
  FLY_ACCELERATION: 1,
  MAX_GROUND_SPEED: 66,
  MAX_JUMP_SPEED: 160,
  // http://style.org/unladenswallow/
  MAX_FALL_SPEED: 220,
  MAX_FLY_SPEED: 33,
  MAX_JUMP_INTENSITY: 2 ** 8 - 1,
  JUMP_INTENSITY_DIMINISHMENT_FACTOR: 12,
  GROUND_FRICTION: 80,
  AIR_FRICTION: 0,
  MIN_KICKBACK_RESTITUTION_SPEED: 57,
  KICKBACK_RESTITUTION_Y: 33,
  KICKBACK_RESTITUTION_X_FACTOR: 1.5,
  MAX_COLLISION_PLAY_DISTANCE: 20,
  /** in 256ths of a pixel */
  POSITION_EPSILON: 512,
  DEATH_Y_VELOCITY: -160,
  PHYS_RESTITUTION: 255,
});
