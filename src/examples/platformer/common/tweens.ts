import { Tween } from "../../../modules/client/state/Tween.ts";
import { Vec2, Vec2Type } from "../../../modules/common/Vec2.ts";
import { PlayerState, PoseType } from "../../../modules/common/state/Player.ts";
import { EntityId } from "../../../modules/common/state/mod.ts";
import * as ECS from "bitecs";
import { IPlayerSnapshot, MsgType } from "./message.ts";
import { ISystemExecutionContext } from "../../../modules/common/systems/mod.ts";

const reuseVec2 = new Vec2();

export class PositionTween implements Tween<Vec2> {
  static readonly store = ECS.defineComponent(Vec2Type);
  static readonly query = ECS.defineQuery([this.store]);
  static readonly messageType = MsgType.playerSnapshot;
  static extractData(source: IPlayerSnapshot) {
    return source.targetPosition;
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
  exec({ deltaTime }: ISystemExecutionContext) {
    const player = PlayerState.getPlayer(this.eid);
    if (player) {
      // TODO actually tween
      reuseVec2.copy(this.end).sub(player.position);
      const distance = Math.sqrt(reuseVec2.lengthSquared);
      reuseVec2.clamp(
        Math.min(player.maxVelocity / 8 * deltaTime, distance / 2),
      );
      player.position.add(reuseVec2);
    }
  }
  get isComplete() {
    const player = PlayerState.getPlayer(this.eid);
    if (player) {
      return player.position.almostEquals(this.end, 0.1);
    }
    return true;
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
  get isComplete() {
    const player = PlayerState.getPlayer(this.eid);
    if (player) {
      return player.velocity.equals(this.end);
    }
    return true;
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

  get isComplete() {
    return PlayerState.getPlayer(this.eid)?.pose === this.end ?? true;
  }
}
