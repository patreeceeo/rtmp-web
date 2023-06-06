import { Box } from "../Box.ts";
import { Tilemap } from "~/common/Tilemap.ts";
import { Vec2 } from "../Vec2.ts";

/** A literal cloud, lol */
export interface ICloud {
  position: Vec2;
  size: Vec2;
}

class LevelStateApi {
  readonly dimensions = new Box();
  readonly landscape: Array<Vec2> = [];
  readonly farClouds: Array<ICloud> = [];
  readonly nearClouds: Array<ICloud> = [];
  map?: Tilemap;
}

export const LevelState = new LevelStateApi();
