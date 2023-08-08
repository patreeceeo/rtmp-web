import {
  addComponent as addToStore,
  Component,
  ComponentType as _StoreType,
  defineComponent as createStore,
  hasComponent as _hasComponent,
  ISchema as _ISchema,
  IWorld,
  QueryModifier,
  removeComponent as removeFromStore,
  Type as _Type,
  TypedArray as _TypedArray,
  Types as _Types,
} from "bitecs";
import { EntityId, IEntityBase } from "./Entity.ts";
import { invariant } from "./Error.ts";
import { ModifierFlags } from "./Query.ts";
import { defaultWorld } from "./World.ts";
import { IEntityMaximal } from "~/common/entities.ts";
import { Assign, PossibleObjectKey } from "~/common/util.ts";
import { Pool } from "~/common/Pool.ts";
import { EntityWithComponents } from "~/common/EntityWithComponents.ts";

export type ISchema = _ISchema;
export type StoreType<T extends ISchema> = _StoreType<T>;
export type PrimativeType = _Type;
export type TypedArray = _TypedArray;

export const PrimativeTypes = _Types;

// Idea: component types as entities to allow for recursive composition

type ITagSchema = Record<string | number | symbol, never>;

export type WithPropertyForComponent<T, P extends keyof IEntityMaximal> =
  & T
  & {
    [K in P]: IEntityMaximal[K];
  };

export type AnyPropName = keyof IEntityMaximal;

export interface IComponentType<
  S extends ISchema,
  PropName extends keyof IEntityMaximal,
> {
  readonly schema: S;
  readonly store: StoreType<S>;
  readonly queryable: StoreType<S> | Component | QueryModifier;
  readonly propName: PropName;
  readonly modifiers: number;
  getValue(
    world: IWorld,
    store: StoreType<S>,
    eid: EntityId,
  ): IEntityMaximal[PropName];
  onAdd(target: EntityWithComponents<[this]>, componentType: this): void;
  onRemove(target: EntityWithComponents<[this]>, componentType: this): void;
}

export interface ITagComponentType<
  S extends ISchema,
  PropName extends keyof IEntityMaximal,
> extends IComponentType<S, PropName> {
  registerWithEntity(target: IEntityBase): void;
}

export interface ITagComponentType<
  S extends ISchema,
  PropName extends keyof IEntityMaximal,
> extends IComponentType<S, PropName> {
  registerWithEntity(target: IEntityBase): void;
}

export type IAnyComponentType = IComponentType<ISchema, keyof IEntityMaximal>;

interface IComponentConfigBase<
  S extends ISchema,
  PropName extends keyof IEntityMaximal,
> {
  propName: PropName;
  onAdd?: IComponentType<S, PropName>["onAdd"];
  onRemove?: IComponentType<S, PropName>["onRemove"];
}

type ITagConfig<PropName extends keyof IEntityMaximal> = IComponentConfigBase<
  ITagSchema,
  PropName
>;

export function defineTag<PropName extends keyof IEntityMaximal>(
  config: ITagConfig<PropName>,
): ITagComponentType<ITagSchema, PropName> {
  const store = createStore<ITagSchema>();
  const base = {
    configurable: true,
    enumerable: true,
  };
  type _ComponentType = ITagComponentType<ITagSchema, PropName>;
  const result: _ComponentType = Object.freeze({
    propName: config.propName,
    schema: {},
    store,
    queryable: store,
    modifiers: ModifierFlags.None,
    registerWithEntity(target: IEntityBase) {
      Object.defineProperty(target, this.propName, {
        get: this.getValue.bind(this, defaultWorld, store, target.eid),
        set: this.setValue.bind(this, defaultWorld, store, target.eid),
        ...base,
      });
    },
    getValue(world: IWorld, store: StoreType<ITagSchema>, eid: EntityId) {
      return _hasComponent(world, store, eid) as IEntityMaximal[PropName];
    },
    setValue(
      world: IWorld,
      store: StoreType<ITagSchema>,
      eid: EntityId,
      value: boolean,
    ) {
      if (value) {
        addToStore(world, store, eid);
      } else {
        removeFromStore(world, store, eid);
      }
    },
    onAdd(target: EntityWithComponents<[_ComponentType]>) {
      config.onAdd?.(target, result);
    },
    onRemove(target: EntityWithComponents<[_ComponentType]>) {
      config.onRemove?.(target, result);
    },
  });
  return result;
}

interface IComponentConfig<
  S extends ISchema = ITagSchema,
  PropName extends keyof IEntityMaximal = keyof IEntityMaximal,
> extends IComponentConfigBase<S, PropName> {
  schema: S;
  getValue(
    world: IWorld,
    store: StoreType<S>,
    eid: EntityId,
  ): IEntityMaximal[PropName];
  setValue?: (
    world: IWorld,
    store: StoreType<S>,
    eid: EntityId,
    value: IEntityMaximal[PropName],
  ) => void;
}

interface IObjectComponentConfig<
  S extends ISchema = ITagSchema,
  PropName extends keyof IEntityMaximal = keyof IEntityMaximal,
> extends IComponentConfig<S, PropName> {
  identify: (value: IEntityMaximal[PropName]) => number;
}

