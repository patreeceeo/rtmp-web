import * as Vec2 from "~/common/Vec2.ts";
import { addComponents } from "~/common/Component.ts";
import { SUBPIXEL_SCALE } from "../../modules/common/constants.ts";
import { LevelState } from "../../modules/common/state/LevelState.ts";
import {
  BodyDimensions,
  BodyStaticTag,
  KillOnCollisionTag,
  PositionComponent,
  TileTag,
} from "~/common/components.ts";
import { addEntity } from "~/common/Entity.ts";

export const SCREEN_WIDTH_PX = 512;
export const SCREEN_HEIGHT_PX = 512;

LevelState.dimensions.set(
  0,
  0,
  SCREEN_WIDTH_PX * SUBPIXEL_SCALE,
  SCREEN_HEIGHT_PX * SUBPIXEL_SCALE,
);

const killerFloor = addComponents([
  KillOnCollisionTag,
  TileTag,
  PositionComponent,
  BodyStaticTag,
  BodyDimensions,
], addEntity());
Vec2.set(killerFloor.position, 4 << 5, 16 << 5);
const killerFloor2 = addComponents([
  KillOnCollisionTag,
  TileTag,
  PositionComponent,
  BodyStaticTag,
  BodyDimensions,
], addEntity());
Vec2.set(killerFloor2.position, 5 << 5, 16 << 5);
