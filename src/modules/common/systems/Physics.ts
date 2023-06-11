import { add, clamp, copy, getLengthSquared, sub } from "~/common/Vec2.ts";
import { PlayerState, PoseType } from "../state/Player.ts";
import { ISystemExecutionContext, SystemLoader } from "./mod.ts";
import {
  simulatePositionWithVelocity,
  simulateVelocityWithAcceleration,
} from "../../../modules/common/functions/physics.ts";
import { getPhysicsOptions } from "../functions/physicsHelpers.ts";
import { isClient } from "../env.ts";
import { Instance } from "../Vec2.ts";
import { IEntityMinimal } from "../state/mod.ts";

export interface IPhysicsEntity extends IEntityMinimal {
  position: Instance;
  targetPosition: Instance;
  velocity: Instance;
  acceleration: Instance;
  maxVelocity: number;
  pose: PoseType;
}

const tempPositionDelta = new Instance();

export const PhysicsSystem: SystemLoader<
  ISystemExecutionContext,
  [{ fixedDeltaTime: number }]
> = ({ fixedDeltaTime }) => {
  function exec() {
    for (const eid of PlayerState.query()) {
      const player = PlayerState.acquireProxy(eid);
      const options = getPhysicsOptions(player);
      if (!isClient) {
        copy(player.targetPosition, player.position);
      } else {
        add(player.targetPosition, player.velocity, fixedDeltaTime);
        copy(tempPositionDelta, player.targetPosition);
        sub(tempPositionDelta, player.position);
        if (
          getLengthSquared(tempPositionDelta) > 1
        ) {
          clamp(tempPositionDelta, player.maxVelocity * fixedDeltaTime);
          add(player.position, tempPositionDelta);
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
