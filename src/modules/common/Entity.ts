import {
  addComponent as _addComponent,
  addEntity as _addEntity,
  entityExists,
  removeEntity,
} from "bitecs";
import {
  addComponents,
  EntityWithComponents,
  IAnyComponentType,
} from "./Component.ts";
import { SoftDeletedTag } from "./components.ts";
import { defineQuery, IQuery, Not } from "./Query.ts";
import { OpaqueType } from "./util.ts";
import { defaultWorld } from "./World.ts";

export type EntityId = number & OpaqueType<"entityId">;

export interface IEntityProxyConstructor {
  new (eid: EntityId): IEntityMinimal;
}
export interface IEntityMinimal {
  readonly eid: EntityId;
  readonly isSoftDeleted: boolean;
}

export class Pool {
  #items: IEntityMinimal[] = [];
  #size = 0;

  constructor() {
    this.#size = 0;
  }
  get size() {
    return this.#size;
  }
  acquire(world = defaultWorld): IEntityMinimal {
    const entity = createEntity(world);
    this.#items[entity.eid] = entity;
    this.#size++;
    return entity;
  }
  get(eid: EntityId): IEntityMinimal | undefined {
    return this.#items[eid];
  }
  release(eid: EntityId) {
    if (eid in this.#items) {
      delete this.#items[eid];
      this.#size--;
    }
  }
}

function createEntity(world = defaultWorld): IEntityMinimal {
  return {
    eid: _addEntity(world) as EntityId,
    isSoftDeleted: false,
  };
}

const pool = new Pool();

export function addEntity(world = defaultWorld): IEntityMinimal {
  return pool.acquire(world);
}

export function softDeleteEntity(
  eid: EntityId,
  world = defaultWorld,
): void {
  _addComponent(world, SoftDeletedTag.store, eid);
}

export function deleteEntity(eid: EntityId, world = defaultWorld): void {
  removeEntity(world, eid);
  pool.release(eid);
}

export interface IEntityQueryOptions {
  // TODO get rid of this option and just create a separate collection
  includeSoftDeleted: boolean;
}

class EntityQueryOptions implements IEntityQueryOptions {
  includeSoftDeleted = false;
}

export const defaultEntityQueryOptions: IEntityQueryOptions =
  new EntityQueryOptions();

/**
* @example
interface ITest extends IEntityMinimal {
  pose: PoseType;
}
const test = new EntityPrefabCollection([PoseComponent]);
const result: ITest = test.add({ eid: 0 as EntityId, isSoftDeleted: false})
*/
export class EntityPrefabCollection<
  ComponentTypes extends ReadonlyArray<IAnyComponentType>,
> {
  #queryNotDeleted: IQuery;
  #query: IQuery;
  constructor(readonly components: ComponentTypes) {
    this.#query = defineQuery(this.components);
    this.#queryNotDeleted = defineQuery([
      ...this.components,
      Not(SoftDeletedTag),
    ]);
  }
  add<InputEntity extends IEntityMinimal>(entity: InputEntity) {
    const prefab = addComponents<
      ComponentTypes[number]["propName"],
      InputEntity
    >(this.components, entity);
    return prefab;
  }
  query(
    options: IEntityQueryOptions = defaultEntityQueryOptions,
  ): Iterable<
    EntityWithComponents<ComponentTypes>
  > {
    const eids =
      (options.includeSoftDeleted
        ? this.#query(defaultWorld)
        : this.#queryNotDeleted(defaultWorld)) as EntityId[];
    return eids.map((eid) => {
      return pool.get(eid) as EntityWithComponents<ComponentTypes>;
    });
  }
  has(
    entity: EntityWithComponents<ComponentTypes>,
    options: IEntityQueryOptions = defaultEntityQueryOptions,
  ) {
    const eids =
      (options.includeSoftDeleted
        ? this.#query(defaultWorld)
        : this.#queryNotDeleted(defaultWorld)) as EntityId[];
    return entityExists(defaultWorld, entity.eid) && eids.includes(entity.eid);
  }
  get(eid: EntityId): EntityWithComponents<ComponentTypes> | undefined {
    return pool.get(eid) as EntityWithComponents<ComponentTypes>;
  }
}
