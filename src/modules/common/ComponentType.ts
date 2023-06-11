import * as ECS from "bitecs";
import { defaultWorld, EntityId, IEntityMinimal } from "./state/mod.ts";
import { ECSInstance, Vec2LargeType } from "./Vec2.ts";

// Idea: component types as entities to allow for recursive composition

type ITagSchema = Record<string | number | symbol, never>;

type ValueForSchema<S extends ECS.ISchema> = S extends ITagSchema ? boolean
  : {
    [K in keyof S]: S[K] extends "eid" ? EntityId : number;
  };

type WithProperty<T, P extends string, V> =
  & T
  & {
    [K in P]: V;
  };

interface IComponentType<
  S extends ECS.ISchema,
> {
  readonly schema: S;
  readonly store: ECS.ComponentType<S>;
  readonly propName: string;
  getValue(
    world: ECS.IWorld,
    store: ECS.ComponentType<S>,
    eid: EntityId,
  ): ValueForSchema<S>;
  onAdd(target: IEntityMinimal, componentType: this): void;
  onRemove(target: IEntityMinimal, componentType: this): void;
}

interface IComponentConfigBase<
  S extends ECS.ISchema,
> {
  propName: string;
  onAdd?: (target: IEntityMinimal, type: IComponentType<S>) => void;
  onRemove?: (target: IEntityMinimal, type: IComponentType<S>) => void;
}

type ITagConfig = IComponentConfigBase<ITagSchema>;

function defineTag(config: ITagConfig): IComponentType<ITagSchema> {
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
  }) as IComponentType<ITagSchema>;
  return result;
}

interface IComponentConfig<
  S extends ECS.ISchema = ITagSchema,
  Klass extends ValueForSchema<S> = ValueForSchema<S>,
> extends IComponentConfigBase<S> {
  schema: S;
  getValue(
    world: ECS.IWorld,
    store: ECS.ComponentType<S>,
    eid: EntityId,
  ): Klass;
}

function defineComponent<
  S extends ECS.ISchema = ITagSchema,
  Klass extends ValueForSchema<S> = ValueForSchema<S>,
>(config: IComponentConfig<S, Klass>): IComponentType<S> {
  return Object.freeze({
    propName: config.propName,
    schema: config.schema,
    getValue: config.getValue,
    store: ECS.defineComponent(config.schema),
    onAdd(target: IEntityMinimal, componentType: IComponentType<S>) {
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
  C extends IComponentType<S>,
>(
  world: ECS.IWorld,
  componentType: C,
  entity: E,
): WithProperty<E, C["propName"], ValueForSchema<S>> {
  ECS.addComponent(world, componentType, entity.eid);
  componentType.onAdd(entity, componentType);
  return entity as WithProperty<E, C["propName"], ValueForSchema<S>>;
}

export function removeComponent<
  E extends IEntityMinimal,
  S extends ECS.ISchema,
  C extends IComponentType<S>,
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
  ECSInstance<typeof Vec2LargeType>
>({
  schema: Vec2LargeType,
  propName: "position",
  getValue(
    _world: ECS.IWorld,
    store: ECS.ComponentType<typeof Vec2LargeType>,
    eid: EntityId,
  ) {
    return new ECSInstance(store, eid);
  },
});

const e: IEntityMinimal = {
  eid: 0 as EntityId,
  isDeleted: false,
};

const e2 = addComponent(defaultWorld, PositionComponent, e);
