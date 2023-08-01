import { EntityId } from "./Entity.ts";
import { join } from "./Iterable.ts";
import { OpaqueType } from "./util.ts";

// TODO reorganize this code

export type Uuid = number & OpaqueType<"uuid">;

export function networkId(nid: number) {
  return nid as Uuid;
}

export interface INetworkState {
  entityMap: Map<Uuid, EntityId>;
  reverseMap: Map<EntityId, Uuid>;
  localIds: Set<Uuid>;
  remoteIds: Set<Uuid>;
}

export class NetworkStateApi {
  static init(): INetworkState {
    return {
      entityMap: new Map(),
      reverseMap: new Map(),
      localIds: new Set(),
      remoteIds: new Set(),
    };
  }

  #state = NetworkStateApi.init();

  getEntityId(nid: Uuid): EntityId | undefined {
    return this.#state.entityMap.get(nid);
  }
  getId(eid: EntityId): Uuid | undefined {
    return this.#state.reverseMap.get(eid);
  }
  deleteId(nid: Uuid): void {
    const eid = this.#state.entityMap.get(nid)!;
    this.#state.entityMap.delete(nid);
    this.#state.reverseMap.delete(eid);
    this.#state.localIds.delete(nid);
    this.#state.remoteIds.delete(nid);
  }

  setNetworkEntity(nid: Uuid, eid: EntityId, isLocal: boolean) {
    this.#state.entityMap.set(nid, eid);
    this.#state.reverseMap.set(eid, nid);
    if (isLocal) {
      this.#state.localIds.add(nid);
    } else {
      this.#state.remoteIds.add(nid);
    }
  }

  getLocalIds() {
    return this.#state.localIds.values();
  }

  getRemoteIds() {
    return this.#state.remoteIds.values();
  }

  getAllIds() {
    return join(this.#state.localIds.values(), this.#state.remoteIds.values());
  }

  isLocal(nid: Uuid) {
    return this.#state.localIds.has(nid);
  }
}
