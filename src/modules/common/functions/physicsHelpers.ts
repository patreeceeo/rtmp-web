import { LevelState } from "../state/LevelState.ts";
import { PlayerProxy } from "../state/Player.ts";
import { SimulateOptions } from "./physics.ts";

const reOptions = new SimulateOptions();

export function getPhysicsOptions(player: PlayerProxy, target = reOptions) {
  target.worldDimensions = LevelState.dimensions;
  target.maxVelocity = player.maxVelocity;
  target.friction = player.friction;
  target.hitBox.x = player.width << 8;
  target.hitBox.y = player.height << 8;
  return target;
}
