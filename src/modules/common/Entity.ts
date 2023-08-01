import {
  addComponent as _addComponent,
  addEntity as _addEntity,
  entityExists,
  getAllEntities as _getAllEntities,
  hasComponent as _hasComponent,
  removeEntity,
} from "bitecs";
import {
  addComponent,
  addComponents,
  EntityWithComponents,
  hasAllComponents,
  hasComponent,
  IAnyComponentType,
} from "./Component.ts";
import { SoftDeletedTag } from "./components.ts";
import { defineQuery, IQuery } from "./Query.ts";
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
  set(entity: IEntityMinimal) {
    const wasDefined = entity.eid in this.#items;
    this.#items[entity.eid] = entity;
    if (!wasDefined) {
      this.#size++;
    }
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

export function mapEntity<C extends IAnyComponentType[]>(
  eid: EntityId,
  expectedComponents: C,
  world = defaultWorld,
): EntityWithComponents<C> {
  const entity = {
    eid,
    isSoftDeleted: _hasComponent(world, SoftDeletedTag.store, eid as number),
  };
  for (const component of expectedComponents) {
    addComponent(component, entity, world);
  }
  pool.set(entity);
  return entity as EntityWithComponents<C>;
}

const pool = new Pool();

// TODO it would be nice to be able to pass an array of components to add
export function addEntity(world = defaultWorld): IEntityMinimal {
  return pool.acquire(world);
}

export function hasEntity(eid: EntityId, world = defaultWorld): boolean {
  return entityExists(world, eid);
}

export function getEntity(eid: EntityId): IEntityMinimal | undefined {
  return pool.get(eid);
}

export function softDeleteEntity(
  eid: EntityId,
  world = defaultWorld,
): void {
  addComponent(SoftDeletedTag, getEntity(eid)!, world);
}

export function deleteEntity(eid: EntityId, world = defaultWorld): void {
  removeEntity(world, eid);
  pool.release(eid);
}

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
  #query: IQuery;
  constructor(readonly components: ComponentTypes) {
    this.#query = defineQuery(this.components);
  }
  add<InputEntity extends IEntityMinimal>(entity: InputEntity) {
    const prefab = addComponents<
      ComponentTypes[number]["propName"],
      InputEntity
    >(this.components, entity);
    return prefab;
  }
  query(): Iterable<
    EntityWithComponents<ComponentTypes>
  > {
    const eids = this.#query(defaultWorld);
    return eids.map((eid: number) => {
      return pool.get(eid as EntityId) as EntityWithComponents<ComponentTypes>;
    });
  }
  has(
    entity: EntityWithComponents<ComponentTypes>,
  ) {
    const eids = this.#query(defaultWorld);
    return entityExists(defaultWorld, entity.eid) && eids.includes(entity.eid);
  }
  get(eid: EntityId): EntityWithComponents<ComponentTypes> | undefined {
    return pool.get(eid) as EntityWithComponents<ComponentTypes>;
  }
}

export function castEntity<
  ComponentTypes extends ReadonlyArray<IAnyComponentType>,
>(
  entity: IEntityMinimal,
  Components: ComponentTypes,
): EntityWithComponents<ComponentTypes> {
  if (!hasAllComponents(Components, entity)) {
    throw new Error(`Entity ${entity.eid} does not have all components`);
  }
  return entity as EntityWithComponents<ComponentTypes>;
}

export function matchEntity<
  ComponentTypes extends ReadonlyArray<IAnyComponentType>,
  ReturnType,
>(
  entity: IEntityMinimal,
  Components: ComponentTypes,
  fn: (entity: EntityWithComponents<ComponentTypes>) => ReturnType,
): ReturnType | undefined {
  if (hasAllComponents(Components, entity)) {
    return fn(entity as EntityWithComponents<ComponentTypes>);
  }
}

export function getAllEntities(world = defaultWorld): Iterable<IEntityMinimal> {
  const eids = _getAllEntities(world);
  return eids.map((eid: number) => {
    return pool.get(eid as EntityId)!;
  });
}
