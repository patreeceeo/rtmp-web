import { Button } from "../../../modules/common/Button.ts";
import { Just, Nothing } from "../../../modules/common/Maybe.ts";
import { NetworkId } from "../../../modules/common/NetworkApi.ts";
import { InputState } from "../../../modules/common/state/Input.ts";
import { NetworkState } from "../../../modules/common/state/Network.ts";
import { Player, PlayerState } from "../../../modules/common/state/Player.ts";
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

const maxAcceleration = 2;

const reAcceleration = new Vec2();
export class WasdMoveTrait implements Trait<IPlayerMove, IPlayerSnapshot> {
  static readonly commandType = PlayerMove.type;
  static readonly snapshotType = PlayerSnapshot.type;
  readonly #nid: NetworkId;
  readonly #player: Player;
  #lastDdx = 0;
  #lastDdy = 0;

  constructor(readonly entityId: EntityId) {
    this.#nid = NetworkState.getId(this.entityId)!;
    this.#player = PlayerState.getPlayer(this.entityId)!;
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
        reAcceleration.set(ddx, ddy);
        reAcceleration.clamp(maxAcceleration);
        this.#lastDdx = ddx;
        this.#lastDdy = ddy;
        return this.#justCommand;
      }
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
  getSnapshotMaybe({ nid, sid }: IPlayerMove) {
    return Just([
      PlayerSnapshot,
      (p: IPlayerSnapshot) => {
        const player = this.#player;
        p.position.copy(player.targetPosition);
        p.velocity.copy(player.velocity);
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
    player.acceleration.copy(acceleration);
  }
  shouldApplySnapshot(
    { nid, velocity }: IPlayerSnapshot,
  ) {
    return velocity.lengthSquared < this.#player.maxVelocitySq &&
        this.#player.acceleration.isZero || !NetworkState.isLocal(nid);
  }
  applySnapshot(
    { pose, position, velocity, nid }: IPlayerSnapshot,
    context: ISystemExecutionContext,
  ) {
    const player = this.#player;
    player.lastActiveTime = context.elapsedTime;
    player.targetPosition.copy(position);
    player.targetVelocity.copy(velocity);

    if (!NetworkState.isLocal(nid)) {
      player.velocity.copy(velocity);
    }
    player.pose = pose;
  }
}
