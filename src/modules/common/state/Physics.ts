import { EntityPrefabCollection } from "../Entity.ts";
import {
  AccelerationComponent,
  BodyDimensions,
  FrictionComponent,
  MaxSpeedComponent,
  PoseComponent,
  PositionComponent,
  SoftDeletedTag,
  TargetPositionComponent,
  VelocityComponent,
} from "../components.ts";
import { Not } from "../Query.ts";

export type IPhysicsEntity = ReturnType<typeof PhysicsState.entities.add>;

class PhysicsStateApi {
  readonly components = [
    Not(SoftDeletedTag),
    PositionComponent,
    TargetPositionComponent,
    BodyDimensions,
    VelocityComponent,
    MaxSpeedComponent,
    FrictionComponent,
    AccelerationComponent,
    PoseComponent,
  ] as const;
  readonly entities = new EntityPrefabCollection(this.components);
}

export const PhysicsState = new PhysicsStateApi();
