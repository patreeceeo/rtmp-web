import { Box, IBox } from "../Box.ts";
import { add, clamp, extend, Instance, ReadOnly } from "../Vec2.ts";

/**
 * @fileoverview
 * Networked physics needs to be deterministic. In deterministic physics, whenever the simulation receives input to accelerate, the final position is calculated then and there, then it simply uses a curve function to move the player from the current position to the final position. It also maintains a velocity vector which comes in handy when the simulation receives input to accelerate in another direction while the player is already moving. The velocity vector is basically the sum of the vectors of previous vectors of start positions to final positions. The momentum vector is used to make the players movement curve when they change direction.
 */

export interface ISimulateOptions {
  friction: number;
  maxVelocity: number;
  worldDimensions: IBox;
  hitBox: ReadOnly;
}

export class SimulateOptions implements ISimulateOptions {
  friction = 0;
  maxVelocity = Infinity;
  worldDimensions = Box.INFINITY;
  hitBox = new Instance();
}

const defaultOptions = new SimulateOptions();

function accumulate(
  targetVector: Instance,
  deltaTime: number,
  deltaVector: ReadOnly,
) {
  add(targetVector, deltaVector, deltaTime);
}

export function simulatePositionWithVelocity(
  position: Instance,
  velocity: Instance,
  deltaTime: number,
  options: ISimulateOptions = defaultOptions,
) {
  if (options.friction) {
    extend(velocity, -(options.friction / 256) * deltaTime, velocity);
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
  velocity: Instance,
  acceleration: ReadOnly,
  deltaTime: number,
  options: ISimulateOptions = defaultOptions,
) {
  accumulate(velocity, deltaTime, acceleration);

  if (options.maxVelocity) {
    clamp(velocity, options.maxVelocity);
  }
}
