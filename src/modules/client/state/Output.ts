import { deferred } from "async";
import { Vec2, Vec2LargeType } from "~/common/Vec2.ts";
import * as ECS from "bitecs";

interface ICanvasGradientParams {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  stops: Array<[number, string]>;
}

export const PreviousPositionStore = ECS.defineComponent(Vec2LargeType);

// TODO key/button/axis enum
class OutputStateApi {
  ready = deferred<void>();
  foreground = {
    clientRect: new DOMRect(),
    context2d: null as (CanvasRenderingContext2D | null),
    element: null as HTMLCanvasElement | null,
    resolution: new Vec2(),
  };
  background = {
    context2d: null as (CanvasRenderingContext2D | null),
    element: null as HTMLCanvasElement | null,
    resolution: new Vec2(),
  };
  readonly gradients = new Map<string, ICanvasGradientParams>();
  readonly paths = new Map<string, Path2D>();
  frameCount = 0;
}

export const OutputState = new OutputStateApi();
