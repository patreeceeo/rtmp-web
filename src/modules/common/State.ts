

export interface InputState {
  pressTime: number;
  releaseTime: number;
}

interface _AppState {
  ws?: WebSocket;
  loaded: boolean;
}

class AppStateApi {
  #state: _AppState = {
    loaded: false,
  };

  isLoaded() {
    return this.#state.loaded
  }

  setLoaded(ws: WebSocket) {
    this.#state.loaded = true
    this.#state.ws = ws
  }

  get socket () {
    return this.#state.ws
  }
}

export const AppState = new AppStateApi();

type _InputState = Map<string, InputState>

class InputStateApi {
  #state: _InputState = new Map();
  #idKey(code: KeyboardEvent["code"]): string {
    return `kbd:${code}`
  }
  #initInput(id: string) {
    this.#state.set(id, {
      pressTime: 0,
      releaseTime: 0,
    });
  }
  isKeyPressed(code: KeyboardEvent["code"]): boolean {
    const id = this.#idKey(code)
    if(this.#state.has(id)) {
      const keyState = this.#state.get(id)
      return keyState!.pressTime > keyState!.releaseTime;
    } else {
      return false
    }
  }
  setKeyPressed(code: KeyboardEvent["code"]): void {
    const id = this.#idKey(code)
    if(!this.#state.has(id)) {
      this.#initInput(id)
    }
    this.#state.get(id)!.pressTime = Date.now();
  }
  setKeyReleased(code: KeyboardEvent["code"]): void {
    const id = this.#idKey(code)
    if(!this.#state.has(id)) {
      this.#initInput(id)
    }
    this.#state.get(id)!.releaseTime = Date.now();
  }
}

export const InputState = new InputStateApi();
