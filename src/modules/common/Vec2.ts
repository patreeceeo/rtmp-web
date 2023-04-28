import * as ECS from "bitecs";
import { isAlmostZero } from "./math.ts";
import { EntityId } from "./state/mod.ts";

export interface IVec2 {
  x: number;
  y: number;
}

export class Vec2 implements IVec2 {
  constructor(public x = 0, public y = 0) {}
  set(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  copy(src: Vec2) {
    this.x = src.x;
    this.y = src.y;
  }
  clone() {
    const clone = new Vec2();
    clone.copy(this);
    return clone;
  }
  add(d: Vec2) {
    this.x += d.x;
    this.y += d.y;
  }
  scale(s: number) {
    this.x *= s;
    this.y *= s;
  }
  lengthSquared() {
    return this.x ** 2 + this.y ** 2;
  }
  extend(s: number) {
    const { x, y } = this;
    this.x = Math.max(0, x + s * Math.sign(x));
    this.y = Math.max(0, y + s * Math.sign(y));
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

  get snapshot(): IVec2 {
    return { x: this.x, y: this.y };
  }

  equals(other: Vec2) {
    return this.x === other.x && this.y === other.y;
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
