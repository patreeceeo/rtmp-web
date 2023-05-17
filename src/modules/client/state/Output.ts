import { deferred } from "async";
import { Vec2 } from "~/common/Vec2.ts";

// TODO key/button/axis enum
class OutputStateApi {
  ready = deferred<void>();
  canvas = {
    clientRect: new DOMRect(),
    context2d: null as (CanvasRenderingContext2D | null),
    element: null as HTMLElement | null,
    resolution: new Vec2(),
  };
}

export const OutputState = new OutputStateApi();
