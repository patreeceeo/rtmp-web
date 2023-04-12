import { InputState } from "../common/state/Input.ts";
import { SystemLoader } from "../common/systems/mod.ts";
import { OutputState } from "./state/Output.ts";

// TODO move to ./systems
function exec() {
  if (InputState.mousePositionIsDirty) {
    const { mousePosition, mousePositionOnCanvas } = InputState;
    const {
      canvas: { resolution, clientRect },
    } = OutputState;
    const xScale = resolution.x / clientRect.width;
    const yScale = resolution.y / clientRect.height;
    mousePositionOnCanvas.set(
      (mousePosition.x - clientRect.left) * xScale,
      (mousePosition.y - clientRect.top) * yScale,
    );
    InputState.mousePositionIsDirty = false;
  }
}
export const InputSystem: SystemLoader = () => {
  return { exec };
};
