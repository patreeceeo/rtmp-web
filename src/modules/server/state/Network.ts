import {
  addEntity,
  EntityId,
  EntityPrefabCollection,
} from "~/common/Entity.ts";
import {
  INetworkState,
  NetworkStateApi,
  Uuid,
} from "../../common/NetworkApi.ts";
import { ClientTag, UuidComponent } from "~/common/components.ts";
import { LastActiveTimeComponent } from "~/common/components.ts";
import { removeComponent } from "~/common/Component.ts";
import { invariant } from "~/common/Error.ts";
import { EntityWithComponents } from "~/common/EntityWithComponents.ts";

export type ClientEntity = EntityWithComponents<
  typeof CLIENT_ENTITY_COMPONENTS
>;

export const CLIENT_ENTITY_COMPONENTS = [
  UuidComponent,
  LastActiveTimeComponent,
  ClientTag,
];

interface IServerNetworkState extends INetworkState {
  nextNetworkId: Uuid;
  clientsByWs: Map<WebSocket, EntityId>;
  clientsByUuid: Map<Uuid, EntityId>;
  childrenByUuid: Map<Uuid, Set<Uuid>>;
  wsByClient: Map<EntityId, WebSocket>;
  clients: EntityPrefabCollection<typeof CLIENT_ENTITY_COMPONENTS>;
  startTime?: Date;
}

class ServerNetworkStateApi extends NetworkStateApi {
  #state: IServerNetworkState = {
    ...NetworkStateApi.init(),
    nextNetworkId: 0 as Uuid,
    clientsByWs: new Map(),
    clientsByUuid: new Map(),
    childrenByUuid: new Map(),
    wsByClient: new Map(),
    clients: new EntityPrefabCollection(CLIENT_ENTITY_COMPONENTS),
  };

  createId(): Uuid {
    const nid = this.#state.nextNetworkId;
    this.#state.nextNetworkId++;
    return nid;
  }

  hasClient(uuid: Uuid): boolean {
    return this.#state.clientsByUuid.has(uuid);
  }

  addClient(ws: WebSocket, uuid: Uuid): ClientEntity {
    const entity = this.#state.clients.add(addEntity());
    entity.uuid = uuid;
    this.#state.clientsByWs.set(ws, entity.eid);
    this.#state.clientsByUuid.set(uuid, entity.eid);
    this.#state.wsByClient.set(entity.eid, ws);
    return entity;
  }

  addChild(client: Uuid, child: Uuid) {
    let children = this.#state.childrenByUuid.get(client);
    if (!children) {
      children = new Set();
      this.#state.childrenByUuid.set(client, children);
    }
    children.add(child);
  }

  removeChild(client: Uuid, child: Uuid) {
    const children = this.#state.childrenByUuid.get(client);
    if (children) {
      children.delete(child);
    }
  }

  *getChildren(client: Uuid): IterableIterator<Uuid> {
    const children = this.#state.childrenByUuid.get(client);
    if (children) {
      yield* children;
    }
  }

  getClient(uuid: Uuid): ClientEntity | undefined {
    const eid = this.#state.clientsByUuid.get(uuid);
    invariant(eid !== undefined, `No client with uuid ${uuid}`);
    return this.#state.clients.get(eid!);
  }

  *getClients(includeSoftDeleted = false): IterableIterator<ClientEntity> {
    for (const client of this.#state.clients.query()) {
      if (!client.isSoftDeleted || includeSoftDeleted) {
        yield client;
      }
    }
  }

  *getClientSockets(includeSoftDeleted = false): IterableIterator<WebSocket> {
    for (const client of this.#state.clients.query()) {
      if (!client.isSoftDeleted || includeSoftDeleted) {
        yield this.#state.wsByClient.get(client.eid)!;
      }
    }
  }

  getClientForSocket(ws: WebSocket): ClientEntity | undefined {
    return this.#state.clients.get(this.#state.clientsByWs.get(ws)!);
  }

  getClientSocket(uuid: Uuid): WebSocket | undefined {
    const eid = this.#state.clientsByUuid.get(uuid)!;
    invariant(eid !== undefined, `No client with uuid ${uuid}`);
    return this.#state.wsByClient.get(eid);
  }

  removeClient(uuid: Uuid): void {
    const { clientsByUuid, clientsByWs, wsByClient } = this.#state;
    const eid = clientsByUuid.get(uuid)!;
    invariant(eid !== undefined, `No client with uuid ${uuid}`);
    clientsByWs.delete(wsByClient.get(eid)!);
    clientsByUuid.delete(uuid);
    wsByClient.delete(eid);
    removeComponent(ClientTag, this.#state.clients.get(eid)!);
  }

  start() {
    this.#state.startTime = new Date();
  }

  get startTime() {
    return this.#state.startTime;
  }
}

export const ServerNetworkState = new ServerNetworkStateApi();
