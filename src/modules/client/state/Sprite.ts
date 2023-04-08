export enum SpriteType {
  penguinRight,
  penguinLeft,
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
  #sprites: Partial<Record<SpriteType, Sprite>> = {};
  #sources: Record<string, HTMLImageElement> = {};
  getSource(imageUrl: string) {
    const source = this.#sources[imageUrl] ||= document.createElement("img");
    source.src = imageUrl;
    return source;
  }
  set(type: SpriteType, sprite: Sprite) {
    this.#sprites[type] = sprite;
  }
  get(type: SpriteType) {
    return this.#sprites[type];
  }
}

export const SpriteState = new SpriteStateApi();
