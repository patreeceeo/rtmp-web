import { add, clamp, copy, getLengthSquared, sub } from "~/common/Vec2.ts";
import { ISystemExecutionContext, SystemLoader } from "./mod.ts";
import {
  detectGrounded,
  resolveTileCollisions,
  simulateGravity,
  simulatePositionWithVelocity,
  simulateVelocityWithAcceleration,
} from "../../../modules/common/functions/physics.ts";
import { getPhysicsOptions } from "../functions/physicsHelpers.ts";
import { isClient } from "../env.ts";
import { Instance } from "../Vec2.ts";
import { PhysicsState } from "../state/Physics.ts";
import { PoseType } from "../../client/state/Sprite.ts";
import { addComponent, removeComponent } from "../Component.ts";
import { GroundedTag } from "../components.ts";

const tempPositionDelta = new Instance();

export const PhysicsSystem: SystemLoader<
  ISystemExecutionContext,
  [{ fixedDeltaTime: number }]
> = ({ fixedDeltaTime }) => {
  for (const tileEntity of PhysicsState.tileEntities.query()) {
    const tileX = tileEntity.position.x >> 5;
    const tileY = tileEntity.position.y >> 5;
    PhysicsState.tileMatrix.set(tileX, tileY, true);
  }

  function exec() {
    for (const dynamicEntity of PhysicsState.dynamicEntities.query()) {
      const options = getPhysicsOptions(dynamicEntity);
      if (!isClient) {
        copy(dynamicEntity.targetPosition, dynamicEntity.position);
      } else {
        add(
          dynamicEntity.targetPosition,
          dynamicEntity.velocity,
          fixedDeltaTime,
        );

        // Calculate how far we are from where we should be
        copy(tempPositionDelta, dynamicEntity.targetPosition);
        sub(tempPositionDelta, dynamicEntity.position);
        if (
          getLengthSquared(tempPositionDelta) > 1
        ) {
          clamp(tempPositionDelta, dynamicEntity.maxSpeed * fixedDeltaTime);
          add(dynamicEntity.position, tempPositionDelta);
        }
      }
      dynamicEntity.pose = dynamicEntity.acceleration.x == 0
        ? dynamicEntity.pose
        : dynamicEntity.acceleration.x > 0
        ? PoseType.facingRight
        : PoseType.facingLeft;
      simulateVelocityWithAcceleration(
        dynamicEntity.velocity,
        dynamicEntity.acceleration,
        fixedDeltaTime,
        options,
      );
      simulatePositionWithVelocity(
        dynamicEntity.position,
        dynamicEntity.velocity,
        fixedDeltaTime,
        options,
      );
      const isGrounded = detectGrounded(
        dynamicEntity.position,
        PhysicsState.tileMatrix,
        options,
      );
      if (!isGrounded) {
        removeComponent(GroundedTag, dynamicEntity);
        simulateGravity(
          dynamicEntity.velocity,
          fixedDeltaTime,
          options,
        );
      } else {
        addComponent(GroundedTag, dynamicEntity);
      }
      // TODO(perf) space partitioning
      resolveTileCollisions(
        dynamicEntity.targetPosition,
        dynamicEntity.velocity,
        PhysicsState.tileMatrix,
        options,
      );
    }
  }
  return { exec };
};
