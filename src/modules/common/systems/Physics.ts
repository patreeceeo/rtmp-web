import { add, clamp, copy, getLengthSquared, sub } from "~/common/Vec2.ts";
import { PoseType } from "../state/Player.ts";
import { ISystemExecutionContext, SystemLoader } from "./mod.ts";
import {
  simulatePositionWithVelocity,
  simulateVelocityWithAcceleration,
} from "../../../modules/common/functions/physics.ts";
import { getPhysicsOptions } from "../functions/physicsHelpers.ts";
import { isClient } from "../env.ts";
import { Instance } from "../Vec2.ts";
import { PhysicsState } from "../state/Physics.ts";

const tempPositionDelta = new Instance();

export const PhysicsSystem: SystemLoader<
  ISystemExecutionContext,
  [{ fixedDeltaTime: number }]
> = ({ fixedDeltaTime }) => {
  function exec() {
    for (const entity of PhysicsState.entities.query()) {
      const options = getPhysicsOptions(entity);
      if (!isClient) {
        copy(entity.targetPosition, entity.position);
      } else {
        add(entity.targetPosition, entity.velocity, fixedDeltaTime);

        // Calculate how far we are from where we should be
        copy(tempPositionDelta, entity.targetPosition);
        sub(tempPositionDelta, entity.position);
        if (
          getLengthSquared(tempPositionDelta) > 1
        ) {
          clamp(tempPositionDelta, entity.maxSpeed * fixedDeltaTime);
          add(entity.position, tempPositionDelta);
        }
      }
      entity.pose = entity.acceleration.x == 0
        ? entity.pose
        : entity.acceleration.x > 0
        ? PoseType.facingRight
        : PoseType.facingLeft;
      simulateVelocityWithAcceleration(
        entity.velocity,
        entity.acceleration,
        fixedDeltaTime,
        options,
      );
      simulatePositionWithVelocity(
        entity.position,
        entity.velocity,
        fixedDeltaTime,
        options,
      );
    }
  }
  return { exec };
};
