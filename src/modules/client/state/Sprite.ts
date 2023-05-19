import { PoseType } from "../../common/state/Player.ts";

export enum SpriteId {
  penguinRight,
  penguinLeft,
  penguin2Right,
  penguin2Left,
}

export enum SpriteMapId {
  penguin,
  penguin2,
}

export class Sprite {
  source: HTMLCanvasElement;
  constructor(
    readonly imageUrl: string,
    readonly width: number,
    readonly height: number,
    readonly mirror = false,
  ) {
    this.source = document.createElement("canvas");
  }
  loaded = false;
}

class SpriteStateApi {
  #sprites: Partial<Record<SpriteId, Sprite>> = {};
  #sources: Record<string, HTMLImageElement> = {};
  getSource(imageUrl: string) {
    const source = this.#sources[imageUrl] ||= document.createElement("img");
    source.src = imageUrl;
    return source;
  }
  set(id: SpriteId, sprite: Sprite) {
    this.#sprites[id] = sprite;
  }
  get(id: SpriteId) {
    return this.#sprites[id];
  }
  find(mapId: SpriteMapId, pose: PoseType) {
    const id = mapId * 2 + pose;
    return this.get(id);
  }
}

export const SpriteState = new SpriteStateApi();
