import {
  INetworkState,
  NetworkStateApi,
  Uuid,
} from "../../common/NetworkApi.ts";

export class Client {
  #nids = new Set<Uuid>();
  lastActiveTime = -Infinity;
  isBeingRemoved = false;
  constructor(readonly nid: Uuid, readonly ws: WebSocket) {}
  addNetworkId(nid: Uuid) {
    this.#nids.add(nid);
  }
  hasNetworkId(nid: Uuid) {
    return this.#nids.has(nid);
  }
  getNetworkIds() {
    return this.#nids.keys();
  }
}

interface IServerNetworkState extends INetworkState {
  nextNetworkId: Uuid;
  // TODO use array?
  connectedClients: Map<Uuid, Client>;
  // TODO use weakmap?
  connectedClientsByWs: Map<WebSocket, Client>;
  startTime?: Date;
}

class ServerNetworkStateApi extends NetworkStateApi {
  #state: IServerNetworkState = {
    ...NetworkStateApi.init(),
    nextNetworkId: 0 as Uuid,
    connectedClients: new Map(),
    connectedClientsByWs: new Map(),
  };

  createId(): Uuid {
    const nid = this.#state.nextNetworkId;
    this.#state.nextNetworkId++;
    return nid;
  }

  setClient(client: Client): void {
    if (this.#state.connectedClients.has(client.nid)) {
      console.warn(`Client already exists with nid ${client.nid}`);
    }
    this.#state.connectedClients.set(client.nid, client);
    this.#state.connectedClientsByWs.set(client.ws, client);
  }

  getClient(nid: Uuid): Client | undefined {
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

  removeClient(nid: Uuid) {
    if (this.#state.connectedClients.has(nid)) {
      const client = this.#state.connectedClients.get(nid)!;
      this.#state.connectedClients.delete(client.nid);
      this.#state.connectedClientsByWs.delete(client.ws);
    }
  }

  start() {
    this.#state.startTime = new Date();
  }

  get startTime() {
    return this.#state.startTime;
  }
}

export const ServerNetworkState = new ServerNetworkStateApi();
