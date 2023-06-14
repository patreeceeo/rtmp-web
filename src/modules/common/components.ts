import { SpriteSheetEnum } from "../client/state/Sprite.ts";
import {
  defineComponent,
  defineTag,
  EntityWithComponents,
  PrimativeTypes,
  StoreType,
} from "./Component.ts";
import { EntityId } from "./Entity.ts";
import { PoseType } from "./state/Player.ts";
import { ECSInstance, Vec2LargeSchema, Vec2SmallSchema } from "./Vec2.ts";
import { IWorld } from "./World.ts";

export const SoftDeletedTag = defineTag({
  propName: "isSoftDeleted",
});

export const PlayerTag = defineTag({
  propName: "isPlayer",
});

export const PositionComponent = defineComponent({
  schema: Vec2LargeSchema,
  propName: "position",
  getValue(
    _world: IWorld,
    store: StoreType<typeof Vec2LargeSchema>,
    eid: EntityId,
  ) {
    return new ECSInstance(store, eid);
  },
});

export const TargetPositionComponent = defineComponent({
  schema: Vec2LargeSchema,
  propName: "targetPosition",
  getValue(
    _world: IWorld,
    store: StoreType<typeof Vec2LargeSchema>,
    eid: EntityId,
  ) {
    return new ECSInstance(store, eid);
  },
});

export const PreviousPositionComponent = defineComponent({
  schema: Vec2LargeSchema,
  propName: "previousPosition",
  getValue(
    _world: IWorld,
    store: StoreType<typeof Vec2LargeSchema>,
    eid: EntityId,
  ) {
    return new ECSInstance(store, eid);
  },
});

export const PhysicalSizeComponent = defineComponent({
  schema: Vec2SmallSchema,
  propName: "physicalSize",
  getValue(
    _world: IWorld,
    store: StoreType<typeof Vec2SmallSchema>,
    eid: EntityId,
  ) {
    return new ECSInstance(store, eid);
  },
});

export const VelocityComponent = defineComponent({
  schema: Vec2SmallSchema,
  propName: "velocity",
  getValue(
    _world: IWorld,
    store: StoreType<typeof Vec2SmallSchema>,
    eid: EntityId,
  ) {
    return new ECSInstance(store, eid);
  },
});

const MaxSpeedSchema = { value: PrimativeTypes.ui8 };
export const MaxSpeedComponent = defineComponent({
  schema: MaxSpeedSchema,
  propName: "maxSpeed",
  getValue(
    _world: IWorld,
    store: StoreType<typeof MaxSpeedSchema>,
    eid: EntityId,
  ) {
    return store.value[eid];
  },

  setValue(
    _world: IWorld,
    store: StoreType<typeof MaxSpeedSchema>,
    eid: EntityId,
    value: number,
  ) {
    store.value[eid] = value;
  },
});

const FrictionSchema = { value: PrimativeTypes.ui8 };
export const FrictionComponent = defineComponent({
  schema: MaxSpeedSchema,
  propName: "friction",
  getValue(
    _world: IWorld,
    store: StoreType<typeof FrictionSchema>,
    eid: EntityId,
  ) {
    return store.value[eid];
  },
  setValue(
    _world: IWorld,
    store: StoreType<typeof FrictionSchema>,
    eid: EntityId,
    value: number,
  ) {
    store.value[eid] = value;
  },
});

export const AccelerationComponent = defineComponent({
  schema: Vec2SmallSchema,
  propName: "acceleration",
  getValue(
    _world: IWorld,
    store: StoreType<typeof Vec2SmallSchema>,
    eid: EntityId,
  ) {
    return new ECSInstance(store, eid);
  },
});

const SpriteSheetSchema = {
  value: PrimativeTypes.ui8,
};

export const SpriteSheetComponent = defineComponent({
  schema: SpriteSheetSchema,
  propName: "spriteSheet",
  getValue(
    _world: IWorld,
    store: StoreType<typeof SpriteSheetSchema>,
    eid: EntityId,
  ) {
    return store.value[eid];
  },
  setValue(
    _world: IWorld,
    store: StoreType<typeof SpriteSheetSchema>,
    eid: EntityId,
    value: SpriteSheetEnum,
  ) {
    store.value[eid] = value;
  },
});

const PoseSchema = {
  value: PrimativeTypes.ui8,
};

export const PoseComponent = defineComponent({
  schema: SpriteSheetSchema,
  propName: "pose",
  getValue(_world: IWorld, store: StoreType<typeof PoseSchema>, eid: EntityId) {
    return store.value[eid];
  },
  setValue(
    _world: IWorld,
    store: StoreType<typeof PoseSchema>,
    eid: EntityId,
    value: PoseType,
  ) {
    store.value[eid] = value;
  },
});

const LastActiveTimeSchema = {
  value: PrimativeTypes.ui8,
};
export const LastActiveTimeComponent = defineComponent({
  schema: LastActiveTimeSchema,
  propName: "lastActiveTime",
  getValue(
    _world: IWorld,
    store: StoreType<typeof LastActiveTimeSchema>,
    eid: EntityId,
  ) {
    return store.value[eid];
  },
  setValue(
    _world: IWorld,
    store: StoreType<typeof PoseSchema>,
    eid: EntityId,
    value: PoseType,
  ) {
    store.value[eid] = value;
  },
});
