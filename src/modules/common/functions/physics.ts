import { Box, IBox } from "../Box.ts";
import { invariant } from "../Error.ts";
import { Matrix2 } from "../math.ts";
import { add, clamp, extend, Instance, ReadOnly } from "../Vec2.ts";

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

export function resolveTileCollision1d(
  position: Instance,
  velocity: Instance,
  direction: CardinalDirection,
  collision: number,
) {
  invariant(collision > 0, "collision must be positive");
  switch (direction) {
    case CardinalDirection.xMin:
      velocity.x = Math.min(0, velocity.x);
      position.x += collision;
      break;
    case CardinalDirection.xMax:
      velocity.x = Math.max(0, velocity.x);
      position.x -= collision;
      break;
    case CardinalDirection.yMin:
      velocity.y = Math.max(0, velocity.y);
      position.y += collision;
      break;
    case CardinalDirection.yMax:
      velocity.y = Math.min(0, velocity.y);
      position.y -= collision;
      break;
  }
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
