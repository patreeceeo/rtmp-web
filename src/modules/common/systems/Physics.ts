import {
  add,
  almostEquals,
  clamp,
  copy,
  equals,
  getLengthSquared,
  sub,
} from "~/common/Vec2.ts";
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
import { IPhysicsEntity, PhysicsState } from "../state/Physics.ts";
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
      if (isGrounded) {
        addComponent(GroundedTag, dynamicEntity);
      } else {
        removeComponent(GroundedTag, dynamicEntity);
      }

      dynamicEntity.shoulderCount = 0;
      for (const dynamicEntityB of PhysicsState.dynamicEntities.query()) {
        if (dynamicEntityB === dynamicEntity) continue;
        if (
          isShoulderPosition(
            dynamicEntity.position,
            dynamicEntityB.position,
            options.hitBox.x,
          ) &&
          dynamicEntity.shoulderCount > 0
        ) {
          continue;
        }
        handleDynamicEntityCollisions(
          dynamicEntity,
          dynamicEntityB,
          dynamicEntity.position,
          dynamicEntityB.position,
          options,
        );

        handleDynamicEntityCollisions(
          dynamicEntity,
          dynamicEntityB,
          dynamicEntity.targetPosition,
          dynamicEntityB.targetPosition,
          options,
        );
      }

      const isShouldered = dynamicEntity.shoulderCount > 0;

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
      if (!isGrounded && !isShouldered) {
        // console.log("not grounded", groundedCollision);
        // if(hasComponent(GroundedTag, dynamicEntity)) {
        //   set(dynamicEntity.acceleration, 0, 0);
        // }
        dynamicEntity.maxSpeed = Player.MAX_FALL_SPEED;
        dynamicEntity.friction = Player.AIR_FRICTION;
        simulateGravity(dynamicEntity.velocity, fixedDeltaTime, options);
      }

      if (isGrounded || isShouldered) {
        // console.log("grounded", groundedCollision);
        dynamicEntity.maxSpeed = Player.MAX_GROUND_SPEED;
        dynamicEntity.friction = Player.GROUND_FRICTION;
      }
    } // const dynamicEntity of PhysicsState.dynamicEntities.query()
  }
  return { exec };
};

function isShoulderPosition(
  myPosition: Instance,
  otherPosition: Instance,
  otherWidth: number,
) {
  const dX = otherPosition.x - myPosition.x;
  return Math.abs(dX) < otherWidth / 2 && myPosition.y < otherPosition.y;
}

function handleDynamicEntityCollisions(
  entityA: IPhysicsEntity,
  entityB: IPhysicsEntity,
  positionA: Instance,
  positionB: Instance,
  options: SimulateOptions,
): number {
  const velocityA = entityA.velocity;
  const velocityB = entityB.velocity;

  const distance = getCollisionDistance(
    positionA,
    positionB,
    options,
    Player.MAX_COLLISION_PLAY_DISTANCE,
  );

  const prevY = positionA.y;

  if (distance >= 0) {
    if (
      hasComponent(GroundedTag, entityA) &&
      hasComponent(GroundedTag, entityB) &&
      Math.abs(velocityA.x) >= Player.MIN_KICKBACK_RESTITUTION_SPEED
    ) {
      velocityA.y -= Player.KICKBACK_RESTITUTION_Y;
      velocityA.x *= Player.KICKBACK_RESTITUTION_X_FACTOR;
    }
  }

  if (distance > 0) {
    const angle = getCollisionAngle(positionA, positionB, options);
    resolveCollision(
      positionA,
      velocityA,
      positionB,
      velocityB,
      distance,
      angle,
      options,
    );
  }

  if (distance >= -Player.MAX_COLLISION_PLAY_DISTANCE) {
    const xA = positionA.x;
    const xB = positionB.x;
    const dX = xA - xB;

    if (
      isShoulderPosition(positionA, positionB, options.hitBox.x) &&
      entityA.acceleration.x === 0
    ) {
      entityA.shoulderCount++;
      if (almostEquals(entityA.position, entityA.targetPosition, 512)) {
        positionA.x -= dX;
      }
    }
  }

  if (hasComponent(GroundedTag, entityA) || entityA.shoulderCount > 0) {
    positionA.y = prevY;
  }
  return distance;
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
