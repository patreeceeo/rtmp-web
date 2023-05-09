import { Box, IBox } from "../Box.ts";
import { IVec2, IVec2Readonly, Vec2 } from "../Vec2.ts";

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
function accumulate(targetVector: Vec2, deltaTime: number, deltaVector: Vec2) {
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

function determinePositionWithVelocity(
  position: Vec2,
  initialVelocity: IVec2Readonly,
  velocity: IVec2Readonly,
  options: ISimulateOptions = defaultOptions,
) {
  const { x: xFriction, y: yFriction } = getFrictionVector(
    initialVelocity,
    options.friction,
  );
  const xDelta = initialVelocity.x !== 0
    ? sumSeries(velocity.x, initialVelocity.x, xFriction)
    : 0;
  const yDelta = initialVelocity.y !== 0
    ? sumSeries(velocity.y, initialVelocity.y, yFriction)
    : 0;
  position.x = clamp(
    position.x + xDelta,
    options.worldDimensions.xMin,
    options.worldDimensions.xMax,
  );
  position.y = clamp(
    position.y + yDelta,
    options.worldDimensions.yMin,
    options.worldDimensions.yMax,
  );
}

/** calculate the sum of the series of initial velocity minus friction per elapsed time unit until velocity is zero
 */
export function determineRestingPosition(
  position: Vec2,
  velocity: IVec2Readonly,
  options: ISimulateOptions = defaultOptions,
) {
  determinePositionWithVelocity(position, velocity, Vec2.ZERO, options);
}

export function determineVelocityAtTime(
  velocity: Vec2,
  initialVelocity: IVec2Readonly,
  time: number,
  options: ISimulateOptions = defaultOptions,
) {
  const { x: xFriction, y: yFriction } = getFrictionVector(
    initialVelocity,
    options.friction,
  );
  velocity.x = initialVelocity.x - xFriction * time;
  velocity.y = initialVelocity.y - yFriction * time;
  return velocity;
}

const tempEndVelocity = new Vec2();
export function determinePositionAtTime(
  position: Vec2,
  velocity: IVec2Readonly,
  time: number,
  options: ISimulateOptions = defaultOptions,
) {
  const { x: xEndVelocity, y: yEndVelocity } = determineVelocityAtTime(
    tempEndVelocity,
    velocity,
    time,
    options,
  );
  determinePositionWithVelocity(
    position,
    velocity,
    tempEndVelocity.set(xEndVelocity, yEndVelocity),
    options,
  );
}

export function simulateVelocity(
  position: Vec2,
  velocity: Vec2,
  deltaTime: number,
  options: ISimulateOptions = defaultOptions,
) {
  accumulate(position, deltaTime, velocity);

  if (options.worldDimensions) {
    position.limitToBoundingBox(
      0,
      0,
      options.worldDimensions.xMin - (options.hitBox?.w || 0),
      options.worldDimensions.yMin - (options.hitBox?.h || 0),
    );
  }

  if (options.friction) {
    velocity.extend(-options.friction * deltaTime, velocity);
  }
}

export function simulateAcceleration(
  velocity: Vec2,
  acceleration: Vec2,
  deltaTime: number,
  options: ISimulateOptions = defaultOptions,
) {
  accumulate(velocity, deltaTime, acceleration || Vec2.ZERO);

  acceleration.set(0, 0);

  if (options.maxVelocity) {
    velocity.clamp(options.maxVelocity);
  }
}
