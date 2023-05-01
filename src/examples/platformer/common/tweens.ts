import { Tween } from "../../../modules/client/state/Tween.ts";
import { Vec2, Vec2Type } from "../../../modules/common/Vec2.ts";
import { PlayerState, PoseType } from "../../../modules/common/state/Player.ts";
import { EntityId } from "../../../modules/common/state/mod.ts";
import * as ECS from "bitecs";
import { IPlayerSnapshot, MsgType } from "./message.ts";
import { ISystemExecutionContext } from "../../../modules/common/systems/mod.ts";

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
  exec() {
    const player = PlayerState.getPlayer(this.eid);
    if (player) {
      // TODO actually tween
      player.position.copy(this.end);
    }
  }
}
export class VelocityTween implements Tween<Vec2> {
  static readonly store = ECS.defineComponent(Vec2Type);
  static readonly query = ECS.defineQuery([this.store]);
  static readonly messageType = MsgType.playerSnapshot;
  static extractData(source: IPlayerSnapshot) {
    return source.velocity;
  }
  #end: Vec2;

  constructor(readonly eid: EntityId) {
    // TODO its easy to mess up which store to use
    this.#end = Vec2.fromEntityComponent(eid, VelocityTween.store);
  }

  setEnd(data: Vec2) {
    this.#end.copy(data as Vec2);
  }
  get end(): Vec2 {
    return this.#end;
  }
  exec() {
    const player = PlayerState.getPlayer(this.eid);
    if (player) {
      // TODO actually tween
      player.velocity.copy(this.end);
    }
  }
}

export class PoseTween implements Tween<PoseType> {
  static readonly store = ECS.defineComponent({ value: ECS.Types.ui8 });
  static readonly query = ECS.defineQuery([this.store]);
  static readonly messageType = MsgType.playerSnapshot;
  static extractData(source: IPlayerSnapshot) {
    return source.pose;
  }
  constructor(readonly eid: EntityId) {}

  setEnd(pose: PoseType) {
    PoseTween.store.value[this.eid] = pose;
  }

  get end(): PoseType {
    return PoseTween.store.value[this.eid];
  }
  exec() {
    const player = PlayerState.getPlayer(this.eid);
    player.pose = this.end;
  }
}
