import { Box } from "../Box.ts";
import { Tilemap } from "~/common/Tilemap.ts";
import { Instance } from "../Vec2.ts";

/** A literal cloud, lol */
export interface ICloud {
  position: Instance;
  size: Instance;
}

class LevelStateApi {
  readonly dimensions = new Box();
  readonly landscape: Array<Instance> = [];
  readonly farClouds: Array<ICloud> = [];
  readonly nearClouds: Array<ICloud> = [];
  map?: Tilemap;
}

export const LevelState = new LevelStateApi();
