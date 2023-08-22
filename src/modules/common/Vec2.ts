import {
  PrimativeType,
  PrimativeTypes,
  StoreType,
  TypedArray,
} from "./Component.ts";
import { EntityId } from "./Entity.ts";
import { getAbsMin, isAlmostZero } from "./math.ts";

export function isZero({ x, y }: ReadOnly) {
  return x === 0 && y === 0;
}

export function getLengthSquared({ x, y }: ReadOnly) {
  return x * x + y * y;
}

export function length(o: ReadOnly) {
  return Math.sqrt(getLengthSquared(o));
}

export function getDistanceSquared(a: ReadOnly, b: ReadOnly) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function equals(a: ReadOnly, b: ReadOnly) {
  return a.x === b.x && a.y === b.y;
}

export function almostEquals(
  a: ReadOnly,
  b: ReadOnly,
  tolerance = Number.EPSILON,
) {
  return (
    isAlmostZero(a.x - b.x, tolerance) &&
    isAlmostZero(a.y - b.y, tolerance)
  );
}

export function set<T extends Instance>(o: T, x: number, y: number): T {
  o.x = x;
  o.y = y;
  return o;
}

export function copy<T extends Instance>(dest: T, src: Instance): T {
  dest.x = src.x;
  dest.y = src.y;
  return dest;
}

export function add<T extends Instance>(dest: T, d: Instance, scale = 1): T {
  const dx = d.x * scale;
  const dy = d.y * scale;
  dest.x += dx;
  dest.y += dy;
  return dest;
}

export function addScalars<T extends Instance>(dest: T, sx: number, sy: number): T {
  dest.x += sx;
  dest.y += sy;
  return dest;
}

export function scale<T extends Instance>(dest: T, s: number): T {
  dest.x *= s;
  dest.y *= s;
  return dest;
}

export function extend<T extends Instance>(
  dest: T,
  s: number,
  other: ReadOnly,
): T {
  if (other.x !== 0 || other.y !== 0) {
    const { x, y } = dest;
    const xDelta = getRatioOfComponent(other.x, other.y) * s;
    const yDelta = getRatioOfComponent(other.y, other.x) * s;
    dest.x = x == 0
      ? x + xDelta
      : x > 0
      ? Math.max(0, x + xDelta)
      : Math.min(0, x + xDelta);
    dest.y = y == 0
      ? y + yDelta
      : y > 0
      ? Math.max(0, y + yDelta)
      : Math.min(0, y + yDelta);
  }
  return dest;
}

export function sub<T extends Instance>(dest: T, d: ReadOnly): T {
  dest.x -= d.x;
  dest.y -= d.y;
  return dest;
}

export function clamp<T extends Instance>(o: T, maxLength: number): T {
  const lengthSquared = getLengthSquared(o);

  // Special case: start and end points are too close
  if (lengthSquared <= maxLength * maxLength) {
    return o;
  }

  const { x: x, y: y } = o;

  if (isAlmostZero(x)) {
    // Math.abs(y) must be greater than maxLength becase we already checked for lengthSquared <= maxLength * maxLength
    o.y = maxLength * Math.sign(y);
    return o;
  }

  if (isAlmostZero(y)) {
    // Math.abs(dx) must be greater than maxLength becase we already checked for lengthSquared <= maxLength * maxLength
    o.x = maxLength * Math.sign(x);
    return o;
  }

  const length = Math.sqrt(lengthSquared);

  // Calculate the new point that is maxLength away from start in the direction of end
  o.x = (x * maxLength) / length;
  o.y = (y * maxLength) / length;
  return o;
}

export function toJSON({ x, y }: ReadOnly): Instance {
  return { x, y };
}

function getRatioOfComponent(a: number, b: number) {
  return a / (Math.abs(a) + Math.abs(b));
}

interface Interface {
  x: number;
  y: number;
}

export class ReadOnly implements Instance {
  constructor(readonly x = 0, readonly y = 0) {}
}

export class Instance implements Interface {
  static ZERO = new ReadOnly(0, 0);
  static INFINITY = new ReadOnly(Infinity, Infinity);
  constructor(public x = 0, public y = 0) {}
}

export class ECSInstanceOptions<
  Schema extends { x: PrimativeType; y: PrimativeType },
> {
  constructor(
    public trapSet: (o: ECSInstance<Schema>, key: keyof Schema) => void,
    public trapGet: (o: ECSInstance<Schema>, key: keyof Schema) => void,
  ) {}
}

// deno-lint-ignore no-explicit-any
const _ecsInstanceOptions = new ECSInstanceOptions<any>(() => {}, () => {});

export class ECSInstance<Schema extends { x: PrimativeType; y: PrimativeType }>
  implements Interface {
  public maxLength: number;
  constructor(
    readonly store: StoreType<Schema>,
    public eid: EntityId,
    public options = _ecsInstanceOptions,
  ) {
    const byteLength = Math.min(
      (store.x as TypedArray).BYTES_PER_ELEMENT,
      (store.y as TypedArray).BYTES_PER_ELEMENT,
    );
    this.maxLength = (1 << (byteLength * 8 - 1)) - 1;
  }
  get x() {
    this.options.trapGet(this, "x");
    return (this.store.x as Array<number>)[this.eid];
  }

  set x(v) {
    this.options.trapSet(this, "x");
    // TODO this maxLength gaurd should be built in to numeric types?
    (this.store.x as Array<number>)[this.eid] = getAbsMin(v, this.maxLength);
  }

  get y() {
    this.options.trapGet(this, "y");
    return (this.store.y as Array<number>)[this.eid];
  }

  set y(v) {
    this.options.trapSet(this, "y");
    (this.store.y as Array<number>)[this.eid] = getAbsMin(v, this.maxLength);
  }
}

export const Vec2LargeSchema = {
  x: PrimativeTypes.i32,
  y: PrimativeTypes.i32,
};

export const Vec2SmallSchema = {
  x: PrimativeTypes.i8,
  y: PrimativeTypes.i8,
};
