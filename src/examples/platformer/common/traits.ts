import {
  add,
  almostEquals,
  clamp,
  copy,
  getLengthSquared,
  Instance,
  isZero,
  set,
  sub,
} from "~/common/Vec2.ts";
import { Button } from "../../../modules/common/Button.ts";
import { NetworkId } from "../../../modules/common/NetworkApi.ts";
import { InputState } from "../../../modules/common/state/Input.ts";
import { NetworkState } from "../../../modules/common/state/Network.ts";
import { ITrait, MaybeAddMessageParameters } from "~/common/state/Trait.ts";
import {
  INegotiatePhysics,
  IPlayerMove,
  IPlayerSnapshot,
  MsgType,
  NegotiatePhysics,
  PlayerMove,
  PlayerSnapshot,
} from "./message.ts";
import { MessageState } from "../../../modules/common/state/Message.ts";
import { ISystemExecutionContext } from "../../../modules/common/systems/mod.ts";
import { ServerNetworkState } from "../../../modules/server/state/Network.ts";
import {
  EntityId,
  EntityPrefabCollection,
} from "../../../modules/common/Entity.ts";
import {
  AccelerationComponent,
  LastActiveTimeComponent,
  MaxSpeedComponent,
  PoseComponent,
  PositionComponent,
  SoftDeletedTag,
  TargetPositionComponent,
  VelocityComponent,
} from "../../../modules/common/components.ts";
import { EntityWithComponents } from "../../../modules/common/Component.ts";
import { Not } from "../../../modules/common/Query.ts";

const maxAcceleration = 2;

const reAcceleration = new Instance();
const WASD_MOVE_COMPONENTS = [
  Not(SoftDeletedTag),
  TargetPositionComponent,
  AccelerationComponent,
  PoseComponent,
  VelocityComponent,
  MaxSpeedComponent,
  LastActiveTimeComponent,
] as const;
export class WasdMoveTrait
  implements ITrait<IPlayerMove, IPlayerSnapshot, typeof WASD_MOVE_COMPONENTS> {
  static readonly commandType = PlayerMove.type;
  static readonly snapshotType = PlayerSnapshot.type;
  static readonly components = WASD_MOVE_COMPONENTS;

  static readonly entities = new EntityPrefabCollection(this.components);

  readonly #nid: NetworkId;
  #lastDdx = 0;
  #lastDdy = 0;

  eid: EntityId;
  constructor(
    readonly entity: EntityWithComponents<typeof WASD_MOVE_COMPONENTS>,
  ) {
    this.#nid = NetworkState.getId(entity.eid)!;
    this.eid = entity.eid;
  }
  getType() {
    return this.constructor as typeof WasdMoveTrait;
  }
  getCommandMaybe() {
    if (NetworkState.isLocal(this.#nid)) {
      let ddx = 0,
        ddy = 0;
      if (InputState.isButtonPressed(Button.KeyA)) {
        ddx = -maxAcceleration;
      }
      if (InputState.isButtonPressed(Button.KeyW)) {
        ddy = -maxAcceleration;
      }
      if (InputState.isButtonPressed(Button.KeyS)) {
        ddy = maxAcceleration;
      }
      if (InputState.isButtonPressed(Button.KeyD)) {
        ddx = maxAcceleration;
      }
      if (ddx !== this.#lastDdx || ddy !== this.#lastDdy) {
        set(reAcceleration, ddx, ddy);
        clamp(reAcceleration, maxAcceleration);
        this.#lastDdx = ddx;
        this.#lastDdy = ddy;
        return this.#justCommand;
      }
    }
    return null;
  }
  #writeCommand = (p: IPlayerMove) => {
    copy(p.acceleration, reAcceleration);
    p.nid = this.#nid;
    p.sid = MessageState.currentStep;
  };
  #justCommand = [
    PlayerMove,
    this.#writeCommand,
  ] as MaybeAddMessageParameters<IPlayerMove>;
  getSnapshotMaybe({ nid, sid }: IPlayerMove) {
    return [
      PlayerSnapshot,
      (p: IPlayerSnapshot) => {
        const player = this.entity;
        copy(p.position, player.targetPosition);
        copy(p.velocity, player.velocity);
        p.pose = player.pose;
        p.nid = nid;
        p.sid = sid;
      },
    ] as MaybeAddMessageParameters<IPlayerSnapshot>;
  }
  applyCommand({ acceleration }: IPlayerMove) {
    const player = this.entity;
    copy(player.acceleration, acceleration);
  }

  shouldSendSnapshot(snapshot: IPlayerSnapshot, nidReceiver: NetworkId) {
    const client = ServerNetworkState.getClient(nidReceiver)!;
    return client.hasNetworkId(snapshot.nid)
      ? isZero(this.entity.acceleration)
      : true;
  }
  shouldApplySnapshot({ nid, velocity }: IPlayerSnapshot) {
    // TODO precompute maxSpeedSquared
    return (
      (getLengthSquared(velocity) < this.entity.maxSpeed ** 2 &&
        isZero(this.entity.acceleration)) ||
      !NetworkState.isLocal(nid)
    );
  }
  applySnapshot(
    { pose, position, velocity, nid }: IPlayerSnapshot,
    context: ISystemExecutionContext,
  ) {
    const player = this.entity;
    player.lastActiveTime = context.elapsedTime;
    copy(player.targetPosition, position);

    if (!NetworkState.isLocal(nid)) {
      copy(player.velocity, velocity);
    }
    player.pose = pose;
  }
}

