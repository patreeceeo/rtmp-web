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
const tempVelocityDelta = new Vec2();

export const PhysicsSystem: SystemLoader<
  ISystemExecutionContext,
  [{ fixedDeltaTime: number }]
> = ({ fixedDeltaTime }) => {
  function exec() {
    for (const player of PlayerState.getPlayers()) {
      const options = getPhysicsOptions(player);
      if (!isClient) {
        player.targetPosition.copy(player.position);
      }
      tempPositionDelta.copy(player.targetPosition).sub(player.position);
      if (
        player.velocity.lengthSquared < 0.02 &&
        tempPositionDelta.lengthSquared > 0.1
      ) {
        tempPositionDelta.clamp(
          Math.max(0.1, Math.sqrt(player.velocity.lengthSquared)),
        );
        player.position.add(tempPositionDelta);
      }
      tempVelocityDelta.copy(player.targetVelocity).sub(player.velocity);
      if (tempVelocityDelta.lengthSquared > 0.01) {
        tempVelocityDelta.copy(player.targetVelocity).sub(player.velocity);
        player.velocity.add(tempVelocityDelta, 0.5);
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
