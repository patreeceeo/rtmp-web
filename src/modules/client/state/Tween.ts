import { emtpyIterable } from "../../common/Iterable.ts";
import { defaultWorld, EntityId } from "../../common/state/mod.ts";
import * as ECS from "bitecs";

export interface ITweenConstructor<T, S> {
  new (eid: EntityId): Tween<T>;
  readonly store: ECS.ComponentType<ECS.ISchema>;
  readonly query: ECS.Query;
  readonly messageType: number;
  extractData(source: S): T;
}

export interface Tween<Type> {
  readonly eid: EntityId;
  setEnd(data: Type): void;
  readonly end: Type;
  exec(timeDelta: number): void;
}

class TweenStateApi {
  #world = defaultWorld;
  // deno-lint-ignore no-explicit-any
  #instanceMap: Map<ITweenConstructor<any, any>, Record<EntityId, Tween<any>>> =
    new Map();
  #messageTypeMap: Array<Set<ITweenConstructor<unknown, unknown>>> = [];
  #getEntityMap<T>(type: ITweenConstructor<T, unknown>) {
    return this.#instanceMap.get(type) || {};
  }
  #getTweenType<T>(tween: Tween<T>) {
    return tween.constructor as ITweenConstructor<T, unknown>;
  }
  // TODO change this to take a ITweenConstructor and an EntityId so that there's static type checking for the tween's constructor
  add<T>(tween: Tween<T>) {
    const type = this.#getTweenType(tween);
    const entityMap = this.#getEntityMap(type);
    entityMap[tween.eid] = tween;
    this.#instanceMap.set(type, entityMap);
    const typesForMsgType = this.#messageTypeMap[type.messageType] ||=
      new Set();
    typesForMsgType.add(type);
  }
  activate<T>(
    tween: Tween<T>,
    end: T,
  ) {
    tween.setEnd(end);
    ECS.addComponent(this.#world, this.#getTweenType(tween).store, tween.eid);
  }
  deactivate<T>(tween: Tween<T>) {
    ECS.removeComponent(
      this.#world,
      this.#getTweenType(tween).store,
      tween.eid,
    );
  }
  mapMessageType(
    msgType: number,
  ): Iterable<ITweenConstructor<unknown, unknown>> {
    if (msgType in this.#messageTypeMap) {
      return this.#messageTypeMap[msgType].values();
    } else {
      return emtpyIterable as Iterable<ITweenConstructor<unknown, unknown>>;
    }
  }
  get<T>(
    type: ITweenConstructor<T, unknown>,
    eid: EntityId,
  ): Tween<T> | undefined {
    return this.#getEntityMap(type)[eid];
  }
  has<T>(type: ITweenConstructor<T, unknown>, eid: EntityId) {
    return this.get(type, eid) !== undefined;
  }
  getTypes(): Iterable<ITweenConstructor<unknown, unknown>> {
    return this.#instanceMap.keys();
  }
  *getActive<T>(type: ITweenConstructor<T, unknown>): Generator<Tween<T>> {
    const query = type.query;
    for (const eid of query(this.#world)) {
      yield this.get(type, eid as EntityId)!;
    }
  }
  deleteEntity(eid: EntityId) {
    for (const map of this.#instanceMap.values()) {
      delete map[eid];
    }
  }
}

export const TweenState = new TweenStateApi();
