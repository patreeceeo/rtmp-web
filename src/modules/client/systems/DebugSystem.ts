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
  fpsStatTimeFrame: number;
  pingStatTimeFrame: number;
}

let lastPingExecuteTime = 0;
let lastFpsExecuteTime = 0;
let lastMpsExecuteTime = 0;
let wasEnabled = false;

export const DebugSystem: SystemLoader<ISystemExecutionContext, [IConfig]> =
  async (
    { pingStatTimeFrame, fpsStatTimeFrame },
  ) => {
    let buttonWasPressed = false;

    await new Promise<void>((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve());
      setTimeout(() => resolve(), 1000);
    });
    const statsEl = document.getElementById("perf-stats")!;
    const fpsEl = statsEl.querySelector(".perf-stats-fps")!;
    const pingEl = statsEl.querySelector(".perf-stats-ping")!;
    const dropsEl = statsEl.querySelector(".perf-stats-drops")!;
    const mpsEl = statsEl.querySelector(".perf-stats-mps")!;

    function exec(context: ISystemExecutionContext) {
      const buttonIsPressed = InputState.isButtonPressed(Button.KeyH) &&
        InputState.isButtonPressed(Button.ShiftLeft);
      if (buttonIsPressed && !buttonWasPressed) {
        DebugState.enabled = !DebugState.enabled;
      }
      if (DebugState.enabled !== wasEnabled) {
        console.log(
          DebugState.enabled
            ? "Debug helpers enabled"
            : "Debug helpers disabled",
        );
        statsEl.style.display = DebugState.enabled ? "block" : "none";
      }
      buttonWasPressed = buttonIsPressed;
      wasEnabled = DebugState.enabled;

      if (DebugState.enabled) {
        const now = performance.now();
        if (now - lastFpsExecuteTime >= fpsStatTimeFrame / 2) {
          const averageFrameRate = OutputState.frameCount * 1000 /
            (now - lastFpsExecuteTime);
          setTextContent(fpsEl, averageFrameRate.toFixed(2));
          lastFpsExecuteTime = now;
          OutputState.frameCount = 0;
        }
        if (now - lastPingExecuteTime >= pingStatTimeFrame / 2) {
          const pingTimes = map(
            PingState.getReceived(now - pingStatTimeFrame, now),
            (ping) => ping.roundTripTime,
          );
          const averagePingTime = average(pingTimes, 25);
          setTextContent(pingEl, averagePingTime.toFixed(2));
          setTextContent(
            dropsEl,
            (PingState.dropCount / (context.elapsedTime / 1000))
              .toFixed(2),
          );
          lastPingExecuteTime = now;
        }

        if (now - lastMpsExecuteTime >= 1000) {
          setTextContent(mpsEl, DebugState.messageSinceLastFrame.toFixed(2));
          lastMpsExecuteTime = now;
          DebugState.messageSinceLastFrame = 0;
        }
      }
    }

    return { exec };
  };

function setTextContent(el: Element, text: string) {
  if (el.textContent !== text) {
    const node = el.childNodes.length > 0 ? el.childNodes[0] : el;
    node.textContent = text;
  }
}
