import { Box, IBox } from "../Box.ts";
import { invariant } from "../Error.ts";
import { Matrix2, normalizeAngle, PI2, rad2deg } from "../math.ts";
import {
  add,
  clamp,
  extend,
  getLengthSquared,
  Instance,
  ReadOnly,
} from "../Vec2.ts";

export interface ISimulateOptions {
  friction: number;
  maxSpeed: number;
  worldDimensions: IBox;
  hitBox: ReadOnly;
  gravity: ReadOnly;
  debug: boolean;
}

export class SimulateOptions implements ISimulateOptions {
  friction = 0;
  maxSpeed = Infinity;
  worldDimensions = Box.INFINITY;
  hitBox = new Instance();
  gravity = new Instance(0, 0.9);
  debug = false;
}

const defaultOptions = new SimulateOptions();

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

  add(position, velocity, deltaTime);

  if (options.worldDimensions) {
    const dimensions = options.worldDimensions;
    const hitBox = options.hitBox;
    const xMin = dimensions.xMin + hitBox.x / 2;
    const xMax = dimensions.xMax - hitBox.x / 2;
    const yMin = dimensions.yMin + hitBox.y / 2;
    if (position.x < xMin) {
      velocity.x = Math.max(0, velocity.x);
      position.x = xMin;
    }

    if (position.x > xMax) {
      velocity.x = Math.min(0, velocity.x);
      position.x = xMax;
    }

    if (position.y < yMin) {
      velocity.y = Math.max(0, velocity.y);
      position.y = yMin;
    }
  }
}

export function simulateVelocityWithAcceleration(
  velocity: Instance,
  acceleration: ReadOnly,
  deltaTime: number,
  options: ISimulateOptions = defaultOptions,
) {
  add(velocity, acceleration, deltaTime);

  clamp(velocity, options.maxSpeed);
}

export function simulateGravity(
  velocity: Instance,
  deltaTime: number,
  options: ISimulateOptions = defaultOptions,
) {
  add(velocity, options.gravity, deltaTime);
}

export const TILE_SIZE_BITLENGTH = 13;
export const TILE_SIZE = 1 << TILE_SIZE_BITLENGTH;

export enum CardinalDirection {
  xMin,
  xMax,
  yMin,
  yMax,
}

function isXDirection(direction: CardinalDirection) {
  return (
    direction === CardinalDirection.xMin || direction === CardinalDirection.xMax
  );
}

function isMaxDirection(direction: CardinalDirection) {
  return (
    direction === CardinalDirection.xMax || direction === CardinalDirection.yMax
  );
}

export function getHalfHitBox(hitBox: ReadOnly, direction: CardinalDirection) {
  switch (direction) {
    case CardinalDirection.xMin:
      return hitBox.x / -2;
    case CardinalDirection.xMax:
      return hitBox.x / 2;
    case CardinalDirection.yMin:
      return hitBox.y / -2;
    case CardinalDirection.yMax:
      return hitBox.y / 2;
  }
}

/** return the amount of overlap with a tile in the given direction, zero if contact without collision, or negative if no contact */
export function detectTileCollision1d(
  position: Instance,
  tileMatrix: Matrix2<boolean>,
  direction: CardinalDirection,
  options: ISimulateOptions = defaultOptions,
) {
  const hitBox = options.hitBox;
  const halfHitBox = getHalfHitBox(hitBox, direction);
  const isX = isXDirection(direction);
  const isMax = isMaxDirection(direction);
  const center = isX ? position.x : position.y;
  const centerInPerpDimension = isX ? position.y : position.x;
  const edge = center + halfHitBox;
  const centerTileInPerpDimension = centerInPerpDimension >>
    TILE_SIZE_BITLENGTH;
  const edgeTile = (isMax ? edge - 1 : edge) >> TILE_SIZE_BITLENGTH;
  const nextTile = (isMax ? edge : edge - 1) >> TILE_SIZE_BITLENGTH;

  const tileEdge = (isMax ? edgeTile : edgeTile + 1) << TILE_SIZE_BITLENGTH;

  if (
    isX
      ? tileMatrix.get(edgeTile, centerTileInPerpDimension)
      : tileMatrix.get(centerTileInPerpDimension, edgeTile)
  ) {
    return Math.min(
      Math.abs(halfHitBox),
      isMax ? edge - tileEdge : tileEdge - edge,
    );
  } else if (
    isX
      ? tileMatrix.get(nextTile, centerTileInPerpDimension)
      : tileMatrix.get(centerTileInPerpDimension, nextTile)
  ) {
    return 0;
  } else {
    return -1;
  }
}

