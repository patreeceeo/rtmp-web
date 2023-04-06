import { defaultWorld, EntityId } from "../../common/state/mod.ts";
import { ColorId } from "../../common/state/Player.ts";
import { Vec2, Vec2Type } from "../../common/Vec2.ts";
import * as ECS from "bitecs";

export enum TweenType {
  position,
  color,
}

export type TweenDataByType = {
  [TweenType.position]: Vec2;
  [TweenType.color]: ColorId;
};

const PositionStore = ECS.defineComponent(Vec2Type);
const ColorStore = ECS.defineComponent({ value: ECS.Types.ui8 });

function getStore(type: TweenType) {
  switch (type) {
    case TweenType.position:
      return PositionStore;
    case TweenType.color:
      return ColorStore;
  }
}

export class Tween<Type extends TweenType> {
  #endPosition: Vec2;

  constructor(readonly eid: EntityId, readonly type: Type) {
    this.#endPosition = Vec2.fromEntityComponent(eid, PositionStore);
  }

  setEnd(data: TweenDataByType[Type] | undefined) {
    switch (this.type) {
      case TweenType.position:
        this.#endPosition.copy(data as Vec2);
        break;
      case TweenType.color:
        ColorStore.value[this.eid] = data as number;
        break;
    }
  }
  get end(): TweenDataByType[Type] | undefined {
    switch (this.type) {
      case TweenType.position:
        return this.#endPosition as TweenDataByType[Type];
      case TweenType.color:
        // TODO I just can't right now
        // deno-lint-ignore no-explicit-any
        return ColorStore.value[this.eid] as any;
      default:
        return undefined;
    }
  }
}

class TweenStateApi {
  #world = defaultWorld;
  #queries = {
    [TweenType.position]: ECS.defineQuery([PositionStore]),
    [TweenType.color]: ECS.defineQuery([ColorStore]),
  };
  set(tween: Tween<TweenType>) {
    ECS.addComponent(this.#world, getStore(tween.type), tween.eid);
  }
  get<Type extends TweenType>(eid: EntityId, type: Type): Tween<Type> {
    return new Tween(eid, type);
  }
  has(eid: EntityId, type: TweenType) {
    return ECS.hasComponent(this.#world, getStore(type), eid);
  }
  *byType<Type extends TweenType>(type: Type): Generator<Tween<Type>> {
    const query = this.#queries[type];
    for (const eid of query(this.#world)) {
      yield this.get(eid as EntityId, type);
    }
  }
}

export const TweenState = new TweenStateApi();
