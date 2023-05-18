import { deferred } from "async";
import { Vec2 } from "~/common/Vec2.ts";

interface ICanvasGradientParams {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  stops: Array<[number, string]>;
}

// TODO key/button/axis enum
class OutputStateApi {
  ready = deferred<void>();
  canvas = {
    clientRect: new DOMRect(),
    context2d: null as (CanvasRenderingContext2D | null),
    element: null as HTMLElement | null,
    resolution: new Vec2(),
  };
  readonly gradients = new Map<string, ICanvasGradientParams>();
  readonly paths = new Map<string, Path2D>();
}

export const OutputState = new OutputStateApi();
