import { Button } from "../../common/Button.ts";
import { average, map } from "../../common/Iterable.ts";
import { InputState } from "../../common/state/Input.ts";
import { PingState } from "../../common/state/Ping.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";
import { pageLoad } from "~/client/mod.ts";
import { DebugState } from "../state/Debug.ts";
import { OutputState } from "../state/Output.ts";
import { routeEditorEntity } from "~/common/routes.ts";
import { copy, set } from "~/common/Vec2.ts";
import { castEntity } from "~/common/Entity.ts";
import {
  EditorDraggingTag,
  TargetPositionComponent,
} from "~/common/components.ts";
import {
  addComponent,
  hasComponent,
  removeComponent,
} from "~/common/Component.ts";

interface IConfig {
  fpsStatTimeFrame: number;
  pingStatTimeFrame: number;
}

let lastPingExecuteTime = 0;
let lastFpsExecuteTime = 0;
let lastMpsExecuteTime = 0;
let wasEnabled = false;

export const DebugSystem: SystemLoader<
  ISystemExecutionContext,
  [IConfig]
> = async ({ pingStatTimeFrame, fpsStatTimeFrame }) => {
  let buttonWasPressed = false;

  await pageLoad();

  const statsEl = document.getElementById("perf-stats")!;
  const fpsEl = statsEl.querySelector(".perf-stats-fps")!;
  const pingEl = statsEl.querySelector(".perf-stats-ping")!;
  const dropsEl = statsEl.querySelector(".perf-stats-drops")!;
  const mpsSentEl = statsEl.querySelector(".perf-stats-mps-sent")!;
  const mpsRecvEl = statsEl.querySelector(".perf-stats-mps-recv")!;

  function exec(context: ISystemExecutionContext) {
    const buttonIsPressed = InputState.isButtonPressed(Button.KeyH) &&
      InputState.isButtonPressed(Button.ShiftLeft);
    if (buttonIsPressed && !buttonWasPressed) {
      DebugState.enabled = !DebugState.enabled;
    }
    if (DebugState.enabled !== wasEnabled) {
      console.log(
        DebugState.enabled ? "Debug helpers enabled" : "Debug helpers disabled",
      );
      statsEl.style.display = DebugState.enabled ? "block" : "none";
    }
    buttonWasPressed = buttonIsPressed;
    wasEnabled = DebugState.enabled;

    if (DebugState.enabled) {
      const now = performance.now();
      if (now - lastFpsExecuteTime >= fpsStatTimeFrame / 2) {
        const averageFrameRate = (OutputState.frameCount * 1000) /
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
          (PingState.dropCount / (context.elapsedTime / 1000)).toFixed(2),
        );
        lastPingExecuteTime = now;
      }

      if (now - lastMpsExecuteTime >= 1000) {
        setTextContent(
          mpsSentEl,
          DebugState.messageSentSinceLastFrame.toFixed(2),
        );
        setTextContent(
          mpsRecvEl,
          DebugState.messageReceivedSinceLastFrame.toFixed(2),
        );
        lastMpsExecuteTime = now;
        DebugState.messageSentSinceLastFrame = 0;
        DebugState.messageReceivedSinceLastFrame = 0;
      }

      for (const entity of DebugState.clickableEntities.query()) {
        const { position, bodyDimensions } = entity;
        const xPx = position.x >> 8;
        const xPy = position.y >> 8;
        const w2 = bodyDimensions.x >> 1;
        const h2 = bodyDimensions.y >> 1;
        if (
          InputState.mousePositionOnCanvas.x >= xPx - w2 &&
          InputState.mousePositionOnCanvas.x <= xPx + w2 &&
          InputState.mousePositionOnCanvas.y >= xPy - h2 &&
          InputState.mousePositionOnCanvas.y <= xPy + h2
        ) {
          document.body.style.cursor = "pointer";
          if (InputState.wasButtonClicked(Button.Mouse0)) {
            window.open(routeEditorEntity.format(entity.uuid));
          }
          if (InputState.isButtonPressed(Button.Mouse0)) {
            addComponent(EditorDraggingTag, entity);
          }
        } else {
          document.body.style.cursor = "default";
        }
      }

      if (!InputState.isButtonPressed(Button.Mouse0)) {
        for (const entity of DebugState.draggingEntities.query()) {
          removeComponent(EditorDraggingTag, entity);
          document.body.style.cursor = "default";
        }
      } else {
        for (const entity of DebugState.draggingEntities.query()) {
          document.body.style.cursor = "grabbing";
          set(
            entity.position,
            InputState.mousePositionOnCanvas.x << 8,
            InputState.mousePositionOnCanvas.y << 8,
          );
          if (hasComponent(TargetPositionComponent, entity)) {
            copy(
              castEntity(entity, [TargetPositionComponent]).targetPosition,
              entity.position,
            );
          }
        }
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
