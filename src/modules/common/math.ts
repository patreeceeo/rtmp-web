import { Vec2 } from "./Vec2.ts";

export function getDistanceSquared(a: Vec2, b: Vec2) {
  return Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);
}

export function isAlmostZero(n: number, tolerance = Number.EPSILON) {
  return Math.abs(n) <= tolerance;
}

/** @deprecated */
export function clampLine(
  start: Vec2,
  end: Vec2,
  maxLength: number,
): Vec2 {
  const { x: x1, y: y1 } = start;
  const { x: x2, y: y2 } = end;
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Special case: start and end points are the same
  if (isAlmostZero(dx) && isAlmostZero(dy)) {
    return new Vec2(x1, y1);
  }

  // Calculate the distance between start and end points
  const lengthSquared = dx * dx + dy * dy;

  // Special case: start and end points are too close
  if (lengthSquared <= maxLength * maxLength) {
    return new Vec2(x2, y2);
  }

  if (isAlmostZero(dx)) {
    return new Vec2(x1, y1 + Math.min(Math.abs(dy), maxLength) * Math.sign(dy));
  }

  if (isAlmostZero(dy)) {
    return new Vec2(x1 + Math.min(Math.abs(dx), maxLength) * Math.sign(dx), y1);
  }

  const length = fastSqrt(lengthSquared);

  // Calculate the new point that is maxLength away from start in the direction of end
  const newX = x1 + dx * maxLength / length;
  const newY = y1 + dy * maxLength / length;

  return new Vec2(newX, newY);
}

export function roundTo8thBit(value: number) {
  return value & 128 ? (value >> 8) + 1 : value >> 8;
}

const sqrtLut = new Float32Array(2 ** 16);

for (let i = 0; i < sqrtLut.length; i++) {
  sqrtLut[i] = Math.sqrt(i);
}

export function fastSqrt(x: number) {
  if (x < sqrtLut.length) {
    return sqrtLut[Math.floor(x)];
  } else {
    return Math.sqrt(x);
  }
}
