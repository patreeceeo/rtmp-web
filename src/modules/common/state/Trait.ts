import { EntityId } from "./mod.ts";
import { Maybe } from "../Maybe.ts";
import { IMessageDef, IPayloadAny, IWritePayload } from "../Message.ts";

export type MaybeAddMessageParameters<P extends IPayloadAny> = Maybe<
  [IMessageDef<P>, IWritePayload<P>]
>;

interface TraitConstructor<
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
export type TraitConstructorAny = TraitConstructor<IPayloadAny, IPayloadAny>;

export interface Trait<
  CommandPayload extends IPayloadAny,
  SnapshotPayload extends IPayloadAny,
> {
  readonly entityId: EntityId;
  getType(): TraitConstructor<CommandPayload, SnapshotPayload>;
  getCommandMaybe(): MaybeAddMessageParameters<CommandPayload>;
}
export type TraitAny = Trait<IPayloadAny, IPayloadAny>;

class TraitStateApi {
  #map = new Map<TraitConstructorAny, Record<EntityId, TraitAny>>();
  add<CommandType extends IPayloadAny, SnapshotType extends IPayloadAny>(
    trait: Trait<CommandType, SnapshotType>,
  ) {
    const type = trait.constructor as TraitConstructorAny;
    const entityMap = this.#map.get(type) || {};
    entityMap[trait.entityId] = trait as TraitAny;
    this.#map.set(type, entityMap);
  }
  deleteEntity(eid: EntityId) {
    for (const map of Object.entries(this.#map)) {
      delete map[eid];
    }
  }
  *getAll() {
    for (const map of this.#map.values()) {
      for (const trait of Object.values(map)) {
        yield trait;
      }
    }
  }
  getTypes(): Iterable<TraitConstructorAny> {
    return this.#map.keys();
  }
  getTrait<
    CommandPayload extends IPayloadAny,
    SnapshotPayload extends IPayloadAny,
  >(type: TraitConstructor<CommandPayload, SnapshotPayload>, eid: EntityId) {
    return this.#map.get(type as TraitConstructorAny)![
      eid
    ] as Trait<CommandPayload, SnapshotPayload>;
  }
}

export const TraitState = new TraitStateApi();
