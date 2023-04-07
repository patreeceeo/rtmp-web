import * as ECS from "bitecs";

export interface OpaqueType<T extends string> {
  readonly __opaqueType: T;
}
export type EntityId = number & OpaqueType<"entityId">;
export interface Just<T> {
  value: T;
}
export type Nothing = {
  value: undefined;
};
export type Maybe<T> =
  | Nothing
  | Just<T>;

function getEmptyObject() {
  return Object.create(null);
}

export function Just<Type>(value: Type) {
  const o = getEmptyObject();
  o.value = value;
  return o as Just<Type>;
}
export function Nothing() {
  return getEmptyObject() as Nothing;
}

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
