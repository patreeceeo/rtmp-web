import { IMessageDef, IPayloadAny, IWritePayload } from "../Message.ts";
import { ISystemExecutionContext } from "../systems/mod.ts";
import { Uuid } from "../NetworkApi.ts";
import { EntityId, EntityPrefabCollection, IEntityMinimal } from "../Entity.ts";
import {
  EntityWithComponents,
  IAnyComponentType,
  IEntityMaximal,
} from "../Component.ts";

export type MaybeAddMessageParameters<P extends IPayloadAny> = [
  IMessageDef<P>,
  IWritePayload<P>,
] | null;

export interface ITraitConstructor<
  CommandPayload extends IPayloadAny,
  SnapshotPayload extends IPayloadAny,
  ComponentTypes extends ReadonlyArray<IAnyComponentType>,
> {
  new (
    entity: EntityWithComponents<ComponentTypes>,
  ): ITrait<CommandPayload, SnapshotPayload, ComponentTypes>;
  readonly components: ComponentTypes;
  readonly commandType: number;
  readonly snapshotType: number;
  readonly entities: EntityPrefabCollection<ComponentTypes>;
}
export type ITraitConstructorAny = ITraitConstructor<
  IPayloadAny,
  IPayloadAny,
  ReadonlyArray<IAnyComponentType>
>;

export interface ITrait<
  CommandPayload extends IPayloadAny,
  SnapshotPayload extends IPayloadAny,
  ComponentTypes extends ReadonlyArray<IAnyComponentType>,
> {
  readonly eid: EntityId;
  readonly entity: EntityWithComponents<ComponentTypes>;
  getType(): ITraitConstructor<CommandPayload, SnapshotPayload, ComponentTypes>;
  getCommandMaybe(
    context: ISystemExecutionContext,
  ): MaybeAddMessageParameters<CommandPayload>;
  getSnapshotMaybe(
    command: CommandPayload,
    context: ISystemExecutionContext,
  ): MaybeAddMessageParameters<SnapshotPayload>;
  shouldSendSnapshot(
    snapshot: SnapshotPayload,
    nidReceiver: Uuid,
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
export type TraitAny = ITrait<
  IPayloadAny,
  IPayloadAny,
  ReadonlyArray<IAnyComponentType>
>;

class TraitEntityMap {
  #map = new Map<ITraitConstructorAny, Record<EntityId, TraitAny>>();
  set<
    C extends IPayloadAny,
    P extends IPayloadAny,
    ComponentTypes extends ReadonlyArray<IAnyComponentType>,
  >(
    type: ITraitConstructor<C, P, ComponentTypes>,
    entity: EntityWithComponents<ComponentTypes>,
  ) {
    const trait = new type(entity);
    // deno-lint-ignore no-explicit-any
    const entityMap = this.#map.get(type as any) || {};
    // deno-lint-ignore no-explicit-any
    entityMap[trait.eid] = trait as any;
    // deno-lint-ignore no-explicit-any
    this.#map.set(type as any, entityMap);
  }
  get<
    C extends IPayloadAny,
    P extends IPayloadAny,
    ComponentTypes extends ReadonlyArray<IAnyComponentType>,
  >(
    type: ITraitConstructor<C, P, ComponentTypes>,
    eid: EntityId,
  ) {
    // deno-lint-ignore no-explicit-any
    const entityMap = this.#map.get(type as any) || {};
    return entityMap[eid] as unknown as
      | ITrait<C, P, ComponentTypes>
      | undefined;
  }
  deleteEntity(
    eid: EntityId,
  ) {
    for (const entityMap of this.#map.values()) {
      delete entityMap[eid];
    }
  }
  *getAll() {
    for (const map of this.#map.values()) {
      for (const trait of Object.values(map)) {
        yield trait;
      }
    }
  }
  getTraitTypes(): Iterable<ITraitConstructorAny> {
    return this.#map.keys();
  }
}

class TraitStateApi {
  #entityMap = new TraitEntityMap();
  #commandTypeMap = new Map<number, ITraitConstructorAny>();
  #snapshotTypeMap = new Map<number, ITraitConstructorAny>();
  add<
    CommandType extends IPayloadAny,
    SnapshotType extends IPayloadAny,
    ComponentTypes extends ReadonlyArray<IAnyComponentType>,
  >(
    type: ITraitConstructor<CommandType, SnapshotType, ComponentTypes>,
    entity: IEntityMinimal & Partial<IEntityMaximal>,
  ) {
    const entityWithComponents = type.entities.add(entity);
    this.#entityMap.set(type, entityWithComponents);
    // deno-lint-ignore no-explicit-any
    this.#commandTypeMap.set(type.commandType, type as any);
    // deno-lint-ignore no-explicit-any
    this.#snapshotTypeMap.set(type.snapshotType, type as any);
  }
  deleteEntity(eid: EntityId) {
    this.#entityMap.deleteEntity(eid);
  }
  getAll() {
    return this.#entityMap.getAll();
  }
  getTypes(): Iterable<ITraitConstructorAny> {
    return this.#entityMap.getTraitTypes();
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
    ComponentTypes extends ReadonlyArray<IAnyComponentType>,
  >(
    type: ITraitConstructor<CommandPayload, SnapshotPayload, ComponentTypes>,
    eid: EntityId,
  ) {
    return this.#entityMap.get(type, eid);
  }
}

export const TraitState = new TraitStateApi();
