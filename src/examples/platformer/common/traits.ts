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
import { Just, Nothing } from "../../../modules/common/Maybe.ts";
import { NetworkId } from "../../../modules/common/NetworkApi.ts";
import { InputState } from "../../../modules/common/state/Input.ts";
import { NetworkState } from "../../../modules/common/state/Network.ts";
import {
  PlayerProxy,
  PlayerState,
} from "../../../modules/common/state/Player.ts";
import { EntityId } from "../../../modules/common/state/mod.ts";
import { MaybeAddMessageParameters, Trait } from "~/common/state/Trait.ts";
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

const maxAcceleration = 2;

const reAcceleration = new Instance();
export class WasdMoveTrait implements Trait<IPlayerMove, IPlayerSnapshot> {
  static readonly commandType = PlayerMove.type;
  static readonly snapshotType = PlayerSnapshot.type;
  readonly #nid: NetworkId;
  readonly #player: PlayerProxy;
  #lastDdx = 0;
  #lastDdy = 0;

  constructor(readonly entityId: EntityId) {
    this.#nid = NetworkState.getId(this.entityId)!;
    this.#player = PlayerState.acquireProxy(this.entityId)!;
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
    return Nothing();
  }
  #writeCommand = (p: IPlayerMove) => {
    copy(p.acceleration, reAcceleration);
    p.nid = this.#nid;
    p.sid = MessageState.currentStep;
  };
  #justCommand = Just([
    PlayerMove,
    this.#writeCommand,
  ]) as MaybeAddMessageParameters<IPlayerMove>;
  getSnapshotMaybe({ nid, sid }: IPlayerMove) {
    return Just([
      PlayerSnapshot,
      (p: IPlayerSnapshot) => {
        const player = this.#player;
        copy(p.position, player.targetPosition);
        copy(p.velocity, player.velocity);
        p.pose = player.pose;
        p.nid = nid;
        p.sid = sid;
      },
    ]) as MaybeAddMessageParameters<IPlayerSnapshot>;
  }
  applyCommand(
    { acceleration }: IPlayerMove,
  ) {
    const player = this.#player;
    copy(player.acceleration, acceleration);
  }

  shouldSendSnapshot(snapshot: IPlayerSnapshot, nidReceiver: NetworkId) {
    const client = ServerNetworkState.getClient(nidReceiver)!;
    return client.hasNetworkId(snapshot.nid)
      ? isZero(this.#player.acceleration)
      : true;
  }
  shouldApplySnapshot(
    { nid, velocity }: IPlayerSnapshot,
  ) {
    return getLengthSquared(velocity) < this.#player.maxVelocitySq &&
        isZero(this.#player.acceleration) || !NetworkState.isLocal(nid);
  }
  applySnapshot(
    { pose, position, velocity, nid }: IPlayerSnapshot,
    context: ISystemExecutionContext,
  ) {
    const player = this.#player;
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
export class NegotiatePhysicsTrait
  implements Trait<INegotiatePhysics, INegotiatePhysics> {
  static readonly commandType = MsgType.negotiatePhysics;
  static readonly snapshotType = MsgType.negotiatePhysics;
  readonly #nid: NetworkId;
  readonly #player: PlayerProxy;
  #lastSendTime = 0;

  constructor(readonly entityId: EntityId) {
    this.#nid = NetworkState.getId(this.entityId)!;
    this.#player = PlayerState.acquireProxy(this.entityId)!;
  }
  getType() {
    return this.constructor as typeof NegotiatePhysicsTrait;
  }
  getCommandMaybe(context: ISystemExecutionContext) {
    const speedSquared = getLengthSquared(this.#player.velocity);
    const interval = speedSquared / 80;
    if (
      NetworkState.isLocal(this.#nid) &&
      context.elapsedTime - this.#lastSendTime > interval &&
      !almostEquals(this.#player.targetPosition, this.#player.position) &&
      speedSquared > 0
    ) {
      this.#lastSendTime = context.elapsedTime;
      return this.#justCommand;
    }
    return Nothing();
  }
  #writeCommand = (p: INegotiatePhysics) => {
    copy(p.velocity, this.#player.velocity);
    copy(p.position, this.#player.position);
    p.nid = this.#nid;
    p.sid = MessageState.currentStep;
  };
  #justCommand = Just([
    NegotiatePhysics,
    this.#writeCommand,
  ]) as MaybeAddMessageParameters<INegotiatePhysics>;
  getSnapshotMaybe() {
    return Nothing();
  }
  applyCommand(
    { position, velocity }: INegotiatePhysics,
  ) {
    const player = this.#player;
    copy(tempPositionDelta, position);
    sub(tempPositionDelta, player.position);
    copy(tempVelocityDelta, velocity);
    sub(tempVelocityDelta, player.velocity);
    clamp(tempPositionDelta, MAX_POSITION_DELTA);
    clamp(tempVelocityDelta, MAX_VELOCITY_DELTA);

    add(player.position, tempPositionDelta);
    add(player.velocity, tempVelocityDelta);
  }

  shouldSendSnapshot() {
    return true;
  }
  shouldApplySnapshot() {
    return true;
  }
  applySnapshot(
    { position }: INegotiatePhysics,
  ) {
    const player = this.#player;
    copy(player.targetPosition, position);
  }
}