const tempPositionDelta = new Instance();
const tempVelocityDelta = new Instance();
const MAX_POSITION_DELTA = 2000;
const MAX_VELOCITY_DELTA = 1500;
const NEGOTIATE_PHYSICS_COMPONENTS = [
  Not(SoftDeletedTag),
  PositionComponent,
  TargetPositionComponent,
  VelocityComponent,
] as const;
export class NegotiatePhysicsTrait implements
  ITrait<
    INegotiatePhysics,
    INegotiatePhysics,
    typeof NEGOTIATE_PHYSICS_COMPONENTS
  > {
  static readonly commandType = MsgType.negotiatePhysics;
  static readonly snapshotType = MsgType.negotiatePhysics;
  readonly #nid: NetworkId;
  static readonly components = NEGOTIATE_PHYSICS_COMPONENTS;

  static readonly entities = new EntityPrefabCollection(this.components);
  #lastSendTime = 0;
  eid: EntityId;

  constructor(
    readonly entity: EntityWithComponents<typeof NEGOTIATE_PHYSICS_COMPONENTS>,
  ) {
    this.eid = entity.eid;
    this.#nid = NetworkState.getId(this.eid)!;
  }
  getType() {
    return this.constructor as typeof NegotiatePhysicsTrait;
  }
  getCommandMaybe(context: ISystemExecutionContext) {
    const speedSquared = getLengthSquared(this.entity.velocity);
    const interval = speedSquared / 80;
    if (
      NetworkState.isLocal(this.#nid) &&
      context.elapsedTime - this.#lastSendTime > interval &&
      !almostEquals(this.entity.targetPosition, this.entity.position) &&
      speedSquared > 0
    ) {
      this.#lastSendTime = context.elapsedTime;
      return this.#justCommand;
    }
    return null;
  }
  #writeCommand = (p: INegotiatePhysics) => {
    copy(p.velocity, this.entity.velocity);
    copy(p.position, this.entity.position);
    p.nid = this.#nid;
    p.sid = MessageState.currentStep;
  };
  #justCommand = [
    NegotiatePhysics,
    this.#writeCommand,
  ] as MaybeAddMessageParameters<INegotiatePhysics>;
  getSnapshotMaybe() {
    return null;
  }
  applyCommand({ position, velocity }: INegotiatePhysics) {
    const entity = this.entity;

    copy(tempPositionDelta, position);
    sub(tempPositionDelta, entity.position);
    copy(tempVelocityDelta, velocity);
    sub(tempVelocityDelta, entity.velocity);
    clamp(tempPositionDelta, MAX_POSITION_DELTA);
    clamp(tempVelocityDelta, MAX_VELOCITY_DELTA);

    add(entity.position, tempPositionDelta);
    add(entity.velocity, tempVelocityDelta);
  }

  shouldSendSnapshot() {
    return true;
  }
  shouldApplySnapshot() {
    return true;
  }
  applySnapshot({ position }: INegotiatePhysics) {
    copy(this.entity.targetPosition, position);
  }
}
