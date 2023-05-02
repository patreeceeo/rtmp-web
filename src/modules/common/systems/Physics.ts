import { PlayerState } from "../state/Player.ts";
import { ISystemExecutionContext, SystemLoader } from "./mod.ts";
import {
  ISimulateOptions,
  simulateAcceleration,
  simulateVelocity,
} from "../../../modules/common/functions/physics.ts";
import { LevelState } from "../state/LevelState.ts";

const reOptions: ISimulateOptions = {};

function exec({ deltaTime }: ISystemExecutionContext) {
  for (const player of PlayerState.getPlayers()) {
    reOptions.worldDimensions = LevelState.dimensions;
    reOptions.maxVelocity = player.maxVelocity;
    reOptions.friction = player.friction;
    reOptions.hitBox = player.hitBox;
    simulateAcceleration(
      player.velocity,
      player.acceleration,
      deltaTime,
      reOptions,
    );
    simulateVelocity(player.position, player.velocity, deltaTime, reOptions);
  }
}
export const PhysicsSystem: SystemLoader = () => {
  return { exec };
};
