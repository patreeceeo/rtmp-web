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
import { ImageCollectionEnum, PoseType } from "../client/state/Sprite.ts";
import { EntityId, IEntityMinimal } from "./Entity.ts";
import { invariant } from "./Error.ts";
import { ModifierFlags } from "./Query.ts";
import { ECSInstance, Vec2LargeSchema, Vec2SmallSchema } from "./Vec2.ts";
import { defaultWorld } from "./World.ts";

export type ISchema = _ISchema;
export type StoreType<T extends ISchema> = _StoreType<T>;
export type PrimativeType = _Type;
export type TypedArray = _TypedArray;

export const PrimativeTypes = _Types;

// TODO split this into multiple files?
// Idea: component types as entities to allow for recursive composition

type ITagSchema = Record<string | number | symbol, never>;

export type WithPropertyForComponent<T, P extends keyof IEntityMaximal> =
  & T
  & {
    [K in P]: IEntityMaximal[K];
  };

// where does this belong??
export type EntityWithComponents<
  ComponentTypes extends ReadonlyArray<IAnyComponentType>,
> = WithPropertyForComponent<
  IEntityMinimal,
  ComponentTypes[number]["propName"]
>;

export interface IEntityMaximal extends IEntityMinimal {
  isPlayer: boolean;
  isTile: boolean;
  isGrounded: boolean;
  bodyIsStatic: boolean;
  bodyDimensions: ECSInstance<typeof Vec2SmallSchema>;
  position: ECSInstance<typeof Vec2LargeSchema>;
  targetPosition: ECSInstance<typeof Vec2LargeSchema>;
  previousPosition: ECSInstance<typeof Vec2LargeSchema>;
  previousTargetPosition_output: ECSInstance<typeof Vec2LargeSchema>;
  previousTargetPosition_network: ECSInstance<typeof Vec2LargeSchema>;
  velocity: ECSInstance<typeof Vec2LargeSchema>;
  maxSpeed: number;
  friction: number;
  acceleration: ECSInstance<typeof Vec2SmallSchema>;
  imageId: number;
  imageCollection: ImageCollectionEnum;
  pose: PoseType;
  lastActiveTime: number;
}

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
  onAdd(target: IEntityMinimal, componentType: this): void;
  onRemove(target: IEntityMinimal, componentType: this): void;
}

export type IAnyComponentType = IComponentType<ISchema, keyof IEntityMaximal>;

interface IComponentConfigBase<
  S extends ISchema,
  PropName extends string = string,
> {
  propName: PropName;
  onAdd?: (
    target: IEntityMinimal,
    type: IComponentType<S, keyof IEntityMaximal>,
  ) => void;
  onRemove?: (
    target: IEntityMinimal,
    type: IComponentType<S, keyof IEntityMaximal>,
  ) => void;
}

type ITagConfig<PropName extends string> = IComponentConfigBase<
  ITagSchema,
  PropName
>;

export function defineTag<PropName extends keyof IEntityMaximal>(
  config: ITagConfig<PropName>,
): IComponentType<ITagSchema, PropName> {
  const store = createStore<ITagSchema>();
  const result = Object.freeze({
    propName: config.propName,
    schema: {},
    store,
    queryable: store,
    modifiers: ModifierFlags.None,
    getValue(world: IWorld, store: StoreType<ITagSchema>, eid: EntityId) {
      return _hasComponent(world, store, eid);
    },
    onAdd(target: IEntityMinimal) {
      Object.defineProperty(target, this.propName, {
        value: true,
        configurable: true,
        writable: false,
        enumerable: true,
      });
      config.onAdd?.(target, result);
    },
    onRemove(target: IEntityMinimal) {
      Object.defineProperty(target, this.propName, {
        value: false,
        configurable: true,
        writable: false,
        enumerable: false,
      });
      config.onRemove?.(target, result);
    },
  });
  return result as unknown as IComponentType<ITagSchema, PropName>;
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

export function defineComponent<
  S extends ISchema = ITagSchema,
  PropName extends keyof IEntityMaximal = keyof IEntityMaximal,
>(config: IComponentConfig<S, PropName>): IComponentType<S, PropName> {
  const store = createStore(config.schema);
  return Object.freeze({
    propName: config.propName,
    schema: config.schema,
    getValue: config.getValue,
    store,
    queryable: store,
    modifiers: ModifierFlags.None,
    onAdd(target: IEntityMinimal, componentType: IComponentType<S, PropName>) {
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
    },
    onRemove(target: IEntityMinimal) {
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
  });
}

export function addComponent<
  PropName extends keyof IEntityMaximal,
  E extends IEntityMinimal,
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
    componentType.onAdd(entity, componentType);
  }
  return entity as WithPropertyForComponent<E, PropName>;
}

export function addComponents<
  PropNames extends keyof IEntityMaximal,
  E extends IEntityMinimal,
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
  E extends IEntityMinimal,
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
    removeFromStore(world, componentType.store, entity.eid);
    componentType.onRemove(entity, componentType);
  }
  return entity as Omit<E, PropName>;
}

export function hasComponent<E extends IEntityMinimal>(
  componentType: IAnyComponentType,
  entity: E,
  world = defaultWorld,
): boolean {
  return _hasComponent(world, componentType.store, entity.eid) ||
    componentType.modifiers != ModifierFlags.None;
}
