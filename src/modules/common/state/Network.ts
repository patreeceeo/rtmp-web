import { onlyServerGaurd } from "../env.ts";
import { EntityId, OpaqueType } from "./mod.ts";

export type NetworkId = number & OpaqueType<"networkId">;

interface _NetworkState {
  ws?: WebSocket;
  entityMap: Map<NetworkId, EntityId>;
  reverseMap: Map<EntityId, NetworkId>;
  localEntities: Set<EntityId>;
  nextNetworkId: NetworkId;
}

class NetworkStateApi {
  #state: _NetworkState = {
    entityMap: new Map(),
    reverseMap: new Map(),
    localEntities: new Set(),
    nextNetworkId: 0 as NetworkId,
  };

  createId(): NetworkId {
    return onlyServerGaurd(() => {
      const nid = this.#state.nextNetworkId;
      this.#state.nextNetworkId++;
      return nid;
    });
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

  getEntityId(nid: NetworkId): EntityId | undefined {
    return this.#state.entityMap.get(nid);
  }
  getId(eid: EntityId): NetworkId | undefined {
    return this.#state.reverseMap.get(eid);
  }

  isReady() {
    return !!this.#state.ws;
  }

  set socket(ws: WebSocket) {
    this.#state.ws = ws;
  }

  get maybeSocket() {
    return this.#state.ws;
  }
}

export const NetworkState = new NetworkStateApi();
