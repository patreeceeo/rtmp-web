


interface _NetworkState {
  ws?: WebSocket;
}

class NetworkStateApi {
  #state: _NetworkState = {};

  isReady() {
    return !!this.#state.ws
  }

  set socket (ws: WebSocket) {
    this.#state.ws = ws
  }

  get maybeSocket () {
    return this.#state.ws
  }
}

export const NetworkState = new NetworkStateApi();
