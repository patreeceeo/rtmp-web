import { IBox } from "../Box.ts";
import { isClient } from "../env.ts";

export enum ImageFormat {
  PNG = "image/png",
  JPEG = "image/jpeg",
  GIF = "image/gif",
}

async function createImage(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

export class LoadOptions {
  checkCache = true;
  cacheKey: string | number | undefined = undefined;
  createImage = createImage;
  reset() {
    this.checkCache = true;
    this.cacheKey = undefined;
  }
}

export class ImageOptions {
  flipH = false;
  flipV = false;
  flipD = false;
  format = ImageFormat.PNG;
  target: HTMLImageElement | undefined;
  reset() {
    this.flipH = false;
    this.flipD = false;
    this.flipV = false;
    this.format = ImageFormat.GIF;
    this.target = undefined;
  }
}

const _canvas: HTMLCanvasElement = isClient
  ? document.createElement("canvas")
  : null as unknown as HTMLCanvasElement;
const _defaultOptions = new ImageOptions();
const _defaultLoadOptions = new LoadOptions();

const _imagePromiseCache: { [url: string]: Promise<HTMLImageElement> } = {};
const _imageCache: { [url: string]: HTMLImageElement } = {};

export function loadFromUrl(
  url: string,
  options = _defaultLoadOptions,
): Promise<HTMLImageElement> {
  const cacheKey = options.cacheKey || url;
  if (options.checkCache && cacheKey in _imageCache) {
    return Promise.resolve(_imageCache[cacheKey]);
  } else if (!(cacheKey in _imagePromiseCache)) {
    const promise = options.createImage(url);
    promise.then(
      (img) => {
        _imageCache[cacheKey] = img;
        return img;
      },
    );
    _imagePromiseCache[cacheKey] = promise;
    return promise;
  } else {
    return _imagePromiseCache[cacheKey];
  }
}

export function getFromCache(cacheKey: string | number) {
  return _imageCache[cacheKey];
}

export function setCache(cacheKey: string | number, image: HTMLImageElement) {
  _imageCache[cacheKey] = image;
}

export async function getChunk(
  image: HTMLImageElement,
  sourceBox: IBox,
  options = _defaultOptions,
): Promise<HTMLImageElement> {
  _canvas.width = sourceBox.w;
  _canvas.height = sourceBox.h;
  const ctx = _canvas.getContext("2d")!;
  const target = options.target || new Image();

  ctx.clearRect(0, 0, _canvas.width, _canvas.height);

  if (options.flipH) {
    ctx.translate(_canvas.width, 0);
    ctx.scale(-1, 1);
  }
  if (options.flipV) {
    ctx.translate(0, _canvas.height);
    ctx.scale(1, -1);
  }
  if (options.flipD) {
    ctx.translate(_canvas.width, 0);
    ctx.rotate(Math.PI / 2);
  }

  ctx.drawImage(
    image,
    sourceBox.xMin,
    sourceBox.yMin,
    sourceBox.w,
    sourceBox.h,
    0,
    0,
    sourceBox.w,
    sourceBox.h,
  );

  target.src = _canvas.toDataURL(options.format);
  await target.decode();
  return target;
}
