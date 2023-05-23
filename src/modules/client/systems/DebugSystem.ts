import { Button } from "../../common/Button.ts";
import { average, map } from "../../common/Iterable.ts";
import { InputState } from "../../common/state/Input.ts";
import { PingState } from "../../common/state/Ping.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";
import { DebugState } from "../state/Debug.ts";
import { OutputState } from "../state/Output.ts";

interface IConfig {
  windowDuration: number;
}

let lastExecuteTime = 0;

export const DebugSystem: SystemLoader<ISystemExecutionContext, [IConfig]> = (
  { windowDuration },
) => {
  let buttonWasPressed = false;
  function exec(context: ISystemExecutionContext) {
    const statsEl = document.getElementById("perf-stats")!;
    const fpsEl = statsEl.querySelector(".perf-stats-fps")!;
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
    buttonWasPressed = buttonIsPressed;

    if (DebugState.enabled) {
      const now = performance.now();
      const averageFrameRate = OutputState.frameCount * 1000 /
        (now - lastExecuteTime);
      const pingTimes = map(
        PingState.getReceived(now - windowDuration, now),
        (ping) => ping.roundTripTime,
      );
      const averagePingTime = average(pingTimes, 25);
      fpsEl.textContent = averageFrameRate.toFixed(2);
      pingEl.textContent = averagePingTime.toFixed(2);
      dropsEl.textContent = (PingState.dropCount / (context.elapsedTime / 1000))
        .toFixed(2);
      lastExecuteTime = now;
      OutputState.frameCount = 0;
    }
  }
  return { exec };
};
