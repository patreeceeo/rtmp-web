import { EntityId } from "./state/mod.ts";
import { OpaqueType } from "./state/mod.ts";

// TODO reorganize this code

export type NetworkId = number & OpaqueType<"networkId">;

export function networkId(nid: number) {
  return nid as NetworkId;
}

export interface INetworkState {
  entityMap: Map<NetworkId, EntityId>;
  reverseMap: Map<EntityId, NetworkId>;
  localEntities: Set<EntityId>;
}

export class NetworkStateApi {
  static init(): INetworkState {
    return {
      entityMap: new Map(),
      reverseMap: new Map(),
      localEntities: new Set(),
    };
  }

  #state = NetworkStateApi.init();

  getEntityId(nid: NetworkId): EntityId | undefined {
    return this.#state.entityMap.get(nid);
  }
  getId(eid: EntityId): NetworkId | undefined {
    return this.#state.reverseMap.get(eid);
  }
  deleteId(nid: NetworkId): void {
    const eid = this.#state.entityMap.get(nid)!;
    this.#state.entityMap.delete(nid);
    this.#state.reverseMap.delete(eid);
    this.#state.localEntities.delete(eid);
  }

  setNetworkEntity(nid: NetworkId, eid: EntityId, isLocal: boolean) {
    this.#state.entityMap.set(nid, eid);
    this.#state.reverseMap.set(eid, nid);
    if (isLocal) {
      this.#state.localEntities.add(eid);
    }
  }

  isLocalEntity(eid: EntityId) {
    return this.#state.localEntities.has(eid);
  }

  isLocal(nid: NetworkId) {
    const eid = this.getEntityId(nid);
    return this.isLocalEntity(eid!);
  }
}
