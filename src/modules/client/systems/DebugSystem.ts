import { Button } from "../../common/Button.ts";
import { InputState } from "../../common/state/Input.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { DebugState } from "../state/Debug.ts";

export const DebugSystem: SystemLoader = () => {
  let buttonWasPressed = false;
  function exec() {
    const buttonIsPressed = InputState.isButtonPressed(Button.KeyH) &&
      InputState.isButtonPressed(Button.ShiftLeft);
    if (buttonIsPressed && !buttonWasPressed) {
      DebugState.enabled = !DebugState.enabled;
      console.log(
        DebugState.enabled ? "Debug helpers enabled" : "Debug helpers disabled",
      );
    }
    buttonWasPressed = buttonIsPressed;
  }
  return { exec };
};
