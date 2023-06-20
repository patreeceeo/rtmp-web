import { Box, IBox } from "../Box.ts";
import { add, clamp, extend, Instance, ReadOnly } from "../Vec2.ts";

export interface ISimulateOptions {
  friction: number;
  maxSpeed: number;
  worldDimensions: IBox;
  hitBox: ReadOnly;
}

export class SimulateOptions implements ISimulateOptions {
  friction = 0;
  maxSpeed = Infinity;
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
    // TODO these friction units are silly
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

  if (options.maxSpeed) {
    clamp(velocity, options.maxSpeed);
  }
}
