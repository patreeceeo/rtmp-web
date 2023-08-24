export interface OpaqueType<T extends string> {
  readonly __opaqueType: T;
}

export type Assign<T, U> = T & U;

export type PossibleObjectKey = string | number | symbol;
