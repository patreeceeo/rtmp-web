import {
  defineComponent,
  defineTag,
  PrimativeTypes,
  StoreType,
} from "./Component.ts";
import { EntityId } from "./Entity.ts";
import { Uuid } from "~/common/NetworkApi.ts";
import { ECSInstance, Vec2LargeSchema, Vec2SmallSchema } from "./Vec2.ts";
import { IWorld } from "./World.ts";
import { ImageCollectionEnum, PoseType } from "~/client/functions/sprite.ts";

export const SoftDeletedTag = defineTag({
  propName: "isSoftDeleted",
});

const UuidSchema = { value: PrimativeTypes.ui32 };
export const UuidComponent = defineComponent({
  schema: UuidSchema,
  propName: "uuid",
  getValue(
    _world: IWorld,
    store: StoreType<typeof UuidSchema>,
    eid: EntityId,
  ): Uuid {
    return store.value[eid] as Uuid;
  },

  setValue(
    _world: IWorld,
    store: StoreType<typeof UuidSchema>,
    eid: EntityId,
    value: Uuid,
  ) {
    store.value[eid] = value;
  },
});

export const PlayerTag = defineTag({
  propName: "isPlayer",
});

export const ClientTag = defineTag({
  propName: "isClient",
});

export const TileTag = defineTag({
  propName: "isTile",
});

export const GroundedTag = defineTag({
  propName: "isGrounded",
});

export const EditorDraggingTag = defineTag({
  propName: "isEditorDragging",
});

const ShoulderCountSchema = { value: PrimativeTypes.ui8 };
const MAX_SHOULDER_COUNT = 2;
export const ShoulderCount = defineComponent({
  schema: ShoulderCountSchema,
  propName: "shoulderCount",
  getValue(
    _world: IWorld,
    store: StoreType<typeof ShoulderCountSchema>,
    eid: EntityId,
  ) {
    return store.value[eid];
  },

  setValue(
    _world: IWorld,
    store: StoreType<typeof ShoulderCountSchema>,
    eid: EntityId,
    value: number,
  ) {
    store.value[eid] = Math.min(value, MAX_SHOULDER_COUNT);
  },
});

export const BodyStaticTag = defineTag({
  propName: "bodyIsStatic",
});

export const BodyDimensions = defineComponent({
  schema: Vec2SmallSchema,
  propName: "bodyDimensions",
  getValue(
    _world: IWorld,
    store: StoreType<typeof Vec2SmallSchema>,
    eid: EntityId,
  ) {
    return new ECSInstance(store, eid);
  },
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

export const PreviousTargetPositionComponent_Output = defineComponent({
  schema: Vec2LargeSchema,
  propName: "previousTargetPosition_output",
  getValue(
    _world: IWorld,
    store: StoreType<typeof Vec2LargeSchema>,
    eid: EntityId,
  ) {
    return new ECSInstance(store, eid);
  },
});

export const PreviousTargetPositionComponent_Network = defineComponent({
  schema: Vec2LargeSchema,
  propName: "previousTargetPosition_network",
  getValue(
    _world: IWorld,
    store: StoreType<typeof Vec2LargeSchema>,
    eid: EntityId,
  ) {
    return new ECSInstance(store, eid);
  },
});

export const VelocityComponent = defineComponent({
  schema: Vec2LargeSchema,
  propName: "velocity",
  getValue(
    _world: IWorld,
    store: StoreType<typeof Vec2LargeSchema>,
    eid: EntityId,
  ) {
    return new ECSInstance(store, eid);
  },
});

const MaxSpeedSchema = { value: PrimativeTypes.ui16 };
const MAX_MAX_SPEED = 2 ** 16 - 1;
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
    store.value[eid] = Math.min(value, MAX_MAX_SPEED);
  },
});

const FrictionSchema = { value: PrimativeTypes.ui8 };
export const FrictionComponent = defineComponent({
  schema: FrictionSchema,
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

const ImageCollectionSchema = {
  value: PrimativeTypes.ui8,
};

export const ImageCollectionComponent = defineComponent({
  schema: ImageCollectionSchema,
  propName: "imageCollection",
  getValue(
    _world: IWorld,
    store: StoreType<typeof ImageCollectionSchema>,
    eid: EntityId,
  ) {
    return store.value[eid];
  },
  setValue(
    _world: IWorld,
    store: StoreType<typeof ImageCollectionSchema>,
    eid: EntityId,
    value: ImageCollectionEnum,
  ) {
    store.value[eid] = value;
  },
});

const PoseSchema = {
  value: PrimativeTypes.ui8,
};

export const PoseComponent = defineComponent({
  schema: PoseSchema,
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

const ImageIdSchema = {
  value: PrimativeTypes.ui16,
};

export const ImageIdComponent = defineComponent({
  schema: ImageIdSchema,
  propName: "imageId",
  getValue(
    _world: IWorld,
    store: StoreType<typeof ImageIdSchema>,
    eid: EntityId,
  ) {
    return store.value[eid];
  },
  setValue(
    _world: IWorld,
    store: StoreType<typeof ImageIdSchema>,
    eid: EntityId,
    value: number,
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
