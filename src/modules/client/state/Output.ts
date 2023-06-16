import { deferred } from "async";
import { Instance } from "~/common/Vec2.ts";
import { Tilemap } from "../../common/Tilemap.ts";
import {
  BodyDimensions,
  PoseComponent,
  PositionComponent,
  PreviousPositionComponent,
  SpriteSheetComponent,
  TargetPositionComponent,
} from "../../common/components.ts";
import { EntityPrefabCollection } from "../../common/Entity.ts";
import { isClient } from "../../common/env.ts";

interface ICanvasGradientParams {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  stops: Array<[number, string]>;
}

class SceneData {
  readonly gradients = new Map<string, ICanvasGradientParams>();
  readonly paths = new Map<string, Path2D>();
  readonly tiles = new Tilemap();
}

// TODO key/button/axis enum
class OutputStateApi {
  ready = deferred<void>();
  foreground = {
    clientRect: new DOMRect(),
    context2d: null as (CanvasRenderingContext2D | null),
    element: null as HTMLCanvasElement | null,
    resolution: new Instance(),
  };
  background = {
    context2d: null as (CanvasRenderingContext2D | null),
    element: null as HTMLCanvasElement | null,
    resolution: new Instance(),
  };
  scene = new SceneData();
  frameCount = 0;
  readonly components = [
    PositionComponent,
    PreviousPositionComponent,
    TargetPositionComponent,
    BodyDimensions,
    SpriteSheetComponent,
    PoseComponent,
  ] as const;
  readonly entities = new EntityPrefabCollection(this.components);
}

export const OutputState = isClient
  ? new OutputStateApi()
  : null as unknown as OutputStateApi;
