import { createWorld, IWorld as _IWorld } from "bitecs";

export const defaultWorld = Object.assign(createWorld(), {
  delta: 0,
  elapsed: 0,
  then: performance.now(),
});

export type IWorld = _IWorld;
