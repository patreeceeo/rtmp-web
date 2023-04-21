import { EntityId } from "./mod.ts";
import { Maybe } from "../Maybe.ts";
import { IMessageDef, IPayloadAny, IWritePayload } from "../Message.ts";

export type MaybeAddMessageParameters<P extends IPayloadAny> = Maybe<
  [IMessageDef<P>, IWritePayload<P>]
>;

interface ITraitConstructor<
  CommandPayload extends IPayloadAny,
  SnapshotPayload extends IPayloadAny,
> {
  new (eid: EntityId): Trait<CommandPayload, SnapshotPayload>;
  applyCommand(payload: CommandPayload): void;
  applySnapshot(payload: SnapshotPayload): void;
  getSnapshotMaybe(
    command: CommandPayload,
  ): MaybeAddMessageParameters<SnapshotPayload>;
  commandType: number;
  snapshotType: number;
}
export type ITraitConstructorAny = ITraitConstructor<IPayloadAny, IPayloadAny>;

export interface Trait<
  CommandPayload extends IPayloadAny,
  SnapshotPayload extends IPayloadAny,
> {
  readonly entityId: EntityId;
  getType(): ITraitConstructor<CommandPayload, SnapshotPayload>;
  getCommandMaybe(): MaybeAddMessageParameters<CommandPayload>;
}
export type TraitAny = Trait<IPayloadAny, IPayloadAny>;

class TraitStateApi {
  #instanceMap = new Map<ITraitConstructorAny, Record<EntityId, TraitAny>>();
  #getEntityMap<C extends IPayloadAny, P extends IPayloadAny>(
    type: ITraitConstructor<C, P>,
  ) {
    return this.#instanceMap.get(type as ITraitConstructorAny) || {};
  }
  add<CommandType extends IPayloadAny, SnapshotType extends IPayloadAny>(
    type: ITraitConstructor<CommandType, SnapshotType>,
    eid: EntityId,
  ) {
    const trait = new type(eid);
    const entityMap = this.#getEntityMap(type);
    entityMap[trait.entityId] = trait as TraitAny;
    this.#instanceMap.set(type as ITraitConstructorAny, entityMap);
  }
  deleteEntity(eid: EntityId) {
    for (const map of Object.entries(this.#instanceMap)) {
      delete map[eid];
    }
  }
  *getAll() {
    for (const map of this.#instanceMap.values()) {
      for (const trait of Object.values(map)) {
        yield trait;
      }
    }
  }
  getTypes(): Iterable<ITraitConstructorAny> {
    return this.#instanceMap.keys();
  }
  getTrait<
    CommandPayload extends IPayloadAny,
    SnapshotPayload extends IPayloadAny,
  >(type: ITraitConstructor<CommandPayload, SnapshotPayload>, eid: EntityId) {
    return this.#instanceMap.get(type as ITraitConstructorAny)![
      eid
    ] as Trait<CommandPayload, SnapshotPayload>;
  }
}

export const TraitState = new TraitStateApi();
