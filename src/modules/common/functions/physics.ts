import { Box, IBox } from "../Box.ts";
import { IVec2Readonly, Vec2, Vec2ReadOnly } from "../Vec2.ts";

/**
 * @fileoverview
 * Networked physics needs to be deterministic. In deterministic physics, whenever the simulation receives input to accelerate, the final position is calculated then and there, then it simply uses a curve function to move the player from the current position to the final position. It also maintains a velocity vector which comes in handy when the simulation receives input to accelerate in another direction while the player is already moving. The velocity vector is basically the sum of the vectors of previous vectors of start positions to final positions. The momentum vector is used to make the players movement curve when they change direction.
 */

export interface ISimulateOptions {
  friction: number;
  maxVelocity: number;
  acceleration: Vec2ReadOnly;
  worldDimensions: IBox;
  hitBox: IBox;
  maxSteps: number;
}

export class SimulateOptions implements ISimulateOptions {
  friction = 0;
  maxVelocity = Infinity;
  acceleration = Vec2.ZERO;
  worldDimensions = Box.INFINITY;
  hitBox = Box.ZERO;
  maxSteps = 1000;
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

function sumSeries(start: number, limit: number, step: number): number {
  if (limit !== start) {
    if (step === 0) {
      return Infinity * Math.sign(limit - start);
    }
    const steps = Math.floor((limit - start - 0.5 * step) / step) + 1;
    const last = start + (steps - 1) * step;
    return (steps * (start + last)) / 2;
  } else {
    return 0;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const tempFrictionVector = new Vec2();
function getFrictionVector(velocity: IVec2Readonly, friction: number) {
  tempFrictionVector.set(0, 0);
  tempFrictionVector.extend(friction, velocity);
  return tempFrictionVector;
}

// TODO does this work when initial velocity is negative?
/** find the position of object when it has reached `targetVelocity` from `initialVelocity`
 */
function determinePositionWithVelocity(
  position: Vec2,
  initialVelocity: IVec2Readonly,
  targetVelocity: IVec2Readonly,
  options: ISimulateOptions = defaultOptions,
) {
  const { x: xFriction, y: yFriction } = getFrictionVector(
    initialVelocity,
    options.friction,
  );
  position.x = determinePositionWithVelocity1D(
    position.x,
    initialVelocity.x,
    targetVelocity.x,
    options.worldDimensions.xMin,
    options.worldDimensions.xMax,
    xFriction,
  );
  position.y = determinePositionWithVelocity1D(
    position.y,
    initialVelocity.y,
    targetVelocity.y,
    options.worldDimensions.yMin,
    options.worldDimensions.yMax,
    yFriction,
  );
}

function determinePositionWithVelocity1D(
  position: number,
  initialVelocity: number,
  targetVelocity: number,
  minPosition: number,
  maxPosition: number,
  friction: number,
) {
  const delta = initialVelocity !== 0
    ? sumSeries(targetVelocity, initialVelocity, friction)
    : 0;
  return clamp(
    position + delta,
    minPosition,
    maxPosition,
  );
}

/** calculate the sum of the series of initial velocity minus friction per elapsed time unit until velocity is zero
 */
export function determineRestingPosition(
  position: Vec2,
  velocity: IVec2Readonly,
  options: ISimulateOptions = defaultOptions,
) {
  if (options.acceleration.isZero) {
    determinePositionWithVelocity(position, velocity, Vec2.ZERO, options);
  } else {
    let steps = 0;
    tempVelocity.copy(velocity);
    while (steps < options.maxSteps && !tempVelocity.isZero) {
      steps += 1;
      simulateAcceleration(tempVelocity, options.acceleration, 1, options);
      simulateVelocity(position, tempVelocity, 1, options);
    }
  }
}

export function determineVelocityAtTime(
  velocity: Vec2,
  initialVelocity: IVec2Readonly,
  elapsedTime: number,
  options: ISimulateOptions = defaultOptions,
) {
  const { x: xFriction, y: yFriction } = getFrictionVector(
    initialVelocity,
    options.friction,
  );
  velocity.x = initialVelocity.x - xFriction * elapsedTime;
  velocity.y = initialVelocity.y - yFriction * elapsedTime;
  return velocity;
}

const tempVelocity = new Vec2();
export function determinePositionAtTime(
  position: Vec2,
  velocity: Vec2ReadOnly,
  elapsedTime: number,
  options: ISimulateOptions = defaultOptions,
) {
  if (options.acceleration.isZero) {
    const { x: xEndVelocity, y: yEndVelocity } = determineVelocityAtTime(
      tempVelocity,
      velocity,
      elapsedTime,
      options,
    );
    determinePositionWithVelocity(
      position,
      velocity,
      tempVelocity.set(xEndVelocity, yEndVelocity),
      options,
    );
  } else {
    tempVelocity.copy(velocity);
    while (elapsedTime > 0) {
      elapsedTime -= 1;
      simulateAcceleration(tempVelocity, options.acceleration, 1, options);
      simulateVelocity(position, tempVelocity, 1, options);
    }
  }
}

export function simulateVelocity(
  position: Vec2,
  velocity: Vec2,
  deltaTime: number,
  options: ISimulateOptions = defaultOptions,
) {
  accumulate(position, deltaTime, velocity);

  if (options.worldDimensions) {
    if (
      position.x < options.worldDimensions.xMin ||
      position.x > options.worldDimensions.xMax
    ) {
      velocity.x = 0;
    }
    if (
      position.y < options.worldDimensions.yMin ||
      position.y > options.worldDimensions.yMax
    ) {
      velocity.y = 0;
    }
    position.limitToBoundingBox(
      options.worldDimensions.xMin,
      options.worldDimensions.yMin,
      options.worldDimensions.xMax - options.hitBox.w,
      options.worldDimensions.yMax - options.hitBox.h,
    );
  }

  if (options.friction) {
    velocity.extend(-options.friction * deltaTime, velocity);
  }
}

export function simulateAcceleration(
  velocity: Vec2,
  acceleration: Vec2ReadOnly,
  deltaTime: number,
  options: ISimulateOptions = defaultOptions,
) {
  accumulate(velocity, deltaTime, acceleration || Vec2.ZERO);

  if (options.maxVelocity) {
    velocity.clamp(options.maxVelocity);
  }
}
