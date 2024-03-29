import { Instance } from "./Vec2.ts";

export const PI2 = 2 * Math.PI;

export function normalizeAngle(angle: number) {
  const newAngle = angle % Math.PI;
  return newAngle < 0 ? newAngle + PI2 : newAngle;
}

export function invertAngle(angle: number) {
  return normalizeAngle(angle + Math.PI);
}

export function rad2deg(radians: number) {
  return (normalizeAngle(radians) * 180) / Math.PI;
}

export function getDistanceSquared(a: Instance, b: Instance) {
  return Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);
}

export function getDistanceBetweenEllipses(
  centerA: Instance,
  centerB: Instance,
  radiusX: number,
  radiusY: number,
) {
  const dx = centerB.x - centerA.x;
  const dy = centerB.y - centerA.y;
  const angle = Math.atan2(dy, dx);
  const dxEdge = Math.cos(angle) * radiusX;
  const dyEdge = Math.sin(angle) * radiusY;
  const distanceFromEdges = Math.sqrt(dxEdge * dxEdge + dyEdge * dyEdge) * 2;
  const distanceFromCenters = Math.sqrt(getDistanceSquared(centerA, centerB));
  return distanceFromCenters - distanceFromEdges;
}

export function isAlmostZero(n: number, tolerance = Number.EPSILON) {
  return Math.abs(n) <= tolerance;
}

/** @deprecated */
export function clampLine(
  start: Instance,
  end: Instance,
  maxLength: number,
): Instance {
  const { x: x1, y: y1 } = start;
  const { x: x2, y: y2 } = end;
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Special case: start and end points are the same
  if (isAlmostZero(dx) && isAlmostZero(dy)) {
    return new Instance(x1, y1);
  }

  // Calculate the distance between start and end points
  const lengthSquared = dx * dx + dy * dy;

  // Special case: start and end points are too close
  if (lengthSquared <= maxLength * maxLength) {
    return new Instance(x2, y2);
  }

  if (isAlmostZero(dx)) {
    return new Instance(
      x1,
      y1 + Math.min(Math.abs(dy), maxLength) * Math.sign(dy),
    );
  }

  if (isAlmostZero(dy)) {
    return new Instance(
      x1 + Math.min(Math.abs(dx), maxLength) * Math.sign(dx),
      y1,
    );
  }

  const length = Math.sqrt(lengthSquared);

  // Calculate the new point that is maxLength away from start in the direction of end
  const newX = x1 + dx * maxLength / length;
  const newY = y1 + dy * maxLength / length;

  return new Instance(newX, newY);
}

export function roundTo8thBit(value: number) {
  return value & 128 ? (value >> 8) + 1 : value >> 8;
}

export function getAbsMin(a: number, b: number) {
  return Math.min(Math.abs(a), Math.abs(b)) *
    (a !== 0 ? Math.sign(a) : 1);
}

// TODO move to separate file?
export class Matrix2<Value> {
  values: Value[] = [];
  constructor(
    readonly width: number,
    readonly height: number,
    readonly defaultValue: Value,
  ) {
    this.values.length = width * height;
  }
  get(x: number, y: number): Value {
    // invariant(x >= 0 && x < this.width, `x out of bounds: ${x}`);
    // invariant(y >= 0 && y < this.height, `y out of bounds: ${x}`);
    const key = x + y * this.width;
    return key in this.values ? this.values[key] : this.defaultValue;
  }
  set(x: number, y: number, value: Value): void {
    // invariant(x >= 0 && x < this.width, `x out of bounds: ${x}`);
    // invariant(y >= 0 && y < this.height, `y out of bounds: ${x}`);
    this.values[x + y * this.width] = value;
  }
}
