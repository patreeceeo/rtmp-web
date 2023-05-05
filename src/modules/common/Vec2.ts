import * as ECS from "bitecs";
import { isAlmostZero } from "./math.ts";
import { EntityId } from "./state/mod.ts";

export interface IVec2 {
  x: number;
  y: number;
}

export class Vec2 implements IVec2 {
  static ZERO = new Vec2(0, 0);
  constructor(public x = 0, public y = 0) {}
  set(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }
  copy(src: Vec2) {
    this.x = src.x;
    this.y = src.y;
    return this;
  }
  clone() {
    const clone = new Vec2();
    clone.copy(this);
    return clone;
  }
  add(d: Vec2, scale = 1) {
    this.x += d.x * scale;
    this.y += d.y * scale;
    return this;
  }
  scale(s: number) {
    this.x *= s;
    this.y *= s;
    return this;
  }
  lengthSquared() {
    return this.x ** 2 + this.y ** 2;
  }
  extend(s: number) {
    const { x, y } = this;
    const xSign = Math.sign(x);
    const ySign = Math.sign(y);
    this.x = Math.max(0, x * xSign + s) * xSign;
    this.y = Math.max(0, y * ySign + s) * ySign;
    return this;
  }
  sub(d: Vec2) {
    this.x -= d.x;
    this.y -= d.y;
    return this;
  }
  clamp(maxLength: number) {
    const lengthSquared = this.lengthSquared();

    // Special case: start and end points are too close
    if (lengthSquared <= maxLength ** 2) {
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

  get snapshot(): IVec2 {
    return { x: this.x, y: this.y };
  }

  equals(other: Vec2) {
    return this.x === other.x && this.y === other.y;
  }

  almostEquals(other: Vec2, tolerance = Number.EPSILON) {
    return isAlmostZero(this.x - other.x, tolerance) &&
      isAlmostZero(this.y - other.y, tolerance);
  }

  applySnapshot(snap: typeof this.snapshot) {
    this.x = snap.x;
    this.y = snap.y;
  }
  static fromEntityComponent(
    eid: EntityId,
    store: ECS.ComponentType<typeof Vec2Type>,
  ): Vec2 {
    return Object.defineProperties(new Vec2(), {
      x: {
        get() {
          return store.x[eid];
        },
        set(v) {
          store.x[eid] = v;
        },
      },
      y: {
        get() {
          return store.y[eid];
        },
        set(v) {
          store.y[eid] = v;
        },
      },
    });
  }
}

export const Vec2Type = {
  x: ECS.Types.f32,
  y: ECS.Types.f32,
};
