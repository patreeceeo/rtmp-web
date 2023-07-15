import { Box, IBox } from "../Box.ts";
import { invariant } from "../Error.ts";
import {
  getDistanceBetweenEllipses,
  Matrix2,
  normalizeAngle,
  PI2,
  rad2deg,
} from "../math.ts";
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
  tolerance: number,
): number {
  const xDistance = Math.abs(positionA.x - positionB.x);
  const yDistance = Math.abs(positionA.y - positionB.y);
  if (
    xDistance < options.hitBox.x + tolerance * 2 &&
    yDistance < options.hitBox.y + tolerance * 2
  ) {
    return -1 *
      getDistanceBetweenEllipses(
        positionA,
        positionB,
        options.hitBox.x / 2,
        options.hitBox.y / 2,
      );
  } else {
    return -1 - tolerance;
  }
}

export function getCollisionAngle(
  positionA: Instance,
  positionB: Instance,
  _options: ISimulateOptions = defaultOptions,
): number {
  const xDistance = positionA.x - positionB.x;
  const yDistance = positionA.y - positionB.y;
  return Math.atan2(yDistance, xDistance);
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
  options: ISimulateOptions = defaultOptions,
) {
  invariant(distance > 0, "distance must be positive");
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance;
  const xRatio = Math.abs(dx) / options.hitBox.x;
  const yRatio = Math.abs(dy) / options.hitBox.y;

  if (xRatio >= yRatio) {
    const xAv = velocityA.x;
    const xBv = velocityB.x;
    const sumV = Math.abs(xAv) + Math.abs(xBv);

    if (positionA.x > positionB.x) {
      positionA.x += dx >> 1 - 1;
      positionB.x -= dx >> 1;
      velocityA.x = sumV / 2;
      velocityB.x = sumV / -2;
    }
    if (positionA.x < positionB.x) {
      positionA.x -= dx >> 1 - 1;
      positionB.x += dx >> 1;
      velocityA.x = sumV / 2;
      velocityB.x = sumV / -2;
    }
  }
  if (yRatio >= xRatio) {
    // console.log("resolving Y collision", dy);
    if (positionA.y > positionB.y) {
      positionA.y += dy >> 1 - 1;
      positionB.y -= dy >> 1;
    }
    if (positionA.y < positionB.y) {
      positionA.y -= dy >> 1 - 1;
      positionB.y += dy >> 1;
    }
  }
}
