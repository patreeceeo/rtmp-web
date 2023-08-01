import {
  ImageCollectionEnum,
  PoseType,
  SpriteRequest,
} from "~/client/functions/sprite.ts";
import { Sprite } from "~/client/functions/sprite.ts";

class SpriteStateApi {
  #imageUrls: Array<Array<SpriteRequest>> = [];
  #sprites: Array<Array<Sprite>> = [];
  bindRequest(images: ImageCollectionEnum, pose: PoseType, req: SpriteRequest) {
    (this.#imageUrls[images] = this.#imageUrls[images] || [])[pose] = req;
  }
  *getRequests(): Generator<[ImageCollectionEnum, PoseType, SpriteRequest]> {
    for (const [images, reqs] of this.#imageUrls.entries()) {
      for (const [pose, req] of reqs.entries()) {
        yield [images, pose, req];
      }
    }
  }
  bind(images: ImageCollectionEnum, pose: PoseType, sprite: Sprite) {
    (this.#sprites[images] = this.#sprites[images] || [])[pose] = sprite;
  }
  find(images: ImageCollectionEnum, pose: PoseType) {
    return this.#sprites[images][pose];
  }
}

export const SpriteState = new SpriteStateApi();
