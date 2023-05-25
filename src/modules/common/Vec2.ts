import * as ECS from "bitecs";
import { IBox } from "./Box.ts";
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

function getRatioOfComponent(a: number, b: number) {
  return a / (Math.abs(a) + Math.abs(b));
}

export class Vec2ReadOnly implements IVec2Readonly {
  constructor(readonly x = 0, readonly y = 0) {}
  clone() {
    const clone = new Vec2();
    clone.copy(this);
    return clone;
  }
  get isZero() {
    return this.x === 0 && this.y === 0;
  }
  get lengthSquared() {
    return this.x * this.x + this.y * this.y;
  }
  get length() {
    return Math.sqrt(this.lengthSquared);
  }
  get snapshot(): IVec2 {
    return { x: this.x, y: this.y };
  }
  equals(other: IVec2) {
    return this.x === other.x && this.y === other.y;
  }
  almostEquals(other: IVec2, tolerance = Number.EPSILON) {
    return (
      isAlmostZero(this.x - other.x, tolerance) &&
      isAlmostZero(this.y - other.y, tolerance)
    );
  }
}

function getAbsMin(a: number, b: number) {
  return Math.min(Math.abs(a), Math.abs(b)) *
    (a !== 0 ? Math.sign(a) : 1);
}

export class Vec2 extends Vec2ReadOnly implements IVec2 {
  static ZERO = new Vec2ReadOnly(0, 0);
  static INFINITY = new Vec2ReadOnly(Infinity, Infinity);
  isDirty = true;
  constructor(public x = 0, public y = 0) {
    super(x, y);
  }
  set(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }
  copy(src: IVec2) {
    this.x = src.x;
    this.y = src.y;
    return this;
  }
  add(d: IVec2, scale = 1) {
    const dx = d.x * scale;
    const dy = d.y * scale;
    this.x += dx;
    this.y += dy;
    return this;
  }
  scale(s: number) {
    this.x *= s;
    this.y *= s;
    return this;
  }
  extend(s: number, other: IVec2Readonly) {
    if (other.x !== 0 || other.y !== 0) {
      const { x, y } = this;
      const xDelta = getRatioOfComponent(other.x, other.y) * s;
      const yDelta = getRatioOfComponent(other.y, other.x) * s;
      this.x = x == 0
        ? x + xDelta
        : x > 0
        ? Math.max(0, x + xDelta)
        : Math.min(0, x + xDelta);
      this.y = y == 0
        ? y + yDelta
        : y > 0
        ? Math.max(0, y + yDelta)
        : Math.min(0, y + yDelta);
      return this;
    }
  }
  sub(d: Vec2) {
    this.x -= d.x;
    this.y -= d.y;
    return this;
  }
  clamp(maxLength: number) {
    const lengthSquared = this.lengthSquared;

    // Special case: start and end points are too close
    if (lengthSquared <= maxLength * maxLength) {
      return this;
    }

    const { x: x, y: y } = this;

    if (isAlmostZero(x)) {
      // Math.abs(y) must be greater than maxLength becase we already checked for lengthSquared <= maxLength * maxLength
      this.y = maxLength * Math.sign(y);
      return this;
    }

    if (isAlmostZero(y)) {
      // Math.abs(dx) must be greater than maxLength becase we already checked for lengthSquared <= maxLength * maxLength
      this.x = maxLength * Math.sign(x);
      return this;
    }

    const length = Math.sqrt(lengthSquared);

    // Calculate the new point that is maxLength away from start in the direction of end
    this.x = (x * maxLength) / length;
    this.y = (y * maxLength) / length;
    return this;
  }

  limitToBoundingBox(xMin: number, yMin: number, xMax: number, yMax: number) {
    this.x = Math.max(xMin, Math.min(xMax, this.x));
    this.y = Math.max(yMin, Math.min(yMax, this.y));
  }

  fromBox(box: IBox) {
    this.x = box.xMin + box.w;
    this.y = box.yMin + box.h;
  }

  applySnapshot(snap: typeof this.snapshot) {
    this.x = snap.x;
    this.y = snap.y;
  }

  static fromEntityComponent<
    StoreSchema extends {
      x: ECS.Type;
      y: ECS.Type;
      flags: ECS.Type;
    },
  >(
    eid: EntityId,
    store: ECS.ComponentType<StoreSchema>,
    precision: StoreSchema["x"] & StoreSchema["y"],
  ): Vec2 {
    const absMax = precision === "i8" ? 2 ** 7 - 1 : 2 ** 31 - 1;
    return Object.defineProperties(new Vec2(), {
      x: {
        get() {
          return (store.x as Array<number>)[eid];
        },
        set(v) {
          const current = (store.x as Array<number>)[eid];
          if (current == v) return;
          (store.x as Array<number>)[eid] = getAbsMin(v, absMax);
        },
      },
      y: {
        get() {
          return (store.y as Array<number>)[eid];
        },
        set(v) {
          const current = (store.y as Array<number>)[eid];
          if (current == v) return;
          (store.y as Array<number>)[eid] = getAbsMin(v, absMax);
        },
      },
    });
  }
}

export enum Vec2Flags {
  None = 0,
  Dirty = 1,
}

export const Vec2LargeType = {
  x: ECS.Types.i32,
  y: ECS.Types.i32,
  flags: ECS.Types.ui8,
};

export const Vec2SmallType = {
  x: ECS.Types.i8,
  y: ECS.Types.i8,
  flags: ECS.Types.ui8,
};
