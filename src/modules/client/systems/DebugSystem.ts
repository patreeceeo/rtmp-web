import { Button } from "../../common/Button.ts";
import { InputState } from "../../common/state/Input.ts";
import { PingState } from "../../common/state/Ping.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { DebugState } from "../state/Debug.ts";

export const DebugSystem: SystemLoader = () => {
  let buttonWasPressed = false;
  function exec() {
    const statsEl = document.getElementById("perf-stats")!;
    const pingEl = statsEl.querySelector(".perf-stats-ping")!;
    const dropsEl = statsEl.querySelector(".perf-stats-drops")!;
    const buttonIsPressed = InputState.isButtonPressed(Button.KeyH) &&
      InputState.isButtonPressed(Button.ShiftLeft);
    if (buttonIsPressed && !buttonWasPressed) {
      DebugState.enabled = !DebugState.enabled;
      console.log(
        DebugState.enabled ? "Debug helpers enabled" : "Debug helpers disabled",
      );
      statsEl.style.display = DebugState.enabled ? "block" : "none";
      statsEl;
    }
    pingEl.textContent = PingState.pingTime.toFixed(2);
    dropsEl.textContent = (PingState.dropCount / performance.now() * 1000)
      .toFixed(2);
    buttonWasPressed = buttonIsPressed;
  }
  return { exec };
};
