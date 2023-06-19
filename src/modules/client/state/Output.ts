import { deferred } from "async";
import { Instance } from "~/common/Vec2.ts";
import {
  BodyDimensions,
  BodyStaticTag,
  ImageCollectionComponent,
  ImageIdComponent,
  PoseComponent,
  PositionComponent,
  PreviousPositionComponent,
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
  readonly dynamicEntityComponents = [
    PositionComponent,
    PreviousPositionComponent,
    TargetPositionComponent,
    BodyDimensions,
    ImageCollectionComponent,
    PoseComponent,
  ] as const;
  readonly staticEntityComponents = [
    BodyStaticTag,
    PositionComponent,
    BodyDimensions,
    ImageIdComponent,
  ] as const;
  readonly dynamicEntities = new EntityPrefabCollection(
    this.dynamicEntityComponents,
  );
  readonly staticEntities = new EntityPrefabCollection(
    this.staticEntityComponents,
  );
}

export const OutputState = isClient
  ? new OutputStateApi()
  : null as unknown as OutputStateApi;
