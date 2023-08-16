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
  PhysRestitutionComponent,
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
  typeof PhysicsState.keneticEntities.add
>;

class PhysicsStateApi {
  readonly keneticComponents = [
    Not(SoftDeletedTag),
    Not(EditorDraggingTag),
    PositionComponent,
    ShoulderCount,
    TargetPositionComponent,
    VelocityComponent,
    MaxSpeedComponent,
    FrictionComponent,
    AccelerationComponent,
    PoseComponent,
    BodyDimensions,
    PhysRestitutionComponent,
  ] as const;
  readonly tileComponents = [
    Not(SoftDeletedTag),
    PositionComponent,
    BodyDimensions,
    TileTag,
  ] as const;
  readonly keneticEntities = new EntityPrefabCollection(
    this.keneticComponents,
  );
  readonly tileEntities = new EntityPrefabCollection(this.tileComponents);
  readonly tileMatrix = new Matrix2<EntityId>(32, 32, UNDEFINED_ENTITY);
}

export const PhysicsState = new PhysicsStateApi();
