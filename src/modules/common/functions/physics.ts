import { Box, IBox } from "../Box.ts";
import { Vec2, Vec2ReadOnly } from "../Vec2.ts";

/**
 * @fileoverview
 * Networked physics needs to be deterministic. In deterministic physics, whenever the simulation receives input to accelerate, the final position is calculated then and there, then it simply uses a curve function to move the player from the current position to the final position. It also maintains a velocity vector which comes in handy when the simulation receives input to accelerate in another direction while the player is already moving. The velocity vector is basically the sum of the vectors of previous vectors of start positions to final positions. The momentum vector is used to make the players movement curve when they change direction.
 */

export interface ISimulateOptions {
  friction: number;
  maxVelocity: number;
  worldDimensions: IBox;
  hitBox: IBox;
}

export class SimulateOptions implements ISimulateOptions {
  friction = 0;
  maxVelocity = Infinity;
  worldDimensions = Box.INFINITY;
  hitBox = Box.ZERO;
}

const defaultOptions = new SimulateOptions();

// Make this a method of Vec2?
function accumulate(
  targetVector: Vec2,
  deltaTime: number,
  deltaVector: Vec2ReadOnly,
) {
  targetVector.add(deltaVector, deltaTime);
}

export function simulatePositionWithVelocity(
  position: Vec2,
  velocity: Vec2,
  deltaTime: number,
  options: ISimulateOptions = defaultOptions,
) {
  if (options.friction) {
    velocity.extend(-(options.friction / 256) * deltaTime, velocity);
  }

  accumulate(position, deltaTime, velocity);

  if (options.worldDimensions) {
    if (position.x <= options.worldDimensions.xMin) {
      velocity.x = 0;
      position.x = options.worldDimensions.xMin;
    }

    if (position.x >= options.worldDimensions.xMax) {
      velocity.x = 0;
      position.x = options.worldDimensions.xMax;
    }

    if (position.y <= options.worldDimensions.yMin) {
      velocity.y = 0;
      position.y = options.worldDimensions.yMin;
    }

    if (position.y >= options.worldDimensions.yMax) {
      velocity.y = 0;
      position.y = options.worldDimensions.yMax;
    }
  }
}

export function simulateVelocityWithAcceleration(
  velocity: Vec2,
  acceleration: Vec2ReadOnly,
  deltaTime: number,
  options: ISimulateOptions = defaultOptions,
) {
  accumulate(velocity, deltaTime, acceleration);

  if (options.maxVelocity) {
    velocity.clamp(options.maxVelocity);
  }
}
