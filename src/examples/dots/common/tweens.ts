import { Tween } from "../../../modules/client/state/Tween.ts";
import { ColorId, PlayerState } from "../../../modules/common/state/Player.ts";
import * as ECS from "bitecs";
import { EntityId } from "../../../modules/common/state/mod.ts";
import { Vec2, Vec2Type } from "../../../modules/common/Vec2.ts";
import { clampLine } from "../../../modules/common/math.ts";
import { IColorChange, IPlayerSnapshot, MsgType } from "./messages.ts";

export class ColorTween implements Tween<ColorId> {
  static readonly store = ECS.defineComponent({ value: ECS.Types.ui8 });
  static readonly query = ECS.defineQuery([this.store]);
  static readonly messageType = MsgType.colorChange;
  static extractData(source: IColorChange) {
    return source.color;
  }
  constructor(readonly eid: EntityId) {}

  setEnd(color: ColorId) {
    ColorTween.store.value[this.eid] = color;
  }

  get end(): ColorId {
    return ColorTween.store.value[this.eid];
  }

  exec() {
    const player = PlayerState.getPlayer(this.eid!);
    player.color = this.end;
  }
}

export class PositionTween implements Tween<Vec2> {
  static readonly store = ECS.defineComponent(Vec2Type);
  static readonly query = ECS.defineQuery([this.store]);
  static readonly messageType = MsgType.playerSnapshot;
  static extractData(source: IPlayerSnapshot) {
    return source.position;
  }
  #end: Vec2;

  constructor(readonly eid: EntityId) {
    this.#end = Vec2.fromEntityComponent(eid, PositionTween.store);
  }

  setEnd(data: Vec2) {
    this.#end.copy(data as Vec2);
  }
  get end(): Vec2 {
    return this.#end;
  }
  exec(timeDelta: number) {
    const player = PlayerState.getPlayer(this.eid);
    if (player) {
      const mid = clampLine(
        player.position,
        this.end,
        player.MAX_VELOCITY * timeDelta,
      );
      player.position.copy(mid);
    }
  }
}
