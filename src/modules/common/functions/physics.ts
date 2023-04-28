import { Vec2 } from "../Vec2.ts";

const reVec2 = new Vec2();

export interface SimulateOptions {
  friction?: number;
  maxVelocity?: number;
}
// Make this a method of Vec2?
function accumulate(targetVector: Vec2, deltaTime: number, deltaVector: Vec2) {
  reVec2.copy(deltaVector);
  reVec2.scale(deltaTime);
  targetVector.add(reVec2);
}
export function simulate(
  deltaTime: number,
  acceleration: Vec2,
  velocity: Vec2,
  position: Vec2,
  options: SimulateOptions = {},
) {
  accumulate(position, deltaTime, velocity);

  accumulate(position, 0.5 * deltaTime ** 2, acceleration);

  accumulate(velocity, deltaTime, acceleration);

  if (
    options.friction &&
    ("maxVelocity" in options
      ? velocity.lengthSquared() < options.maxVelocity! ** 2
      : true)
  ) {
    velocity.extend(-1 * options.friction! * deltaTime);
  }
  if (options.maxVelocity) {
    velocity.clamp(options.maxVelocity);
  }
}
