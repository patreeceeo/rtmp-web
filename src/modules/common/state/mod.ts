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

export interface IEntityQueryOptions {
  includeDeleted: boolean;
}

class EntityQueryOptions implements IEntityQueryOptions {
  includeDeleted = false;
}

export const defaultEntityQueryOptions: IEntityQueryOptions =
  new EntityQueryOptions();

export const IsDeletedStore = ECS.defineComponent();

export interface IEntityProxyConstructor {
  new (eid: EntityId): IEntityMinimal;
}
export interface IEntityMinimal {
  readonly eid: EntityId;
  readonly isDeleted: boolean;
}

export class ProxyPool<T> {
  #items: T[] = [];
  #factory: (eid: EntityId) => T;
  #size: number;
  // deno-lint-ignore no-explicit-any
  static registry = new Set<ProxyPool<any>>();

  constructor(factory: (eid: EntityId) => T, initialSize = 1) {
    this.#factory = factory;
    this.#size = initialSize;
    for (let eid = 0; eid < this.#size; eid++) {
      this.#items.push(factory(eid as EntityId));
    }
    ProxyPool.registry.add(this);
  }
  get size() {
    return this.#size;
  }
  acquire(eid: EntityId): T {
    if (!(eid in this.#items)) {
      this.#items[eid] = this.#factory(eid);
      this.#size++;
    }
    return this.#items[eid];
  }
  release(eid: EntityId) {
    if (eid in this.#items) {
      delete this.#items[eid];
      this.#size--;
    }
  }
}

export function softDeleteEntity(eid: EntityId, world = defaultWorld): void {
  ECS.addComponent(world, IsDeletedStore, eid);
}

export interface IEntityPrefabCollection {
  readonly components: ReadonlyArray<ECS.Component>;
  add(eid?: EntityId): EntityId;
  query(options?: IEntityQueryOptions): Iterable<EntityId>;
  has(eid: EntityId, options: IEntityQueryOptions): boolean;
  isDeleted(eid: EntityId): boolean;
}
