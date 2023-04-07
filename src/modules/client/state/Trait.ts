import {
  ColorChange,
  MessagePlayloadByType,
  MessageType,
  PlayerMove,
} from "../../common/Message.ts";
import { InputState } from "../../common/state/Input.ts";
import { LevelState } from "../../common/state/LevelState.ts";
import { MessageState } from "../../common/state/Message.ts";
import { EntityId, Just, Maybe, Nothing } from "../../common/state/mod.ts";
import { NetworkId } from "../../common/state/Network.ts";
import { Player, PlayerState } from "../../common/state/Player.ts";
import { Time } from "../../common/state/Time.ts";
import { Vec2 } from "../../common/Vec2.ts";
import { ClientNetworkState } from "./Network.ts";

export enum TraitType {
  wasdMove,
  colorChange,
}

interface TraitConstructor<Type extends TraitType, MType extends MessageType> {
  new (eid: EntityId): Trait<Type, MType>;
  applyCommand(message: MessagePlayloadByType[MType]): void;
}

interface Trait<Type extends TraitType, MType extends MessageType> {
  readonly eid: EntityId;
  readonly type: Type;
  readonly mType: MType;
  getCommand(): Maybe<MessagePlayloadByType[MType]>;
}
export type AnyTrait = Trait<TraitType, MessageType>;

class WasdMoveTrait
  implements Trait<TraitType.wasdMove, MessageType.playerMoved> {
  readonly type = TraitType.wasdMove;
  readonly mType = MessageType.playerMoved;
  readonly #reVec2 = new Vec2();
  readonly #player: Player;
  readonly #nid: NetworkId;
  constructor(readonly eid: EntityId) {
    this.#player = PlayerState.getPlayer(this.eid);
    this.#nid = ClientNetworkState.getId(this.eid)!;
  }
  getCommand() {
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
      this.#reVec2.set(dx, dy);
      return Just(
        new PlayerMove(this.#reVec2, this.#nid, MessageState.lastStepId),
      );
    }
    return Nothing();
  }
  static applyCommand({ nid, delta }: PlayerMove) {
    const eid = ClientNetworkState.getEntityId(nid);
    // predict that the server will accept our moves
    if (PlayerState.hasPlayer(eid!)) {
      const player = PlayerState.getPlayer(eid!);
      player.position.add(delta);
    }
  }
}

class ColorChangeTrait
  implements Trait<TraitType.colorChange, MessageType.colorChange> {
  readonly type = TraitType.colorChange;
  readonly mType = MessageType.colorChange;
  readonly #player: Player;
  readonly #nid: NetworkId;
  constructor(readonly eid: EntityId) {
    this.#nid = ClientNetworkState.getId(this.eid)!;
    this.#player = PlayerState.getPlayer(this.eid);
  }
  getCommand() {
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
    const eid = ClientNetworkState.getEntityId(nid);
    // predict that the server will accept our moves
    if (PlayerState.hasPlayer(eid!)) {
      const player = PlayerState.getPlayer(eid!);
      player.color = color;
    }
  }
}

const traitKlassMap = new Map<
  TraitType,
  TraitConstructor<TraitType, MessageType>
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
  getType<Type extends TraitType>(type: Type) {
    return traitKlassMap.get(type)!;
  }
}

export const TraitState = new TraitStateApi();
