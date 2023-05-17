import { PlayerState, PoseType } from "../state/Player.ts";
import { ISystemExecutionContext, SystemLoader } from "./mod.ts";
import {
  simulatePositionWithVelocity,
  simulateVelocityWithAcceleration,
} from "../../../modules/common/functions/physics.ts";
import { getPhysicsOptions } from "../functions/physicsHelpers.ts";
import { isClient } from "../env.ts";
import { Vec2 } from "../Vec2.ts";

const tempPositionDelta = new Vec2();

export const PhysicsSystem: SystemLoader<
  ISystemExecutionContext,
  [{ fixedDeltaTime: number }]
> = ({ fixedDeltaTime }) => {
  function exec() {
    for (const player of PlayerState.getPlayers()) {
      const options = getPhysicsOptions(player);
      if (!isClient) {
        player.targetPosition.copy(player.position);
      } else {
        player.targetPosition.add(player.velocity, fixedDeltaTime);
        tempPositionDelta.copy(player.targetPosition).sub(player.position);
        if (
          tempPositionDelta.lengthSquared > 1
        ) {
          if (
            tempPositionDelta.lengthSquared <
              (player.velocity.lengthSquared * fixedDeltaTime ** 2)
          ) {
            tempPositionDelta.scale(0.8);
          } else {
            tempPositionDelta.clamp(8 * fixedDeltaTime);
          }
          player.position.add(tempPositionDelta);
        }
      }
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
