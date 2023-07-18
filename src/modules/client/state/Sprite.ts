import { ImageCollectionEnum, PoseType } from "~/client/functions/sprite.ts";
import { Sprite } from "~/client/functions/sprite.ts";

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