export function getCollisionDistance(
  positionA: Instance,
  positionB: Instance,
  options: ISimulateOptions = defaultOptions,
): number {
  const xDistance = Math.abs(positionA.x - positionB.x);
  const yDistance = Math.abs(positionA.y - positionB.y);
  if (xDistance < options.hitBox.x && yDistance < options.hitBox.y) {
    const xCollision = xDistance - options.hitBox.x;
    const yCollision = yDistance - options.hitBox.y;
    return Math.sqrt(xCollision * xCollision + yCollision * yCollision);
  } else {
    return -1;
  }
}

export function getCollisionAngle(
  positionA: Instance,
  positionB: Instance,
  _options: ISimulateOptions = defaultOptions,
): number {
  const xDistance = positionA.x - positionB.x;
  const yDistance = positionA.y - positionB.y;
  return normalizeAngle(Math.atan2(yDistance, xDistance));
}

export function resolveTileCollision1d(
  position: Instance,
  velocity: Instance,
  direction: CardinalDirection,
  collision: number,
) {
  invariant(collision > 0, "collision must be positive");
  switch (direction) {
    case CardinalDirection.xMin:
      // console.log("xMin collision", collision);
      velocity.x /= -2;
      position.x += collision;
      break;
    case CardinalDirection.xMax:
      // console.log("xMax collision", collision);
      velocity.x /= -2;
      position.x -= collision;
      break;
    case CardinalDirection.yMin:
      // console.log("yMin collision", collision);
      velocity.y /= -2;
      position.y += collision;
      break;
    case CardinalDirection.yMax:
      // console.log("yMax collision", collision);
      velocity.y /= -2;
      position.y -= collision;
      break;
  }
}

export function resolveCollision(
  positionA: Instance,
  velocityA: Instance,
  positionB: Instance,
  velocityB: Instance,
  distance: number,
  angle: number,
) {
  invariant(distance > 0, "distance must be positive");
  invariant(
    angle >= 0 && angle < PI2,
    "angle is out of range",
  );
  const newAngle = angle === Math.PI / 2
    ? angle + ((Math.random() - 0.5) * Math.PI / 4)
    : angle;
  console.log("angle", angle, "newAngle", newAngle);
  const x = Math.cos(newAngle) * distance;
  const y = Math.sin(newAngle) * distance;
  positionA.x += x / 2;
  positionB.x -= x / 2;
  positionA.y += y / 2;
  positionB.y -= y / 2;
  reflectVelocity(velocityA, newAngle);
  reflectVelocity(velocityB, -newAngle);
}

export function reflectVelocity(velocity: Instance, angle: number) {
  const velocityAngle = Math.atan2(velocity.y, velocity.x);
  const velocityMagnitude = Math.sqrt(getLengthSquared(velocity));
  const newAngle = angle * 2 - velocityAngle;
  // console.log("angle", rad2deg(angle), "velocityAngle", rad2deg(velocityAngle), "newAngle", rad2deg(newAngle));
  velocity.x = Math.cos(newAngle) * velocityMagnitude;
  velocity.y = Math.sin(newAngle) * velocityMagnitude;
}

// function getCardinalDirectionName(direction: CardinalDirection) {
//   switch (direction) {
//     case CardinalDirection.xMin:
//       return "xMin";
//     case CardinalDirection.xMax:
//       return "xMax";
//     case CardinalDirection.yMin:
//       return "yMin";
//     case CardinalDirection.yMax:
//       return "yMax";
//   }
// }
