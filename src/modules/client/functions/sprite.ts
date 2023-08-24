import { Box } from "../../common/Box.ts";
import { incrementId } from "../../common/functions/id.ts";
import {
  getChunk,
  getFromCache,
  ImageOptions,
  loadFromUrl,
  setCache,
} from "../../common/functions/image.ts";
import { SpriteState } from "~/client/state/Sprite.ts";

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
  NONE,
  penguin,
  penguin2,
}

const _frame = new Box();
const _chunkOptions = new ImageOptions();

export class SpriteRequest {
  constructor(
    public imageSrc: string,
    public width: number,
    public height: number,
    public flipped = false,
  ) {}
}

export class Sprite {
  constructor(
    public imageId: number,
    public width: number,
    public height: number,
  ) {}
}

export async function loadSprite(
  src: string,
  width: number,
  height: number,
  flipped = false,
): Promise<Sprite> {
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
  return new Sprite(imageId, width, height);
}

export async function handleSpriteRequests() {
  for (const [imageCollectionId, pose, request] of SpriteState.getRequests()) {
    SpriteState.bind(
      imageCollectionId,
      pose,
      await loadSprite(
        request.imageSrc,
        request.width,
        request.height,
        request.flipped,
      ),
    );
  }
}

export class DrawSpriteOptions {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
}

export const drawSpriteOptionsDefault = new DrawSpriteOptions();

export function drawSprite(
  sprite: Sprite,
  ctx: CanvasRenderingContext2D,
  options = drawSpriteOptionsDefault,
) {
  const image = getFromCache(sprite.imageId);
  ctx.drawImage(
    image,
    options.x,
    options.y,
  );
}
