import { LevelState } from "../state/LevelState.ts";
import { Player } from "../state/Player.ts";
import { SimulateOptions } from "./physics.ts";

const reOptions = new SimulateOptions();

export function getPhysicsOptions(player: Player, target = reOptions) {
  target.worldDimensions = LevelState.dimensions;
  target.maxVelocity = player.maxVelocity;
  target.friction = player.friction;
  target.hitBox = player.hitBox;
  return target;
}
