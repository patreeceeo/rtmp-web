import { Box } from "../../common/Box.ts";
import { incrementId } from "../../common/functions/id.ts";
import {
  getChunk,
  ImageOptions,
  loadFromUrl,
  setCache,
} from "../../common/functions/image.ts";

export enum PoseType {
  facingRight,
  facingLeft,
}

export enum SpriteEnum {
  penguinRight,
  penguinLeft,
  penguin2Right,
  penguin2Left,
}

export enum ImageCollectionEnum {
  penguin,
  penguin2,
}

class Sprite {
  constructor(
    public imageId: number,
    public width: number,
    public height: number,
  ) {}
}

class SpriteStateApi {
  #map: Array<Array<Sprite>> = [];
  bind(images: ImageCollectionEnum, pose: PoseType, sprite: Sprite) {
    (this.#map[images] = this.#map[images] || [])[pose] = sprite;
  }
  find(images: ImageCollectionEnum, pose: PoseType) {
    return this.#map[images][pose];
  }
}

export const SpriteState = new SpriteStateApi();

const _frame = new Box();
const _chunkOptions = new ImageOptions();

export async function loadSprite(
  src: string,
  images: ImageCollectionEnum,
  pose: PoseType,
  width: number,
  height: number,
  flipped = false,
) {
  const image = await loadFromUrl(src);

  _frame.xMin = 0;
  _frame.yMin = 0;
  _frame.w = width;
  _frame.h = height;
  _chunkOptions.reset();
  _chunkOptions.flipH = flipped;
  _chunkOptions.target = new Image();
  const chunk = await getChunk(image, _frame, _chunkOptions);
  const imageId = incrementId("image");

  setCache(imageId, chunk);
  SpriteState.bind(images, pose, new Sprite(imageId, width, height));
}
