import { onlyServerGaurd } from "../env.ts";
import { EntityId, OpaqueType } from "./mod.ts";

export type NetworkId = number & OpaqueType<"networkId">;

export class Client {
  constructor(readonly nid: NetworkId, readonly ws: WebSocket, readonly connectTime: number) {}
}

interface _NetworkState {
  ws?: WebSocket;
  entityMap: Map<NetworkId, EntityId>;
  reverseMap: Map<EntityId, NetworkId>;
  localEntities: Set<EntityId>;
  nextNetworkId: NetworkId;
  startTime: number;
  connectedClients: Map<NetworkId, Client>;
  connectedClientsByWs: Map<WebSocket, Client>;
}

class NetworkStateApi {
  #state: _NetworkState = {
    entityMap: new Map(),
    reverseMap: new Map(),
    localEntities: new Set(),
    nextNetworkId: 0 as NetworkId,
    // TODO remove
    startTime: performance.now(),
    // TODO use array
    connectedClients: new Map<NetworkId, Client>(),
    // TODO use weakmap?
    connectedClientsByWs: new Map<WebSocket, Client>()
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

  isReady(): boolean {
    return !!this.#state.ws;
  }

  setClient(client: Client): void {
    onlyServerGaurd(() => {
      this.#state.connectedClients.set(client.nid, client);
      this.#state.connectedClientsByWs.set(client.ws, client);
    })
  }

  getClient(nid: NetworkId): Client | undefined {
    return this.#state.connectedClients.get(nid)
  }

  getClients(): IterableIterator<Client> {
    return this.#state.connectedClients.values()
  }

  getClientSockets(): IterableIterator<WebSocket> {
    return this.#state.connectedClientsByWs.keys()
  }

  getClientForSocket(ws: WebSocket) {
    return this.#state.connectedClientsByWs.get(ws)
  }

  removeClient(nid: NetworkId) {
    if(this.#state.connectedClients.has(nid)) {
      const client = this.#state.connectedClients.get(nid)!
      this.#state.connectedClients.delete(client.nid)
      this.#state.connectedClientsByWs.delete(client.ws)
    }
  }

  set socket(ws: WebSocket) {
    this.#state.ws = ws;
  }

  get maybeSocket() {
    return this.#state.ws;
  }
}

export const NetworkState = new NetworkStateApi();
