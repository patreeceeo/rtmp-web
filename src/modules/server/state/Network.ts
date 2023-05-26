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
  startTime?: Date;
}

interface IBCMessage {
  type: "createId";
  nid: NetworkId;
}

class ServerNetworkStateApi extends NetworkStateApi {
  #state: IServerNetworkState = {
    ...NetworkStateApi.init(),
    nextNetworkId: 0 as NetworkId,
    connectedClients: new Map(),
    connectedClientsByWs: new Map(),
  };

  bc = new BroadcastChannel("network");
  constructor() {
    super();
    this.bc.addEventListener("message", (e) => {
      this.handleBCMessage(e.data);
    });
  }

  handleBCMessage(msg: IBCMessage) {
    switch (msg.type) {
      case "createId":
        this.#state.nextNetworkId = Math.max(
          this.#state.nextNetworkId,
          msg.nid + 1,
        ) as NetworkId;
        console.log(
          "received createId message, nextNetworkId is now",
          this.#state.nextNetworkId,
        );
        break;
    }
  }

  createId(): NetworkId {
    const nid = this.#state.nextNetworkId;
    this.#state.nextNetworkId++;
    this.bc.postMessage({ type: "createId", nid });
    return nid;
  }

  setClient(client: Client): void {
    if (this.#state.connectedClients.has(client.nid)) {
      console.warn(`Client already exists with nid ${client.nid}`);
    }
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

  start() {
    this.#state.startTime = new Date();
  }

  get startTime() {
    return this.#state.startTime;
  }
}

export const ServerNetworkState = new ServerNetworkStateApi();
