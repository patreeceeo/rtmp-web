import { Button } from "../Button.ts";
import { Instance } from "../Vec2.ts";

export interface ButtonState {
  pressTime: number;
  releaseTime: number;
}
class InputStateApi {
  #buttonStateMap: Map<Button, ButtonState> = new Map();
  mousePosition = new Instance();
  mousePositionOnCanvas = new Instance();
  #initInput(button: Button) {
    this.#buttonStateMap.set(button, {
      pressTime: 0,
      releaseTime: 0,
    });
  }
  isButtonPressed(button: Button): boolean {
    if (this.#buttonStateMap.has(button)) {
      const keyState = this.#buttonStateMap.get(button);
      return keyState!.pressTime > keyState!.releaseTime;
    } else {
      return false;
    }
  }
  setButtonPressed(button: Button): void {
    if (!this.#buttonStateMap.has(button)) {
      this.#initInput(button);
    }
    this.#buttonStateMap.get(button)!.pressTime = performance.now();
  }
  setButtonReleased(button: Button): void {
    if (!this.#buttonStateMap.has(button)) {
      this.#initInput(button);
    }
    this.#buttonStateMap.get(button)!.releaseTime = performance.now();
  }
  reset() {
    this.#buttonStateMap.clear();
  }
}
export const InputState = new InputStateApi();
