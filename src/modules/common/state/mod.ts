import * as ECS from "bitecs";
import { filter, map } from "../Iterable.ts";

export interface OpaqueType<T extends string> {
  readonly __opaqueType: T;
}
export type EntityId = number & OpaqueType<"entityId">;
export interface Just<T> {
  __value: T;
}

// TODO move Maybe stuff elsewhere
export type Nothing = {
  __value: undefined;
};
export type Maybe<T> =
  | Nothing
  | Just<T>;

export function Just<Type>(value: Type) {
  return new JustClass(value);
}
export function Nothing() {
  return new NothingClass();
}
class JustClass<Value> implements Just<Value> {
  constructor(readonly __value: Value) {
    Object.freeze(this);
  }
}
class NothingClass implements Nothing {
  __value: undefined;
  constructor() {
    Object.freeze(this);
  }
}

export function isJust<Type>(maybe: Maybe<Type>) {
  return maybe.__value !== undefined;
}
export function unboxJust<Type>(just: Just<Type>): Type {
  return just.__value;
}

export function flattenMaybes<Type>(
  iter: Iterable<Maybe<Type>>,
): Iterable<Type> {
  return map(filter(iter, isJust), unboxJust) as Iterable<Type>;
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