export function defineComponent<
  S extends ISchema = ITagSchema,
  PropName extends keyof IEntityMaximal = keyof IEntityMaximal,
  StaticAssigns extends Record<PossibleObjectKey, unknown> = Record<
    PossibleObjectKey,
    never
  >,
>(
  config: IComponentConfig<S, PropName>,
  staticAssigns: StaticAssigns = {} as Record<PossibleObjectKey, never>,
): Assign<IComponentType<S, PropName>, StaticAssigns> {
  const store = createStore(config.schema);
  return Object.freeze({
    propName: config.propName,
    schema: config.schema,
    getValue: config.getValue,
    store,
    queryable: store,
    modifiers: ModifierFlags.None,
    onAdd(target: IEntityBase, componentType: IComponentType<S, PropName>) {
      const base = {
        configurable: true,
        enumerable: true,
      };
      if ("setValue" in config) {
        Object.defineProperty(target, this.propName, {
          get: () => {
            return this.getValue(defaultWorld, componentType.store, target.eid);
          },
          set: (value: IEntityMaximal[PropName]) => {
            config.setValue!(
              defaultWorld,
              componentType.store,
              target.eid,
              value,
            );
          },
          ...base,
        });
      } else {
        Object.defineProperty(target, this.propName, {
          value: this.getValue(defaultWorld, componentType.store, target.eid),
          writable: false,
          ...base,
        });
      }
      config.onAdd?.(
        target as EntityWithComponents<[IComponentType<S, PropName>]>,
        componentType,
      );
    },
    onRemove(target: IEntityBase) {
      Object.defineProperty(target, this.propName, {
        get: () => {
          throw new Error(
            `Tried to access removed component: ${this.propName}`,
          );
        },
        configurable: true,
        enumerable: false,
      });
    },
    ...staticAssigns,
  });
}

export function defineObjectComponent<
  S extends ISchema = ITagSchema,
  PropName extends keyof IEntityMaximal = keyof IEntityMaximal,
  StaticAssigns extends Record<PossibleObjectKey, unknown> = Record<
    PossibleObjectKey,
    never
  >,
>(
  config: IObjectComponentConfig<S, PropName>,
  staticAssigns: StaticAssigns = {} as Record<PossibleObjectKey, never>,
): Assign<IComponentType<S, PropName>, StaticAssigns> {
  const pool = new Pool<IEntityMaximal[PropName], [StoreType<S>, EntityId]>(
    (store: StoreType<S>, eid: EntityId) =>
      config.getValue(defaultWorld, store, eid),
    (o) => config.identify(o),
  );
  const Component = defineComponent({
    ...config,
    getValue(
      _world: IWorld,
      store: StoreType<S>,
      eid: EntityId,
    ) {
      return pool.get(eid) || pool.acquire(store, eid);
    },
  }, staticAssigns);
  return Component;
}

export function addComponent<
  PropName extends keyof IEntityMaximal,
  E extends IEntityBase,
>(
  componentType: IComponentType<ISchema, PropName>,
  entity: E,
  world = defaultWorld,
): WithPropertyForComponent<E, PropName> {
  invariant(
    !(componentType.modifiers & ModifierFlags.Not) ||
      !_hasComponent(world, componentType.store, entity.eid),
    `Not implemented: Add Not(ComponentX) to entity with ComponentX`,
  );
  if (componentType.modifiers === ModifierFlags.None) {
    addToStore(world, componentType.store, entity.eid);
    componentType.onAdd(
      entity as unknown as EntityWithComponents<[typeof componentType]>,
      componentType,
    );
  }
  return entity as WithPropertyForComponent<E, PropName>;
}

export function addComponents<
  PropNames extends keyof IEntityMaximal,
  E extends IEntityBase,
>(
  componentTypes: ReadonlyArray<IComponentType<ISchema, PropNames>>,
  entity: E,
  world = defaultWorld,
): WithPropertyForComponent<E, PropNames> {
  for (const componentType of componentTypes) {
    addComponent(componentType, entity, world);
  }
  return entity as WithPropertyForComponent<E, PropNames>;
}

export function removeComponent<
  PropName extends keyof IEntityMaximal,
  E extends EntityWithComponents<[IComponentType<ISchema, PropName>]>,
>(
  componentType: IComponentType<ISchema, PropName>,
  entity: E,
  world = defaultWorld,
): Omit<E, PropName> {
  invariant(
    !(componentType.modifiers & ModifierFlags.Not) ||
      _hasComponent(world, componentType.store, entity.eid),
    `Not implemented: Remove Not(ComponentX) from entity without ComponentX`,
  );
  if (componentType.modifiers === ModifierFlags.None) {
    componentType.onRemove(entity, componentType);
    removeFromStore(world, componentType.store, entity.eid);
  }
  return entity as Omit<E, PropName>;
}

export function hasComponent<E extends IEntityBase>(
  componentType: IAnyComponentType,
  entity: E,
  world = defaultWorld,
): boolean {
  return (
    _hasComponent(world, componentType.store, entity.eid) ||
    componentType.modifiers != ModifierFlags.None
  );
}

export function hasAllComponents<E extends IEntityBase>(
  componentTypes: ReadonlyArray<IAnyComponentType>,
  entity: E,
  world = defaultWorld,
): boolean {
  for (const componentType of componentTypes) {
    if (!hasComponent(componentType, entity, world)) {
      return false;
    }
  }
  return true;
}
