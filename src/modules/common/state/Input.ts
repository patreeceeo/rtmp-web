export interface Input {
  pressTime: number;
  releaseTime: number;
}
type _InputState = Map<string, Input>

// TODO key/button/axis enum
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
