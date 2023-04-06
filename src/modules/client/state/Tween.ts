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
const IsActiveStore = ECS.defineComponent();

function getStore(type: TweenType) {
  switch (type) {
    case TweenType.position:
      return PositionStore;
    case TweenType.color:
      return ColorStore;
  }
}

class Tween<Type extends TweenType> {
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
  get end(): TweenDataByType[Type] {
    switch (this.type) {
      case TweenType.position:
        return this.#endPosition as TweenDataByType[Type];
      case TweenType.color:
        // TODO I just can't right now
        // deno-lint-ignore no-explicit-any
        return ColorStore.value[this.eid] as any;
      default:
        throw new Error("unhandled case");
    }
  }
}

class TweenStateApi {
  #world = defaultWorld;
  #map: Record<TweenType, Record<EntityId, Tween<TweenType>>> = {
    [TweenType.position]: {},
    [TweenType.color]: {},
  };
  #queries = {
    [TweenType.position]: ECS.defineQuery([IsActiveStore, PositionStore]),
    [TweenType.color]: ECS.defineQuery([IsActiveStore, ColorStore]),
  };
  add(eid: EntityId, type: TweenType) {
    ECS.addComponent(this.#world, getStore(type), eid);
    this.#map[type][eid] = new Tween(eid, type);
  }
  activate<Type extends TweenType>(
    eid: EntityId,
    type: Type,
    end: TweenDataByType[Type],
  ) {
    ECS.addComponent(this.#world, IsActiveStore, eid);
    this.#map[type][eid].setEnd(end);
  }
  deactivate(eid: EntityId) {
    ECS.removeComponent(this.#world, IsActiveStore, eid);
  }
  get<Type extends TweenType>(eid: EntityId, type: Type): Tween<Type> {
    return this.#map[type][eid] as Tween<Type>;
  }
  has(eid: EntityId, type: TweenType) {
    return ECS.hasComponent(this.#world, getStore(type), eid);
  }
  *getActive<Type extends TweenType>(type: Type): Generator<Tween<Type>> {
    const query = this.#queries[type];
    for (const eid of query(this.#world)) {
      yield this.get(eid as EntityId, type);
    }
  }
}

export const TweenState = new TweenStateApi();
