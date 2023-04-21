import * as ECS from "bitecs";

export interface OpaqueType<T extends string> {
  readonly __opaqueType: T;
}
export type EntityId = number & OpaqueType<"entityId">;

export function copy<Klass extends { __copy__(src: Klass): void }>(
  dest: Klass,
  src: Klass,
) {
  dest.__copy__(src);
}

export const defaultWorld = Object.assign(ECS.createWorld(), {
  delta: 0,
  elapsed: 0,
  then: performance.now(),
});
