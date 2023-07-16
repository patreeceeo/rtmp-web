import { EntityPrefabCollection } from "~/common/Entity.ts";
import { INetworkState, NetworkStateApi } from "../../common/NetworkApi.ts";
import {
  PreviousTargetPositionComponent_Network,
  TargetPositionComponent,
} from "~/common/components.ts";

interface IClientNetworkState extends INetworkState {
  ws?: WebSocket;
}

class ClientNetworkStateApi extends NetworkStateApi {
  #state: IClientNetworkState = NetworkStateApi.init();

  positionEntities = new EntityPrefabCollection([
    PreviousTargetPositionComponent_Network,
    TargetPositionComponent,
  ]);

  isReady(): boolean {
    return !!this.#state.ws;
  }

  set socket(ws: WebSocket) {
    this.#state.ws = ws;
  }

  get maybeSocket() {
    return this.#state.ws;
  }
}

export const ClientNetworkState = new ClientNetworkStateApi();
