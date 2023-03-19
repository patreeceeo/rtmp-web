import * as ECS from "bitecs";
import { EntityId } from "./state/mod.ts";

export class Vec2 {
  constructor(public x = 0, public y = 0) {}
  set(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  copy(src: Vec2) {
    this.x = src.x;
    this.y = src.y;
  }
  add(dx: number, dy: number) {
    this.x += dx;
    this.y += dy;
  }

  get snapshot () {
    return { x: this.x, y: this.y }
  }

  applySnapshot(snap: typeof this.snapshot) {
    this.x = snap.x
    this.y = snap.y
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
