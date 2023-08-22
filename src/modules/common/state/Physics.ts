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
  PlayerTag,
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
  readonly playerComponents = [
    Not(SoftDeletedTag),
    Not(EditorDraggingTag),
    PlayerTag,
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
  readonly playerEntities = new EntityPrefabCollection(
    this.playerComponents,
  );
  readonly keneticEntities = new EntityPrefabCollection([
    Not(SoftDeletedTag),
    Not(PlayerTag),
    PositionComponent,
    VelocityComponent,
    BodyDimensions,
    PhysRestitutionComponent,
  ])

  readonly tileEntities = new EntityPrefabCollection(this.tileComponents);
  readonly tileMatrix = new Matrix2<EntityId>(32, 32, UNDEFINED_ENTITY);
}

export const PhysicsState = new PhysicsStateApi();
