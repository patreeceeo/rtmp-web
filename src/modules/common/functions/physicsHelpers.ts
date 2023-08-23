import { LevelState } from "../state/LevelState.ts";
import { IPhysicsEntity } from "../state/Physics.ts";
import { SimulateOptions } from "./physics.ts";
import { FrictionComponent, MaxSpeedComponent } from "~/common/components.ts";
import { hasComponent } from "~/common/Component.ts";
import { castEntity } from "~/common/Entity.ts";

const reOptions = new SimulateOptions();

export function getPhysicsOptions(entity: IPhysicsEntity, target = reOptions) {
  const size = entity.bodyDimensions;
  target.worldDimensions = LevelState.dimensions;
  target.maxSpeed = hasComponent(MaxSpeedComponent, entity)
    ? castEntity(entity, [MaxSpeedComponent]).maxSpeed
    : Infinity;
  target.friction = hasComponent(FrictionComponent, entity)
    ? castEntity(entity, [FrictionComponent]).friction
    : 0;
  target.hitBox.x = size.x << 8;
  target.hitBox.y = size.y << 8;
  return target;
}
