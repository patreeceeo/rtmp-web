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

interface TweenConstructor<Type extends TweenType> {
  new (eid: EntityId): Tween<Type>;
  readonly store: ECS.ComponentType<ECS.ISchema>;
}
interface Tween<Type extends TweenType> {
  readonly eid: EntityId;
  setEnd(data: TweenDataByType[Type]): void;
  readonly end: TweenDataByType[Type];
}
class ColorTween implements Tween<TweenType.color> {
  static readonly store = ECS.defineComponent({ value: ECS.Types.ui8 });
  readonly type = TweenType.color;
  constructor(readonly eid: EntityId) {
  }

  setEnd(color: ColorId) {
    ColorTween.store.value[this.eid] = color;
  }

  get end(): ColorId {
    return ColorTween.store.value[this.eid];
  }
}

class PositionTween implements Tween<TweenType.position> {
  static readonly store = ECS.defineComponent(Vec2Type);
  readonly type = TweenType.position;
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
}

const klassMap: Map<TweenType, TweenConstructor<TweenType>> = new Map();
klassMap.set(TweenType.color, ColorTween);
klassMap.set(TweenType.position, PositionTween);

class TweenStateApi {
  #world = defaultWorld;
  #map: Record<TweenType, Record<EntityId, Tween<TweenType>>> = {
    [TweenType.position]: {},
    [TweenType.color]: {},
  };
  #queries = {
    [TweenType.position]: ECS.defineQuery([PositionTween.store]),
    [TweenType.color]: ECS.defineQuery([ColorTween.store]),
  };
  add(eid: EntityId, type: TweenType) {
    const Klass = klassMap.get(type)!;
    this.#map[type][eid] = new Klass(eid);
  }
  activate<Type extends TweenType>(
    eid: EntityId,
    type: Type,
    end: TweenDataByType[Type],
  ) {
    this.#map[type][eid].setEnd(end);
    ECS.addComponent(this.#world, klassMap.get(type)!.store, eid);
  }
  deactivate(eid: EntityId, type: TweenType) {
    ECS.removeComponent(this.#world, klassMap.get(type)!, eid);
  }
  get<Type extends TweenType>(eid: EntityId, type: Type): Tween<Type> {
    return this.#map[type][eid] as Tween<Type>;
  }
  has(eid: EntityId, type: TweenType) {
    return !!this.get(eid, type);
  }
  *getActive<Type extends TweenType>(type: Type): Generator<Tween<Type>> {
    const query = this.#queries[type];
    for (const eid of query(this.#world)) {
      yield this.get(eid as EntityId, type);
    }
  }
}

export const TweenState = new TweenStateApi();
