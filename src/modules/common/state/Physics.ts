import {
  EntityId,
  EntityPrefabCollection,
  UNDEFINED_ENTITY,
} from "../Entity.ts";
import {
  AccelerationComponent,
  BodyDimensions,
  EditorDraggingTag,
  FrictionComponent,
  MaxSpeedComponent,
  PoseComponent,
  PositionComponent,
  ShoulderCount,
  SoftDeletedTag,
  TargetPositionComponent,
  TileTag,
  VelocityComponent,
} from "../components.ts";
import { Not } from "../Query.ts";
import { Matrix2 } from "../math.ts";

export type IPhysicsEntity = ReturnType<
  typeof PhysicsState.dynamicEntities.add
>;

class PhysicsStateApi {
  readonly dynamicEntityComponents = [
    Not(SoftDeletedTag),
    Not(EditorDraggingTag),
    PositionComponent,
    ShoulderCount,
    TargetPositionComponent,
    BodyDimensions,
    VelocityComponent,
    MaxSpeedComponent,
    FrictionComponent,
    AccelerationComponent,
    PoseComponent,
  ] as const;
  readonly tileComponents = [
    Not(SoftDeletedTag),
    PositionComponent,
    BodyDimensions,
    TileTag,
  ] as const;
  readonly dynamicEntities = new EntityPrefabCollection(
    this.dynamicEntityComponents,
  );
  readonly tileEntities = new EntityPrefabCollection(this.tileComponents);
  readonly tileMatrix = new Matrix2<EntityId>(32, 32, UNDEFINED_ENTITY);
}

export const PhysicsState = new PhysicsStateApi();
