import { INetworkState, NetworkStateApi } from "../../common/NetworkApi.ts";

interface IClientNetworkState extends INetworkState {
  ws?: WebSocket;
}

class ClientNetworkStateApi extends NetworkStateApi {
  #state: IClientNetworkState = NetworkStateApi.init();

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
