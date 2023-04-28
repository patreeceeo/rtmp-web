import { Button } from "../../../modules/common/Button.ts";
import { Just, Nothing } from "../../../modules/common/Maybe.ts";
import { NetworkId } from "../../../modules/common/NetworkApi.ts";
import { InputState } from "../../../modules/common/state/Input.ts";
import { LevelState } from "../../../modules/common/state/LevelState.ts";
import { NetworkState } from "../../../modules/common/state/Network.ts";
import {
  Player,
  PlayerState,
  PoseType,
} from "../../../modules/common/state/Player.ts";
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
import { clampLine, getDistanceSquared } from "../../../modules/common/math.ts";
import { ISystemExecutionContext } from "../../../modules/common/systems/mod.ts";

const origin = Object.freeze(new Vec2(0, 0));
const reVec2 = new Vec2();
export class WasdMoveTrait implements Trait<IPlayerMove, IPlayerSnapshot> {
  static readonly commandType = PlayerMove.type;
  static readonly snapshotType = PlayerSnapshot.type;
  readonly #player: Player;
  readonly #nid: NetworkId;

  constructor(readonly entityId: EntityId) {
    this.#player = PlayerState.getPlayer(this.entityId);
    this.#nid = NetworkState.getId(this.entityId)!;
  }
  getType() {
    return this.constructor as (typeof WasdMoveTrait);
  }
  getCommandMaybe({ deltaTime }: ISystemExecutionContext) {
    const velocity = this.#player.MAX_VELOCITY;
    const { x, y } = this.#player.position;
    let dx = 0,
      dy = 0;
    if (InputState.isButtonPressed(Button.KeyA) && x > this.#player.width) {
      dx = -1 * velocity * deltaTime;
    }
    if (InputState.isButtonPressed(Button.KeyW) && y > this.#player.height) {
      dy = -1 * velocity * deltaTime;
    }
    if (
      InputState.isButtonPressed(Button.KeyS) &&
      y < LevelState.dimensions.y - this.#player.height
    ) {
      dy = velocity * deltaTime;
    }
    if (
      InputState.isButtonPressed(Button.KeyD) &&
      x < LevelState.dimensions.x - this.#player.width
    ) {
      dx = velocity * deltaTime;
    }
    if (dx !== 0 || dy !== 0) {
      reVec2.set(dx, dy);
      return this.#justCommand;
    }
    return Nothing();
  }
  #writeCommand = (p: IPlayerMove) => {
    p.delta.copy(reVec2);
    p.nid = this.#nid;
    p.sid = MessageState.currentStep;
  };
  #justCommand = Just([
    PlayerMove,
    this.#writeCommand,
  ]) as MaybeAddMessageParameters<IPlayerMove>;
  static getSnapshotMaybe({
    delta,
    nid,
    sid,
  }: IPlayerMove, { elapsedTime }: ISystemExecutionContext) {
    const eid = NetworkState.getEntityId(nid);
    // TODO filter out invalid commands
    if (PlayerState.hasPlayer(eid!)) {
      const player = PlayerState.getPlayer(eid!);
      const timeSinceLastMove = elapsedTime * player.lastActiveTime;
      const pose = delta.x == 0
        ? player.pose
        : delta.x > 0
        ? PoseType.facingRight
        : PoseType.facingLeft;
      const clampDelta =
        getDistanceSquared(origin, delta) < player.MAX_VELOCITY_SQR
          ? delta
          : clampLine(origin, delta, player.MAX_VELOCITY * timeSinceLastMove);
      reVec2.copy(player.position);
      reVec2.add(clampDelta);
      return Just([PlayerSnapshot, (p: IPlayerSnapshot) => {
        p.position.copy(reVec2);
        p.pose = pose;
        p.nid = nid;
        p.sid = sid;
      }]) as MaybeAddMessageParameters<IPlayerSnapshot>;
    }
    return Nothing();
  }
  static applyCommand({ nid, delta }: IPlayerMove) {
    const eid = NetworkState.getEntityId(nid);
    // TODO filter out invalid commands
    if (PlayerState.hasPlayer(eid!)) {
      const player = PlayerState.getPlayer(eid!);
      player.position.add(delta);
      player.pose = delta.x == 0
        ? player.pose
        : delta.x > 0
        ? PoseType.facingRight
        : PoseType.facingLeft;
    }
  }
  static applySnapshot(
    { nid, pose, position }: IPlayerSnapshot,
    { elapsedTime }: ISystemExecutionContext,
  ) {
    const eid = NetworkState.getEntityId(nid)!;
    // TODO filter out invalid snapshots
    if (PlayerState.hasPlayer(eid)) {
      const player = PlayerState.getPlayer(eid);
      // Server sends back correct position
      player.position.copy(position);
      player.pose = pose;
      // TODO what if lastActiveTime is changed by more than just moving?
      player.lastActiveTime = elapsedTime;
    } else {
      console.warn(`Requested moving unknown player with nid ${nid}`);
    }
  }
}
