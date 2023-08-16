import { PrimativeTypes, StoreType } from "~/common/Component.ts";
import { EntityId } from "~/common/Entity.ts";

export enum LifeMode {
  ALIVE,
  DYING,
  DEAD,
}

export const LifeSchema = {
  mode: PrimativeTypes.ui8,
  modeTime: PrimativeTypes.ui32,
};
export class Life {
  constructor(
    readonly store: StoreType<typeof LifeSchema>,
    public eid: EntityId,
  ) {}

  get mode() {
    return this.store.mode[this.eid] as LifeMode;
  }
  set mode(value: LifeMode) {
    this.store.mode[this.eid] = value;
    this.store.modeTime[this.eid] = 0;
  }
  get modeTime() {
    return this.store.modeTime[this.eid];
  }
  set modeTime(value: number) {
    this.store.modeTime[this.eid] = value;
  }
}
