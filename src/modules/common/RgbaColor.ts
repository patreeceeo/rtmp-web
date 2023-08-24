import { PrimativeTypes, StoreType } from "~/common/Component.ts";
import { EntityId } from "~/common/Entity.ts";

export const RgbaColorSchema = {
  r: PrimativeTypes.ui8,
  g: PrimativeTypes.ui8,
  b: PrimativeTypes.ui8,
  a: PrimativeTypes.ui8,
};

export enum RgbaChannelEnum {
  RED = 0,
  GREEN = 1,
  BLUE = 2,
  ALPHA = 3,
}

export interface IRgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export class RgbaColor implements IRgbaColor {
  constructor(
    public r = 0,
    public g = 0,
    public b = 0,
    public a = 0,
  ) {}
}

export class EcsRgbaColor implements IRgbaColor {
  constructor(
    readonly store: StoreType<typeof RgbaColorSchema>,
    public eid: EntityId,
  ) {}

  get r() {
    return this.store.r[this.eid];
  }
  set r(value) {
    this.store.r[this.eid] = value;
  }

  get g() {
    return this.store.g[this.eid];
  }
  set g(value) {
    this.store.g[this.eid] = value;
  }

  get b() {
    return this.store.b[this.eid];
  }
  set b(value) {
    this.store.b[this.eid] = value;
  }

  get a() {
    return this.store.a[this.eid];
  }
  set a(value) {
    this.store.a[this.eid] = value;
  }
}
