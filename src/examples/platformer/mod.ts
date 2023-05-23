import { SUBPIXEL_SCALE } from "../../modules/common/constants.ts";
import { LevelState } from "../../modules/common/state/LevelState.ts";

export const SCREEN_WIDTH_PX = 512;
export const SCREEN_HEIGHT_PX = 512;

LevelState.dimensions.set(
  0,
  0,
  SCREEN_WIDTH_PX * SUBPIXEL_SCALE,
  SCREEN_HEIGHT_PX * SUBPIXEL_SCALE,
);
