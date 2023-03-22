import { INetworkState, NetworkId, NetworkStateApi } from "../../common/state/Network.ts";

export class Client {
  #nids = new Set<NetworkId>()
  constructor(readonly nid: NetworkId, readonly ws: WebSocket) {}
  addNid(nid: NetworkId) {
    this.#nids.add(nid)
  }
  hasNid(nid: NetworkId) {
    return this.#nids.has(nid)
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
    connectedClientsByWs: new Map()
  }

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
}

export const ServerNetworkState = new ServerNetworkStateApi()
