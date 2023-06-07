import { Box, IBox } from "../Box.ts";
import { IVec2Class, IVec2Readonly, Vec2 } from "../Vec2.ts";

/**
 * @fileoverview
 * Networked physics needs to be deterministic. In deterministic physics, whenever the simulation receives input to accelerate, the final position is calculated then and there, then it simply uses a curve function to move the player from the current position to the final position. It also maintains a velocity vector which comes in handy when the simulation receives input to accelerate in another direction while the player is already moving. The velocity vector is basically the sum of the vectors of previous vectors of start positions to final positions. The momentum vector is used to make the players movement curve when they change direction.
 */

export interface ISimulateOptions {
  friction: number;
  maxVelocity: number;
  worldDimensions: IBox;
  hitBox: IVec2Readonly;
}

export class SimulateOptions implements ISimulateOptions {
  friction = 0;
  maxVelocity = Infinity;
  worldDimensions = Box.INFINITY;
  hitBox = new Vec2();
}

const defaultOptions = new SimulateOptions();

// Make this a method of Vec2?
function accumulate(
  targetVector: IVec2Class,
  deltaTime: number,
  deltaVector: IVec2Readonly,
) {
  targetVector.add(deltaVector, deltaTime);
}

export function simulatePositionWithVelocity(
  position: IVec2Class,
  velocity: IVec2Class,
  deltaTime: number,
  options: ISimulateOptions = defaultOptions,
) {
  if (options.friction) {
    velocity.extend(-(options.friction / 256) * deltaTime, velocity);
  }

  accumulate(position, deltaTime, velocity);

  if (options.worldDimensions) {
    const dimensions = options.worldDimensions;
    const hitBox = options.hitBox;
    const xMin = dimensions.xMin + hitBox.x / 2;
    const xMax = dimensions.xMax - hitBox.x / 2;
    const yMin = dimensions.yMin + hitBox.y / 2;
    const yMax = dimensions.yMax - hitBox.y / 2;
    if (position.x < xMin) {
      velocity.x = 0;
      position.x = xMin;
    }

    if (position.x > xMax) {
      velocity.x = 0;
      position.x = xMax;
    }

    if (position.y < yMin) {
      velocity.y = 0;
      position.y = yMin;
    }

    if (position.y >= yMax) {
      velocity.y = 0;
      position.y = yMax;
    }
  }
}

export function simulateVelocityWithAcceleration(
  velocity: IVec2Class,
  acceleration: IVec2Readonly,
  deltaTime: number,
  options: ISimulateOptions = defaultOptions,
) {
  accumulate(velocity, deltaTime, acceleration);

  if (options.maxVelocity) {
    velocity.clamp(options.maxVelocity);
  }
}
