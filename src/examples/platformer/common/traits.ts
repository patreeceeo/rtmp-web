import { Button } from "../../../modules/common/Button.ts";
import { Just, Nothing } from "../../../modules/common/Maybe.ts";
import { NetworkId } from "../../../modules/common/NetworkApi.ts";
import { InputState } from "../../../modules/common/state/Input.ts";
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
import { ISystemExecutionContext } from "../../../modules/common/systems/mod.ts";

const maxAcceleration = 0.005;

const reAcceleration = new Vec2();
export class WasdMoveTrait implements Trait<IPlayerMove, IPlayerSnapshot> {
  static readonly commandType = PlayerMove.type;
  static readonly snapshotType = PlayerSnapshot.type;
  readonly #nid: NetworkId;
  readonly #player: Player;
  #lastDdx = 0;
  #lastDdy = 0;
  #lastCommandStep = 0;
  #lastLocalStep = 0;

  constructor(readonly entityId: EntityId) {
    this.#nid = NetworkState.getId(this.entityId)!;
    this.#player = PlayerState.getPlayer(this.entityId)!;
  }
  getType() {
    return this.constructor as typeof WasdMoveTrait;
  }
  getCommandMaybe() {
    let ddx = 0,
      ddy = 0;
    if (InputState.isButtonPressed(Button.KeyA)) {
      ddx = -1;
    }
    if (InputState.isButtonPressed(Button.KeyW)) {
      ddy = -1;
    }
    if (InputState.isButtonPressed(Button.KeyS)) {
      ddy = 1;
    }
    if (InputState.isButtonPressed(Button.KeyD)) {
      ddx = 1;
    }
    if (ddx !== this.#lastDdx || ddy !== this.#lastDdy) {
      reAcceleration.set(ddx, ddy);
      reAcceleration.clamp(maxAcceleration);
      this.#lastDdx = ddx;
      this.#lastDdy = ddy;
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
  getSnapshotMaybe({ nid, sid }: IPlayerMove) {
    return Just([
      PlayerSnapshot,
      (p: IPlayerSnapshot) => {
        const player = this.#player;
        p.targetPosition.copy(player.targetPosition);
        // TODO is this correct?
        p.velocity.copy(player.velocity);
        p.pose = player.pose;
        p.nid = nid;
        p.sid = sid;
      },
    ]) as MaybeAddMessageParameters<IPlayerSnapshot>;
  }
  applyCommand({ nid, acceleration, sid }: IPlayerMove) {
    const player = this.#player;
    // console.log("acceleration", acceleration.snapshot, "sid", sid);
    player.acceleration.copy(acceleration);
    player.pose = acceleration.x == 0
      ? player.pose
      : acceleration.x > 0
      ? PoseType.facingRight
      : PoseType.facingLeft;
    // The difference in the deltaTime according to the commands and the deltaTime according to the local system

    player.timeWarp = Math.max(
      0,
      sid -
        this.#lastCommandStep -
        (MessageState.currentStep - this.#lastLocalStep),
    );
    // console.log("client deltaTime", sid - this.lastCommandStep, "server deltaTime", MessageState.currentStep - this.lastLocalStep, "timeWarp", player.timeWarp);
    this.#lastCommandStep = sid;
    this.#lastLocalStep = MessageState.currentStep;
  }
  applySnapshot(
    { nid, pose, targetPosition, velocity }: IPlayerSnapshot,
    context: ISystemExecutionContext,
  ) {
    const player = this.#player;
    player.targetPosition.copy(targetPosition);
    // For now, we don't need to send velocity because we're assuming it will come to a stop
    player.velocity.copy(velocity);
    player.pose = pose;
    // TODO what if lastActiveTime is changed by more than just moving?
    player.lastActiveTime = context.elapsedTime;
  }
}
