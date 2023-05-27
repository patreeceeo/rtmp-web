import * as ECS from "bitecs";
import { isAlmostZero } from "./math.ts";
import { EntityId } from "./state/mod.ts";

export interface IVec2 {
  x: number;
  y: number;
}

export interface IVec2Readonly {
  readonly x: number;
  readonly y: number;
}

export interface IVec2Class extends IVec2 {
  isZero: boolean;
  lengthSquared: number;
  length: number;
  equals(o: IVec2Readonly): boolean;
  almostEquals(o: IVec2Readonly, tolerance?: number): boolean;
  set(x: number, y: number): this;
  copy(o: IVec2Readonly): this;
  add(o: IVec2Readonly, scale: number): this;
  sub(o: IVec2Readonly): this;
  scale(s: number): this;
  extend(s: number, o: IVec2Readonly): this;
  clamp(max: number): this;
}

interface IVec2Functions {
  isZero(o: IVec2Readonly): boolean;
  lengthSquared(o: IVec2Readonly): number;
  length(o: IVec2Readonly): number;
  equals(a: IVec2Readonly, b: IVec2Readonly): boolean;
  almostEquals(a: IVec2Readonly, b: IVec2Readonly, tolerance?: number): boolean;
  set<T extends IVec2>(o: T, x: number, y: number): T;
  copy<T extends IVec2>(dest: T, src: IVec2Readonly): T;
  add<T extends IVec2>(dest: T, a: IVec2Readonly, scale: number): T;
  sub<T extends IVec2>(dest: T, a: IVec2Readonly): T;
  scale<T extends IVec2>(dest: T, s: number): T;
  extend<T extends IVec2>(dest: T, s: number, o: IVec2Readonly): T;
  clamp<T extends IVec2>(dest: T, max: number): T;
}

const Vec2Functions: IVec2Functions = Object.freeze({
  isZero({ x, y }: IVec2Readonly) {
    return x === 0 && y === 0;
  },
  lengthSquared({ x, y }: IVec2Readonly) {
    return x * x + y * y;
  },
  length(o: IVec2Readonly) {
    return Math.sqrt(this.lengthSquared(o));
  },
  equals(a: IVec2Readonly, b: IVec2Readonly) {
    return a.x === b.x && a.y === b.y;
  },
  almostEquals(a: IVec2Readonly, b: IVec2Readonly, tolerance = Number.EPSILON) {
    return (
      isAlmostZero(a.x - b.x, tolerance) &&
      isAlmostZero(a.y - b.y, tolerance)
    );
  },
  set<T extends IVec2>(o: T, x: number, y: number) {
    o.x = x;
    o.y = y;
    return o;
  },
  copy<T extends IVec2>(dest: T, src: IVec2) {
    dest.x = src.x;
    dest.y = src.y;
    return dest;
  },
  add<T extends IVec2>(dest: T, d: IVec2, scale = 1) {
    const dx = d.x * scale;
    const dy = d.y * scale;
    dest.x += dx;
    dest.y += dy;
    return dest;
  },
  scale<T extends IVec2>(dest: T, s: number) {
    dest.x *= s;
    dest.y *= s;
    return dest;
  },
  extend<T extends IVec2>(dest: T, s: number, other: IVec2Readonly) {
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
  },
  sub<T extends IVec2>(dest: T, d: IVec2Readonly) {
    dest.x -= d.x;
    dest.y -= d.y;
    return dest;
  },
  clamp<T extends IVec2>(o: T, maxLength: number): T {
    const lengthSquared = this.lengthSquared(o);

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
  },
});

