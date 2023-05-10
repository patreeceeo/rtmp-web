import { PlayerState } from "../state/Player.ts";
import { ISystemExecutionContext, SystemLoader } from "./mod.ts";
import {
  simulatePositionWithVelocity,
  simulateVelocityWithAcceleration,
} from "../../../modules/common/functions/physics.ts";
import { getPhysicsOptions } from "../functions/physicsHelpers.ts";

function exec({ deltaTime }: ISystemExecutionContext) {
  for (const player of PlayerState.getPlayers()) {
    const options = getPhysicsOptions(player);
    simulateVelocityWithAcceleration(
      player.velocity,
      player.acceleration,
      deltaTime,
      options,
    );
    simulatePositionWithVelocity(
      player.position,
      player.velocity,
      deltaTime + player.timeWarp,
      options,
    );
    player.timeWarp = 0;
  }
}
export const PhysicsSystem: SystemLoader = () => {
  return { exec };
};
