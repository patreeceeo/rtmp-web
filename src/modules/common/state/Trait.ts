import { EntityId } from "./mod.ts";
import { Maybe } from "../Maybe.ts";
import { IMessageDef, IPayloadAny, IWritePayload } from "../Message.ts";
import { ISystemExecutionContext } from "../systems/mod.ts";
import { NetworkId } from "../NetworkApi.ts";

export type MaybeAddMessageParameters<P extends IPayloadAny> = Maybe<
  [IMessageDef<P>, IWritePayload<P>]
>;

export interface ITraitConstructor<
  CommandPayload extends IPayloadAny,
  SnapshotPayload extends IPayloadAny,
> {
  new (eid: EntityId): Trait<CommandPayload, SnapshotPayload>;
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
  getCommandMaybe(
    context: ISystemExecutionContext,
  ): MaybeAddMessageParameters<CommandPayload>;
  getSnapshotMaybe(
    command: CommandPayload,
    context: ISystemExecutionContext,
  ): MaybeAddMessageParameters<SnapshotPayload>;
  shouldSendSnapshot(
    snapshot: SnapshotPayload,
    nidReceiver: NetworkId,
  ): boolean;
  shouldApplySnapshot(
    payload: SnapshotPayload,
    context: ISystemExecutionContext,
  ): boolean;
  applyCommand(payload: CommandPayload, context: ISystemExecutionContext): void;
  applySnapshot(
    payload: SnapshotPayload,
    context: ISystemExecutionContext,
  ): void;
}
export type TraitAny = Trait<IPayloadAny, IPayloadAny>;

class TraitStateApi {
  #instanceMap = new Map<ITraitConstructorAny, Record<EntityId, TraitAny>>();
  #commandTypeMap = new Map<number, ITraitConstructorAny>();
  #snapshotTypeMap = new Map<number, ITraitConstructorAny>();
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
    this.#commandTypeMap.set(type.commandType, type as ITraitConstructorAny);
    this.#snapshotTypeMap.set(type.snapshotType, type as ITraitConstructorAny);
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
  getTypeByCommandType(commandType: number) {
    return this.#commandTypeMap.get(commandType);
  }
  getTypeBySnapshotType(commandType: number) {
    return this.#snapshotTypeMap.get(commandType);
  }
  getTrait<
    CommandPayload extends IPayloadAny,
    SnapshotPayload extends IPayloadAny,
  >(type: ITraitConstructor<CommandPayload, SnapshotPayload>, eid: EntityId) {
    return this.#instanceMap.get(type as ITraitConstructorAny)![
      eid
    ] as Trait<CommandPayload, SnapshotPayload> | undefined;
  }
}

export const TraitState = new TraitStateApi();