export class Vec2ReadOnly implements IVec2Readonly {
  constructor(readonly x = 0, readonly y = 0) {}
  clone(): Vec2ReadOnly {
    const clone = new Vec2();
    clone.copy(this);
    return clone;
  }
  get isZero() {
    return Vec2Functions.isZero(this);
  }
  get lengthSquared() {
    return Vec2Functions.lengthSquared(this);
  }
  get length() {
    return Vec2Functions.length(this);
  }
  equals(other: IVec2) {
    return Vec2Functions.equals(this, other);
  }
  almostEquals(other: IVec2, tolerance = Number.EPSILON) {
    return Vec2Functions.almostEquals(this, other, tolerance);
  }
}

function getAbsMin(a: number, b: number) {
  return Math.min(Math.abs(a), Math.abs(b)) *
    (a !== 0 ? Math.sign(a) : 1);
}

function getRatioOfComponent(a: number, b: number) {
  return a / (Math.abs(a) + Math.abs(b));
}

export class Vec2 extends Vec2ReadOnly implements IVec2Class {
  static ZERO = new Vec2ReadOnly(0, 0);
  static INFINITY = new Vec2ReadOnly(Infinity, Infinity);
  constructor(public x = 0, public y = 0) {
    super(x, y);
  }
  set(x: number, y: number) {
    return Vec2Functions.set(this, x, y);
  }
  copy(src: IVec2Readonly) {
    return Vec2Functions.copy(this, src);
  }
  add(d: IVec2Readonly, scale = 1) {
    return Vec2Functions.add(this, d, scale);
  }
  scale(s: number) {
    return Vec2Functions.scale(this, s);
  }
  extend(s: number, other: IVec2Readonly) {
    return Vec2Functions.extend(this, s, other);
  }
  sub(d: IVec2Readonly) {
    return Vec2Functions.sub(this, d);
  }
  clamp(maxLength: number) {
    return Vec2Functions.clamp(this, maxLength);
  }
}

export class Vec2FromStore<ComponentType extends { x: ECS.Type; y: ECS.Type }>
  implements IVec2Class {
  public maxLength: number;
  constructor(
    readonly store: ECS.ComponentType<ComponentType>,
    public eid: EntityId,
  ) {
    const byteLength = Math.min(
      (store.x as ECS.TypedArray).BYTES_PER_ELEMENT,
      (store.y as ECS.TypedArray).BYTES_PER_ELEMENT,
    );
    this.maxLength = (1 << (byteLength * 8 - 1)) - 1;
  }
  get x() {
    return (this.store.x as Array<number>)[this.eid];
  }

  set x(v) {
    (this.store.x as Array<number>)[this.eid] = getAbsMin(v, this.maxLength);
  }

  get y() {
    return (this.store.y as Array<number>)[this.eid];
  }

  set y(v) {
    (this.store.y as Array<number>)[this.eid] = getAbsMin(v, this.maxLength);
  }

  get isZero() {
    return Vec2Functions.isZero(this);
  }
  get lengthSquared() {
    return Vec2Functions.lengthSquared(this);
  }
  get length() {
    return Vec2Functions.length(this);
  }
  equals(other: IVec2) {
    return Vec2Functions.equals(this, other);
  }
  almostEquals(other: IVec2, tolerance = Number.EPSILON) {
    return Vec2Functions.almostEquals(this, other, tolerance);
  }

  set(x: number, y: number) {
    return Vec2Functions.set(this, x, y);
  }
  copy(src: IVec2) {
    return Vec2Functions.copy(this, src);
  }
  add(d: IVec2, scale = 1) {
    return Vec2Functions.add(this, d, scale);
  }
  scale(s: number) {
    return Vec2Functions.scale(this, s);
  }
  extend(s: number, other: IVec2Readonly) {
    return Vec2Functions.extend(this, s, other);
  }
  sub(d: Vec2) {
    return Vec2Functions.sub(this, d);
  }
  clamp(maxLength: number) {
    return Vec2Functions.clamp(this, maxLength);
  }
}

export const Vec2LargeType = {
  x: ECS.Types.i32,
  y: ECS.Types.i32,
};

export const Vec2SmallType = {
  x: ECS.Types.i8,
  y: ECS.Types.i8,
};
