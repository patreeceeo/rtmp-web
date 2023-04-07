import { InputState } from "../common/state/Input.ts";
import { SystemLoader } from "../common/systems/mod.ts";
import { OutputState } from "./state/Output.ts";

function exec() {
  if (InputState.pointerPositionIsDirty) {
    const { pointerPosition, canvasPointerPosition } = InputState;
    const {
      canvas: { resolution, clientRect },
    } = OutputState;
    const xScale = resolution.x / clientRect.width;
    const yScale = resolution.y / clientRect.height;
    canvasPointerPosition.set(
      (pointerPosition.x - clientRect.left) * xScale,
      (pointerPosition.y - clientRect.top) * yScale,
    );
    InputState.pointerPositionIsDirty = false;
  }
}
export const InputSystem: SystemLoader = () => {
  return { exec };
};
