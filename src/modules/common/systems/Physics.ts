import { add, clamp, copy, getLengthSquared, sub } from "~/common/Vec2.ts";
import { ISystemExecutionContext, SystemLoader } from "./mod.ts";
import {
  CardinalDirection,
  detectTileCollision1d,
  getCollisionAngle,
  getCollisionDistance,
  resolveCollision,
  resolveTileCollision1d,
  simulateGravity,
  SimulateOptions,
  simulatePositionWithVelocity,
  simulateVelocityWithAcceleration,
} from "../../../modules/common/functions/physics.ts";
import { getPhysicsOptions } from "../functions/physicsHelpers.ts";
import { isClient } from "../env.ts";
import { Instance } from "../Vec2.ts";
import { PhysicsState } from "../state/Physics.ts";
import { PoseType } from "../../client/state/Sprite.ts";
import { addComponent, hasComponent, removeComponent } from "../Component.ts";
import { GroundedTag, PlayerTag } from "../components.ts";
import { Player } from "../../../examples/platformer/common/constants.ts";

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
        if (getLengthSquared(tempPositionDelta) > 0) {
          clamp(tempPositionDelta, dynamicEntity.maxSpeed * fixedDeltaTime);

          // if (!isZero(tempPositionDelta)) {
          //   console.log("add delta", toJSON(tempPositionDelta));
          // }
          add(dynamicEntity.position, tempPositionDelta);
        }
      }
      dynamicEntity.pose = dynamicEntity.acceleration.x == 0
        ? dynamicEntity.pose
        : dynamicEntity.acceleration.x > 0
        ? PoseType.facingRight
        : PoseType.facingLeft;

      // console.log("y vel", dynamicEntity.velocity.y);
      updatePosition(
        dynamicEntity.position,
        dynamicEntity.velocity,
        fixedDeltaTime,
        options,
      );
      if (isClient) {
        updatePosition(
          dynamicEntity.targetPosition,
          dynamicEntity.velocity,
          fixedDeltaTime,
          options,
        );
      }
      const groundedCollision = detectTileCollision1d(
        dynamicEntity.targetPosition,
        PhysicsState.tileMatrix,
        CardinalDirection.yMax,
        options,
      );
      const isGrounded = groundedCollision >= 0;
      if (
        hasComponent(PlayerTag, dynamicEntity) && !isGrounded
          ? Math.abs(dynamicEntity.velocity.x) < Player.MAX_FLY_SPEED
          : true
      ) {
        simulateVelocityWithAcceleration(
          dynamicEntity.velocity,
          dynamicEntity.acceleration,
          fixedDeltaTime,
          options,
        );
      }
      if (!isGrounded) {
        console.log("not grounded", groundedCollision);
        // if(hasComponent(GroundedTag, dynamicEntity)) {
        //   set(dynamicEntity.acceleration, 0, 0);
        // }
        removeComponent(GroundedTag, dynamicEntity);
        dynamicEntity.maxSpeed = Player.MAX_FALL_SPEED;
        dynamicEntity.friction = Player.AIR_FRICTION;
        simulateGravity(dynamicEntity.velocity, fixedDeltaTime, options);
      }

      if (isGrounded) {
        dynamicEntity.maxSpeed = Player.MAX_GROUND_SPEED;
        dynamicEntity.friction = Player.GROUND_FRICTION;
        addComponent(GroundedTag, dynamicEntity);
      }

      for (const dynamicEntityB of PhysicsState.dynamicEntities.query()) {
        if (dynamicEntityB === dynamicEntity) continue;
        handleDynamicEntityCollisions(
          dynamicEntity.position,
          dynamicEntity.velocity,
          dynamicEntityB.position,
          dynamicEntityB.velocity,
          options,
        );
        handleDynamicEntityCollisions(
          dynamicEntity.targetPosition,
          dynamicEntity.velocity,
          dynamicEntityB.targetPosition,
          dynamicEntityB.velocity,
          options,
        );
      }
    } // const dynamicEntity of PhysicsState.dynamicEntities.query()
  }
  return { exec };
};

function handleDynamicEntityCollisions(
  positionA: Instance,
  velocityA: Instance,
  positionB: Instance,
  velocityB: Instance,
  options: SimulateOptions,
) {
  const distance = getCollisionDistance(
    positionA,
    positionB,
    options,
  );
  if (distance > 0) {
    const angle = getCollisionAngle(
      positionA,
      positionB,
      options,
    );
    resolveCollision(
      positionA,
      velocityA,
      positionB,
      velocityB,
      distance,
      angle,
    );
  }
}

function updatePosition(
  position: Instance,
  velocity: Instance,
  fixedDeltaTime: number,
  options: SimulateOptions,
) {
  simulatePositionWithVelocity(position, velocity, fixedDeltaTime, options);
  // TODO(perf) space partitioning
  const xMinCollision = detectTileCollision1d(
    position,
    PhysicsState.tileMatrix,
    CardinalDirection.xMin,
    options,
  );
  const xMaxCollision = detectTileCollision1d(
    position,
    PhysicsState.tileMatrix,
    CardinalDirection.xMax,
    options,
  );
  const yMinCollision = detectTileCollision1d(
    position,
    PhysicsState.tileMatrix,
    CardinalDirection.yMin,
    options,
  );
  const yMaxCollision = detectTileCollision1d(
    position,
    PhysicsState.tileMatrix,
    CardinalDirection.yMax,
    options,
  );

  if (xMinCollision > 0) {
    resolveTileCollision1d(
      position,
      velocity,
      CardinalDirection.xMin,
      xMinCollision,
    );
  }
  if (xMaxCollision > 0) {
    resolveTileCollision1d(
      position,
      velocity,
      CardinalDirection.xMax,
      xMaxCollision,
    );
  }
  if (yMinCollision > 0) {
    resolveTileCollision1d(
      position,
      velocity,
      CardinalDirection.yMin,
      yMinCollision,
    );
  }
  if (yMaxCollision > 0) {
    resolveTileCollision1d(
      position,
      velocity,
      CardinalDirection.yMax,
      yMaxCollision,
    );
  }
}
