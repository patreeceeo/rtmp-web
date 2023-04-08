import {
  ColorChange,
  MessagePlayloadByType,
  MessageType,
  PlayerMove,
  PlayerSnapshot,
} from "../../common/Message.ts";
import { InputState } from "./Input.ts";
import { LevelState } from "./LevelState.ts";
import { MessageState } from "./Message.ts";
import { EntityId } from "./mod.ts";
import { NetworkId } from "./Network.ts";
import { Player, PlayerState, PoseType } from "./Player.ts";
import { Time } from "./Time.ts";
import { Vec2 } from "../Vec2.ts";
import { NetworkState } from "./Network.ts";
import { clampLine, getDistanceSquared } from "../math.ts";
import { Just, Maybe, Nothing } from "../Maybe.ts";

export enum TraitType {
  wasdMove,
  colorChange,
}

interface TraitConstructor<
  Type extends TraitType,
  CommandType extends MessageType,
  SnapshotType extends MessageType,
> {
  new (eid: EntityId): Trait<Type, CommandType>;
  applyCommand(message: MessagePlayloadByType[CommandType]): void;
  applySnapshot(message: MessagePlayloadByType[SnapshotType]): void;
  getSnapshotMaybe(
    command: MessagePlayloadByType[CommandType],
  ): Maybe<MessagePlayloadByType[SnapshotType]>;
  commandType: CommandType;
  snapshotType: SnapshotType;
}
export type AnyTraitConstructor = TraitConstructor<
  TraitType,
  MessageType,
  MessageType
>;

interface Trait<Type extends TraitType, CommandType extends MessageType> {
  readonly eid: EntityId;
  readonly type: Type;
  getCommandMaybe(): Maybe<MessagePlayloadByType[CommandType]>;
}
export type AnyTrait = Trait<TraitType, MessageType>;

const origin = Object.freeze(new Vec2(0, 0));
const reVec2 = new Vec2();
class WasdMoveTrait
  implements Trait<TraitType.wasdMove, MessageType.playerMoved> {
  readonly type = TraitType.wasdMove;
  static readonly commandType = MessageType.playerMoved;
  static readonly snapshotType = MessageType.playerSnapshot;
  readonly #player: Player;
  readonly #nid: NetworkId;

  constructor(readonly eid: EntityId) {
    this.#player = PlayerState.getPlayer(this.eid);
    this.#nid = NetworkState.getId(this.eid)!;
  }
  getCommandMaybe() {
    const velocity = this.#player.MAX_VELOCITY;
    const { x, y } = this.#player.position;
    let dx = 0,
      dy = 0;
    if (InputState.isKeyPressed("KeyA") && x > this.#player.width) {
      dx = -1 * velocity * Time.delta;
    }
    if (InputState.isKeyPressed("KeyW") && y > this.#player.height) {
      dy = -1 * velocity * Time.delta;
    }
    if (
      InputState.isKeyPressed("KeyS") &&
      y < LevelState.dimensions.y - this.#player.height
    ) {
      dy = velocity * Time.delta;
    }
    if (
      InputState.isKeyPressed("KeyD") &&
      x < LevelState.dimensions.x - this.#player.width
    ) {
      dx = velocity * Time.delta;
    }
    if (dx !== 0 || dy !== 0) {
      reVec2.set(dx, dy);
      return Just(new PlayerMove(reVec2, this.#nid, MessageState.lastStepId));
    }
    return Nothing();
  }
  static getSnapshotMaybe({
    delta,
    nid,
    sid,
  }: PlayerMove): Maybe<PlayerSnapshot> {
    const eid = NetworkState.getEntityId(nid);
    // TODO filter out invalid commands
    if (PlayerState.hasPlayer(eid!)) {
      const player = PlayerState.getPlayer(eid!);
      const timeSinceLastMove = Time.elapsed * player.lastActiveTime;
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
      return Just(new PlayerSnapshot(reVec2, pose, nid, sid));
    }
    return Nothing();
  }
  static applyCommand({ nid, delta }: PlayerMove) {
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
  static applySnapshot({ nid, pose, position }: PlayerSnapshot) {
    const eid = NetworkState.getEntityId(nid)!;
    // TODO filter out invalid snapshots
    if (PlayerState.hasPlayer(eid)) {
      const player = PlayerState.getPlayer(eid);
      // Server sends back correct position
      player.position.copy(position);
      player.pose = pose;
      // TODO what if lastActiveTime is changed by more than just moving?
      player.lastActiveTime = Time.elapsed;
    } else {
      console.warn(`Requested moving unknown player with nid ${nid}`);
    }
  }
}

class ColorChangeTrait
  implements Trait<TraitType.colorChange, MessageType.colorChange> {
  readonly type = TraitType.colorChange;
  static readonly commandType = MessageType.colorChange;
  static readonly snapshotType = MessageType.colorChange;
  readonly #player: Player;
  readonly #nid: NetworkId;
  constructor(readonly eid: EntityId) {
    this.#nid = NetworkState.getId(this.eid)!;
    this.#player = PlayerState.getPlayer(this.eid);
  }
  getCommandMaybe() {
    if (InputState.isKeyPressed("KeyQ")) {
      this.#player.color = this.#player.color === 0
        ? 6
        : this.#player.color - 1;
      return Just(
        new ColorChange(
          this.#player.color,
          this.#nid!,
          MessageState.lastStepId,
        ),
      );
    }
    if (InputState.isKeyPressed("KeyE")) {
      this.#player.color = (this.#player.color + 1) % 6;
      return Just(
        new ColorChange(
          this.#player.color,
          this.#nid!,
          MessageState.lastStepId,
        ),
      );
    }
    return Nothing();
  }
  static applyCommand({ nid, color }: ColorChange) {
    const eid = NetworkState.getEntityId(nid);
    // predict that the server will accept our moves
    if (PlayerState.hasPlayer(eid!)) {
      const player = PlayerState.getPlayer(eid!);
      player.color = color;
    }
  }
  static getSnapshotMaybe(payload: ColorChange) {
    const eid = NetworkState.getEntityId(payload.nid);
    const player = PlayerState.getPlayer(eid!);
    player.color = payload.color;
    player.lastActiveTime = Time.elapsed;
    return Just(payload);
  }
  static applySnapshot = this.applyCommand;
}

const traitKlassMap = new Map<
  TraitType,
  TraitConstructor<TraitType, MessageType, MessageType>
>([
  [TraitType.wasdMove, WasdMoveTrait],
  [TraitType.colorChange, ColorChangeTrait],
]);

class TraitStateApi {
  #map: Record<TraitType, Record<EntityId, Trait<TraitType, MessageType>>> = {
    [TraitType.wasdMove]: {},
    [TraitType.colorChange]: {},
  };
  add(eid: EntityId, type: TraitType) {
    const Klass = traitKlassMap.get(type)!;
    this.#map[type][eid] = new Klass(eid);
  }
  deleteEntity(eid: EntityId) {
    console.log("deleting all trait data for", eid);
    for (const map of Object.entries(this.#map)) {
      delete map[eid];
    }
  }
  *getAll() {
    for (const map of Object.values(this.#map)) {
      for (const trait of Object.values(map)) {
        yield trait;
      }
    }
  }
  getTypes(): Array<TraitType> {
    return [TraitType.wasdMove, TraitType.colorChange];
  }
  getType<Type extends TraitType>(type: Type) {
    return traitKlassMap.get(type)!;
  }
}

export const TraitState = new TraitStateApi();
