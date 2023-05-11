import { PlayerState, PoseType } from "../state/Player.ts";
import { ISystemExecutionContext, SystemLoader } from "./mod.ts";
import {
  simulatePositionWithVelocity,
  simulateVelocityWithAcceleration,
} from "../../../modules/common/functions/physics.ts";
import { getPhysicsOptions } from "../functions/physicsHelpers.ts";

export const PhysicsSystem: SystemLoader<
  ISystemExecutionContext,
  [{ fixedDeltaTime: number }]
> = ({ fixedDeltaTime }) => {
  function exec() {
    for (const player of PlayerState.getPlayers()) {
      const options = getPhysicsOptions(player);
      player.pose = player.acceleration.x == 0
        ? player.pose
        : player.acceleration.x > 0
        ? PoseType.facingRight
        : PoseType.facingLeft;
      simulateVelocityWithAcceleration(
        player.velocity,
        player.acceleration,
        fixedDeltaTime,
        options,
      );
      simulatePositionWithVelocity(
        player.position,
        player.velocity,
        fixedDeltaTime,
        options,
      );
    }
  }
  return { exec };
};
