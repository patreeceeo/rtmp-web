import { Box, IBox } from "../Box.ts";
import { Matrix2 } from "../math.ts";
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

export const TILE_SIZE_BITLENGTH = 13;
export const TILE_SIZE = 1 << TILE_SIZE_BITLENGTH;

export function resolveTileCollisions(
  position: Instance,
  velocity: Instance,
  tileMatrix: Matrix2<boolean>,
  options: ISimulateOptions = defaultOptions,
) {
  const hitBox = options.hitBox;
  const xHalfHitBox = hitBox.x / 2;
  const yHalfHitBox = hitBox.y / 2;
  const xMin = position.x - xHalfHitBox;
  const yMin = position.y - yHalfHitBox;
  const xMax = position.x + xHalfHitBox;
  const yMax = position.y + yHalfHitBox;
  const xMinMatrix = xMin >> TILE_SIZE_BITLENGTH;
  const yMinMatrix = yMin >> TILE_SIZE_BITLENGTH;
  const xMaxMatrix = (xMax - 1) >> TILE_SIZE_BITLENGTH;
  const yMaxMatrix = (yMax - 1) >> TILE_SIZE_BITLENGTH;
  const xMinTile = (xMinMatrix + 1) << TILE_SIZE_BITLENGTH;
  const yMinTile = (yMinMatrix + 1) << TILE_SIZE_BITLENGTH;
  const xMaxTile = xMaxMatrix << TILE_SIZE_BITLENGTH;
  const yMaxTile = yMaxMatrix << TILE_SIZE_BITLENGTH;

  // TODO restitution
  // Directions are relative to the dynamic object (e.g. the player)
  const isTopLeftCollision = tileMatrix.get(xMinMatrix, yMinMatrix);
  const isTopRightCollision = tileMatrix.get(xMaxMatrix, yMinMatrix);
  const isBottomRightCollision = tileMatrix.get(xMaxMatrix, yMaxMatrix);
  const isBottomLeftCollision = tileMatrix.get(xMinMatrix, yMaxMatrix);
  const isLeftCollision = isTopLeftCollision || isBottomLeftCollision;
  const isRightCollision = isTopRightCollision || isBottomRightCollision;
  const isTopCollision = isTopLeftCollision || isTopRightCollision;
  const isBottomCollision = isBottomLeftCollision || isBottomRightCollision;
  const isCollisionDetected = isTopLeftCollision ||
    isTopRightCollision ||
    isBottomRightCollision ||
    isBottomLeftCollision;

  if (isCollisionDetected) {
    const xImpact = isLeftCollision ? xMinTile - xMin : xMax - xMaxTile;
    const yImpact = isTopCollision ? yMinTile - yMin : yMax - yMaxTile;

    if (isRightCollision && xImpact <= yImpact) {
      if (velocity.x > 0) {
        velocity.x = 0;
      }
      position.x = xMinTile - xHalfHitBox;
    }
    if (isLeftCollision && xImpact <= yImpact) {
      if (velocity.x < 0) {
        velocity.x = 0;
      }
      position.x = xMaxTile + xHalfHitBox;
    }
    if (isBottomCollision && yImpact <= xImpact) {
      if (velocity.y > 0) {
        velocity.y = 0;
      }
      position.y = yMinTile - yHalfHitBox;
    }
    if (isTopCollision && yImpact <= xImpact) {
      if (velocity.y < 0) {
        velocity.y = 0;
      }
      position.y = yMaxTile + yHalfHitBox;
    }
  }
}
