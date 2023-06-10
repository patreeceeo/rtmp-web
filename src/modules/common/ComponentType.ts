import * as ECS from "bitecs";
import { defaultWorld, EntityId, IEntityMinimal } from "./state/mod.ts";
import { Vec2FromStore, Vec2LargeType } from "./Vec2.ts";

// Idea: component types as entities to allow for recursive composition

type ITagSchema = Record<string | number | symbol, never>;

type ObjectForSchema<S extends ECS.ISchema> = S extends ITagSchema ? boolean
  : {
    [K in keyof S]: S[K] extends "eid" ? EntityId : number;
  };

type ComponentInstance<
  S extends ECS.ISchema,
  K extends ObjectForSchema<S>,
> = K extends never ? ObjectForSchema<S>
  : K;

type WithProperty<T, P extends string, V> =
  & T
  & {
    [K in P]: V;
  };

interface IComponentType<
  S extends ECS.ISchema,
  Klass extends ObjectForSchema<S>,
> {
  readonly schema: S;
  readonly store: ECS.ComponentType<S>;
  readonly propName: string;
  getValue(
    world: ECS.IWorld,
    store: ECS.ComponentType<S>,
    eid: EntityId,
  ): Klass;
  onAdd(target: IEntityMinimal, componentType: this): void;
  onRemove(target: IEntityMinimal, componentType: this): void;
}

interface IComponentConfigBase<
  S extends ECS.ISchema,
  Klass extends ObjectForSchema<S> = ObjectForSchema<S>,
> {
  propName: string;
  onAdd?: (target: IEntityMinimal, type: IComponentType<S, Klass>) => void;
  onRemove?: (target: IEntityMinimal, type: IComponentType<S, Klass>) => void;
}

type ITagConfig = IComponentConfigBase<ITagSchema>;

function defineTag(config: ITagConfig): IComponentType<ITagSchema, boolean> {
  const store = ECS.defineComponent<ITagSchema>();
  const result = Object.freeze({
    propName: config.propName,
    schema: {},
    store,
    getValue(
      world: ECS.IWorld,
      store: ECS.ComponentType<ITagSchema>,
      eid: EntityId,
    ) {
      return ECS.hasComponent(world, store, eid);
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
  }) as IComponentType<ITagSchema, boolean>;
  return result;
}

interface IComponentConfig<
  S extends ECS.ISchema = ITagSchema,
  Klass extends ObjectForSchema<S> = ObjectForSchema<S>,
> extends IComponentConfigBase<S, Klass> {
  schema: S;
  getValue(
    world: ECS.IWorld,
    store: ECS.ComponentType<S>,
    eid: EntityId,
  ): Klass;
}

function defineComponent<
  S extends ECS.ISchema = ITagSchema,
  Klass extends ObjectForSchema<S> = ObjectForSchema<S>,
>(config: IComponentConfig<S, Klass>): IComponentType<S, Klass> {
  return Object.freeze({
    propName: config.propName,
    schema: config.schema,
    getValue: config.getValue,
    store: ECS.defineComponent(config.schema),
    onAdd(target: IEntityMinimal, componentType: IComponentType<S, Klass>) {
      Object.defineProperty(target, this.propName, {
        value: this.getValue(defaultWorld, componentType.store, target.eid),
        writable: false,
        configurable: true,
        enumerable: true,
      });
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
  E extends IEntityMinimal,
  S extends ECS.ISchema,
  K extends ObjectForSchema<S>,
  C extends IComponentType<S, K>,
>(
  world: ECS.IWorld,
  componentType: C,
  entity: E,
): WithProperty<E, C["propName"], ComponentInstance<S, K>> {
  ECS.addComponent(world, componentType, entity.eid);
  componentType.onAdd(entity, componentType);
  return entity as WithProperty<E, C["propName"], ComponentInstance<S, K>>;
}

export function removeComponent<
  E extends IEntityMinimal,
  S extends ECS.ISchema,
  K extends ObjectForSchema<S>,
  C extends IComponentType<S, K>,
>(
  world: ECS.IWorld,
  componentType: C,
  entity: E,
) {
  ECS.removeComponent(world, componentType, entity.eid);
  componentType.onRemove(entity, componentType);
}

export const DeletedTag = defineTag({
  propName: "isDeleted",
});

export const PlayerTag = defineTag({
  propName: "isPlayer",
});

export const PositionComponent = defineComponent<
  typeof Vec2LargeType,
  Vec2FromStore<typeof Vec2LargeType>
>({
  schema: Vec2LargeType,
  propName: "position",
  getValue(
    _world: ECS.IWorld,
    store: ECS.ComponentType<typeof Vec2LargeType>,
    eid: EntityId,
  ) {
    return new Vec2FromStore(store, eid);
  },
});

const e: IEntityMinimal = {
  eid: 0 as EntityId,
  isDeleted: false,
};

// Why do I have to specify the type parameters here?
const e2 = addComponent<
  IEntityMinimal,
  typeof Vec2LargeType,
  Vec2FromStore<typeof Vec2LargeType>,
  typeof PositionComponent
>(defaultWorld, PositionComponent, e);
