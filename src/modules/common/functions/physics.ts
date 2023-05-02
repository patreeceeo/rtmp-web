import { IBox } from "../Box.ts";
import { Vec2 } from "../Vec2.ts";

export interface ISimulateOptions {
  friction?: number;
  maxVelocity?: number;
  worldDimensions?: Vec2;
  hitBox?: IBox;
}
// Make this a method of Vec2?
function accumulate(targetVector: Vec2, deltaTime: number, deltaVector: Vec2) {
  targetVector.add(deltaVector, deltaTime);
}

export function simulateVelocity(
  position: Vec2,
  velocity: Vec2,
  deltaTime: number,
  options: ISimulateOptions = {},
) {
  accumulate(position, deltaTime, velocity);

  if (options.worldDimensions) {
    position.limitToBoundingBox(
      0,
      0,
      options.worldDimensions.x - (options.hitBox?.w || 0),
      options.worldDimensions.y - (options.hitBox?.h || 0),
    );
  }

  if (options.friction) {
    velocity.extend(-1 * options.friction! * deltaTime);
  }
}

export function simulateAcceleration(
  velocity: Vec2,
  acceleration: Vec2,
  deltaTime: number,
  options: ISimulateOptions = {},
) {
  accumulate(velocity, deltaTime, acceleration || Vec2.ZERO);

  acceleration.set(0, 0);

  if (options.maxVelocity) {
    velocity.clamp(options.maxVelocity);
  }
}
