import {
  INetworkState,
  NetworkId,
  NetworkStateApi,
} from "../../common/NetworkApi.ts";

export class Client {
  #nids = new Set<NetworkId>();
  lastActiveTime = -Infinity;
  isBeingRemoved = false;
  constructor(readonly nid: NetworkId, readonly ws: WebSocket) {}
  addNetworkId(nid: NetworkId) {
    this.#nids.add(nid);
  }
  hasNetworkId(nid: NetworkId) {
    return this.#nids.has(nid);
  }
  getNetworkIds() {
    return this.#nids.keys();
  }
}

interface IServerNetworkState extends INetworkState {
  nextNetworkId: NetworkId;
  // TODO use array?
  connectedClients: Map<NetworkId, Client>;
  // TODO use weakmap?
  connectedClientsByWs: Map<WebSocket, Client>;
}

class ServerNetworkStateApi extends NetworkStateApi {
  #state: IServerNetworkState = {
    ...NetworkStateApi.init(),
    nextNetworkId: 0 as NetworkId,
    connectedClients: new Map(),
    connectedClientsByWs: new Map(),
  };

  createId(): NetworkId {
    const nid = this.#state.nextNetworkId;
    this.#state.nextNetworkId++;
    return nid;
  }

  setClient(client: Client): void {
    this.#state.connectedClients.set(client.nid, client);
    this.#state.connectedClientsByWs.set(client.ws, client);
  }

  getClient(nid: NetworkId): Client | undefined {
    return this.#state.connectedClients.get(nid);
  }

  *getClients(includeBeingRemoved = false): IterableIterator<Client> {
    for (const client of this.#state.connectedClients.values()) {
      if (!client.isBeingRemoved || includeBeingRemoved) {
        yield client;
      }
    }
  }

  *getClientSockets(includeBeingRemoved = false): IterableIterator<WebSocket> {
    for (const client of this.getClients(includeBeingRemoved)) {
      yield client.ws;
    }
  }

  getClientForSocket(ws: WebSocket) {
    return this.#state.connectedClientsByWs.get(ws);
  }

  removeClient(nid: NetworkId) {
    if (this.#state.connectedClients.has(nid)) {
      const client = this.#state.connectedClients.get(nid)!;
      this.#state.connectedClients.delete(client.nid);
      this.#state.connectedClientsByWs.delete(client.ws);
    }
  }
}

export const ServerNetworkState = new ServerNetworkStateApi();
