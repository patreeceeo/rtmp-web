import * as Vec2 from "~/common/Vec2.ts";
import { InputState } from "~/common/state/Input.ts";
import {
  IEventSystemExecutionContext,
  SystemLoader,
} from "~/common/systems/mod.ts";
import { mouseButton } from "../../common/Button.ts";
import { OutputState } from "../state/Output.ts";

function exec(context: IEventSystemExecutionContext) {
  const e = context.event;
  switch (e.type) {
    case "keydown":
      // deno-lint-ignore no-explicit-any
      InputState.setButtonPressed((e as KeyboardEvent).code as any);
      break;
    case "keyup":
      // deno-lint-ignore no-explicit-any
      InputState.setButtonReleased((e as KeyboardEvent).code as any);
      break;
    case "mousedown":
      InputState.setButtonPressed(mouseButton((e as MouseEvent).button));
      break;
    case "mouseup":
      InputState.setButtonReleased(mouseButton((e as MouseEvent).button));
      break;
    case "mousemove": {
      const me = e as MouseEvent;
      const { mousePosition, mousePositionOnCanvas } = InputState;
      const {
        foreground: { resolution, clientRect },
      } = OutputState;
      Vec2.set(mousePosition, me.clientX, me.clientY);
      const xScale = resolution.x / clientRect.width;
      const yScale = resolution.y / clientRect.height;
      Vec2.set(
        mousePositionOnCanvas,
        (mousePosition.x - clientRect.left) * xScale,
        (mousePosition.y - clientRect.top) * yScale,
      );
    }
  }
}
export const InputSystem: SystemLoader<IEventSystemExecutionContext> = () => {
  return { exec };
};
