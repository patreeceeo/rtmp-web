import { LevelState } from "../state/LevelState.ts";
import { IPhysicsEntity } from "../state/Physics.ts";
import { SimulateOptions } from "./physics.ts";

const reOptions = new SimulateOptions();

export function getPhysicsOptions(entity: IPhysicsEntity, target = reOptions) {
  const size = entity.physicalSize;
  target.worldDimensions = LevelState.dimensions;
  target.maxSpeed = entity.maxSpeed;
  target.friction = entity.friction;
  target.hitBox.x = size.x << 8;
  target.hitBox.y = size.y << 8;
  return target;
}
