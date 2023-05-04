import { Button } from "../../../modules/common/Button.ts";
import { Just, Nothing } from "../../../modules/common/Maybe.ts";
import { NetworkId } from "../../../modules/common/NetworkApi.ts";
import { InputState } from "../../../modules/common/state/Input.ts";
import { NetworkState } from "../../../modules/common/state/Network.ts";
import { PlayerState, PoseType } from "../../../modules/common/state/Player.ts";
import { EntityId } from "../../../modules/common/state/mod.ts";
import { Vec2 } from "~/common/Vec2.ts";
import { MaybeAddMessageParameters, Trait } from "~/common/state/Trait.ts";
import {
  IPlayerMove,
  IPlayerSnapshot,
  PlayerMove,
  PlayerSnapshot,
} from "./message.ts";
import { MessageState } from "../../../modules/common/state/Message.ts";
import { ISystemExecutionContext } from "../../../modules/common/systems/mod.ts";

const maxAcceleration = 0.005;

const reAcceleration = new Vec2();
export class WasdMoveTrait implements Trait<IPlayerMove, IPlayerSnapshot> {
  static readonly commandType = PlayerMove.type;
  static readonly snapshotType = PlayerSnapshot.type;
  readonly #nid: NetworkId;

  constructor(readonly entityId: EntityId) {
    this.#nid = NetworkState.getId(this.entityId)!;
  }
  getType() {
    return this.constructor as (typeof WasdMoveTrait);
  }
  getCommandMaybe() {
    let ddx = 0, ddy = 0;
    if (InputState.isButtonPressed(Button.KeyA)) {
      ddx = -1;
    }
    if (InputState.isButtonPressed(Button.KeyW)) {
      ddy = -1;
    }
    if (
      InputState.isButtonPressed(Button.KeyS)
    ) {
      ddy = 1;
    }
    if (
      InputState.isButtonPressed(Button.KeyD)
    ) {
      ddx = 1;
    }
    if (ddx !== 0 || ddy !== 0) {
      reAcceleration.set(ddx, ddy);
      reAcceleration.clamp(maxAcceleration);
      return this.#justCommand;
    }
    return Nothing();
  }
  #writeCommand = (p: IPlayerMove) => {
    p.acceleration.copy(reAcceleration);
    p.nid = this.#nid;
    p.sid = MessageState.currentStep;
  };
  #justCommand = Just([
    PlayerMove,
    this.#writeCommand,
  ]) as MaybeAddMessageParameters<IPlayerMove>;
  static getSnapshotMaybe({
    nid,
    sid,
  }: IPlayerMove) {
    const eid = NetworkState.getEntityId(nid);
    // TODO filter out invalid commands
    if (PlayerState.hasPlayer(eid!)) {
      const player = PlayerState.getPlayer(eid!);
      return Just([PlayerSnapshot, (p: IPlayerSnapshot) => {
        p.position.copy(player.position);
        p.velocity.copy(player.velocity);
        p.pose = player.pose;
        p.nid = nid;
        p.sid = sid;
      }]) as MaybeAddMessageParameters<IPlayerSnapshot>;
    }
    return Nothing();
  }
  static applyCommand({ nid, acceleration }: IPlayerMove) {
    const eid = NetworkState.getEntityId(nid);
    // TODO filter out invalid commands
    if (PlayerState.hasPlayer(eid!)) {
      const player = PlayerState.getPlayer(eid!);
      player.acceleration.copy(acceleration);
      player.pose = acceleration.x == 0
        ? player.pose
        : acceleration.x > 0
        ? PoseType.facingRight
        : PoseType.facingLeft;
    }
  }
  static applySnapshot(
    { nid, pose, position, velocity }: IPlayerSnapshot,
    context: ISystemExecutionContext,
  ) {
    const eid = NetworkState.getEntityId(nid)!;
    // TODO filter out invalid snapshots
    if (PlayerState.hasPlayer(eid)) {
      const player = PlayerState.getPlayer(eid);
      // Server sends back correct position
      // but due to network latency, it might be very outdated
      player.position.copy(position);
      player.velocity.copy(velocity);
      player.pose = pose;
      // TODO what if lastActiveTime is changed by more than just moving?
      player.lastActiveTime = context.elapsedTime;
    } else {
      console.warn(`Requested moving unknown player with nid ${nid}`);
    }
  }
}
