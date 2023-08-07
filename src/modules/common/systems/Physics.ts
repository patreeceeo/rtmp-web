import {
  add,
  almostEquals,
  clamp,
  copy,
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
  TileCollision1d,
} from "../../../modules/common/functions/physics.ts";
import { getPhysicsOptions } from "../functions/physicsHelpers.ts";
import { isClient } from "../env.ts";
import { Instance } from "../Vec2.ts";
import { IPhysicsEntity, PhysicsState } from "../state/Physics.ts";
import { PoseType } from "~/client/functions/sprite.ts";
import { addComponent, hasComponent, removeComponent } from "../Component.ts";
import { GroundedTag, PlayerTag } from "../components.ts";
import { Player } from "../../../examples/platformer/common/constants.ts";
import { executeEventHandlers, registerEventType } from "~/common/Event.ts";
import { invertAngle } from "~/common/math.ts";
import { getEntity, UNDEFINED_ENTITY } from "~/common/Entity.ts";
import { EntityWithComponents } from "~/common/EntityWithComponents.ts";

const tempPositionDelta = new Instance();

export type CollisionData = {
  subjectEntity: EntityWithComponents<[]>;
  objectEntity: EntityWithComponents<[]>;
  impactDistance: number;
  impactAngle: number;
};
export const EVENT_TYPE_COLLISION = registerEventType();
const _collisionEvent = {
  type: EVENT_TYPE_COLLISION,
  data: {} as CollisionData,
};

export const PhysicsSystem: SystemLoader<
  ISystemExecutionContext,
  [{ fixedDeltaTime: number }]
> = ({ fixedDeltaTime }) => {
  for (const tileEntity of PhysicsState.tileEntities.query()) {
    const tileX = tileEntity.position.x >> 5;
    const tileY = tileEntity.position.y >> 5;
    PhysicsState.tileMatrix.set(tileX, tileY, tileEntity.eid);
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
      simulatePositionWithVelocity(
        dynamicEntity.position,
        dynamicEntity.velocity,
        fixedDeltaTime,
        options,
      );
      // TODO(perf) space partitioning
      handleTileCollisions(
        dynamicEntity,
        dynamicEntity.position,
        getTileCollisions(dynamicEntity.position, options),
      );

      if (isClient) {
        simulatePositionWithVelocity(
          dynamicEntity.targetPosition,
          dynamicEntity.velocity,
          fixedDeltaTime,
          options,
        );
        handleTileCollisions(
          dynamicEntity,
          dynamicEntity.targetPosition,
          getTileCollisions(dynamicEntity.targetPosition, options),
        );
      }

      detectTileCollision1d(
        dynamicEntity.targetPosition,
        PhysicsState.tileMatrix,
        CardinalDirection.yMax,
        _tileCollisions.yMax,
        options,
      );
      const isGrounded = _tileCollisions.yMax.impactDistance >= 0 &&
        _tileCollisions.yMax.tileEntityId !== UNDEFINED_ENTITY;
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

class TileCollisions {
  constructor(
    public xMin = new TileCollision1d(),
    public xMax = new TileCollision1d(),
    public yMin = new TileCollision1d(),
    public yMax = new TileCollision1d(),
  ) {}
}
const _tileCollisions = new TileCollisions();

function getTileCollisions(position: Instance, options: SimulateOptions) {
  detectTileCollision1d(
    position,
    PhysicsState.tileMatrix,
    CardinalDirection.xMin,
    _tileCollisions.xMin,
    options,
  );
  detectTileCollision1d(
    position,
    PhysicsState.tileMatrix,
    CardinalDirection.xMax,
    _tileCollisions.xMax,
    options,
  );
  detectTileCollision1d(
    position,
    PhysicsState.tileMatrix,
    CardinalDirection.yMin,
    _tileCollisions.yMin,
    options,
  );
  detectTileCollision1d(
    position,
    PhysicsState.tileMatrix,
    CardinalDirection.yMax,
    _tileCollisions.yMax,
    options,
  );
  return _tileCollisions;
}

function handleTileCollisions(
  entity: IPhysicsEntity,
  position: Instance,
  collisions: TileCollisions,
) {
  const { velocity } = entity;
  const { xMin, xMax, yMin, yMax } = collisions;

  // TODO calculate distance and angle
  if (xMin.impactDistance > 0) {
    _collisionEvent.data.impactDistance = NaN;
    _collisionEvent.data.impactAngle = NaN;
    _collisionEvent.data.subjectEntity = entity;
    _collisionEvent.data.objectEntity = getEntity(xMin.tileEntityId)!;
    executeEventHandlers(_collisionEvent);
    resolveTileCollision1d(
      position,
      velocity,
      CardinalDirection.xMin,
      xMin.impactDistance,
    );
  }
  if (xMax.impactDistance > 0) {
    _collisionEvent.data.impactDistance = NaN;
    _collisionEvent.data.impactAngle = NaN;
    _collisionEvent.data.subjectEntity = entity;
    _collisionEvent.data.objectEntity = getEntity(xMax.tileEntityId)!;
    executeEventHandlers(_collisionEvent);
    resolveTileCollision1d(
      position,
      velocity,
      CardinalDirection.xMax,
      xMax.impactDistance,
    );
  }
  if (yMin.impactDistance > 0) {
    _collisionEvent.data.impactDistance = NaN;
    _collisionEvent.data.impactAngle = NaN;
    _collisionEvent.data.subjectEntity = entity;
    _collisionEvent.data.objectEntity = getEntity(yMin.tileEntityId)!;
    executeEventHandlers(_collisionEvent);
    resolveTileCollision1d(
      position,
      velocity,
      CardinalDirection.yMin,
      yMin.impactDistance,
    );
  }
  if (yMax.impactDistance > 0) {
    _collisionEvent.data.impactDistance = NaN;
    _collisionEvent.data.impactAngle = NaN;
    _collisionEvent.data.subjectEntity = entity;
    _collisionEvent.data.objectEntity = getEntity(yMax.tileEntityId)!;
    executeEventHandlers(_collisionEvent);
    resolveTileCollision1d(
      position,
      velocity,
      CardinalDirection.yMax,
      yMax.impactDistance,
    );
  }
}

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
  const angle = getCollisionAngle(positionA, positionB, options);

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

    // check if entityA is trying to stand on entityB's shoulders
    if (
      isShoulderPosition(positionA, positionB, options.hitBox.x) &&
      entityA.acceleration.x === 0
    ) {
      entityA.shoulderCount++;
      // center entityA on entityB, but first
      // check that target position hasn't significantly diverged first
      // otherwise things can get weird
      if (
        almostEquals(
          entityA.position,
          entityA.targetPosition,
          Player.POSITION_EPSILON,
        )
      ) {
        positionA.x -= dX;
      }
    }
  }

  if (hasComponent(GroundedTag, entityA) || entityA.shoulderCount > 0) {
    positionA.y = prevY;
    velocityA.y = 0;
  }
  return distance;
}
