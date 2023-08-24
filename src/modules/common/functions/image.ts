import { Box, IBox } from "../Box.ts";
import { isClient } from "../env.ts";
import { Instance } from "~/common/Vec2.ts";
import { RgbaColor, RgbaChannelEnum } from "~/common/RgbaColor.ts";

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
const _canvasRenderingContextSettings: CanvasRenderingContext2DSettings = {willReadFrequently: true};
const _ctx = isClient ? _canvas.getContext("2d", _canvasRenderingContextSettings)! : null as unknown as CanvasRenderingContext2D;
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

const box = new Box();
export async function *getContiguousChunks(image: HTMLImageElement, chunkSize: Instance) {
  box.w = chunkSize.x;
  box.h = chunkSize.y;
  while (box.yMin < image.naturalHeight) {
    while (box.xMin < image.naturalWidth) {
      const chunk = await getChunk(image, box);
      box.xMin += chunkSize.x;
      yield chunk;
    }
    box.xMin = 0;
    box.yMin += chunkSize.y;
  }
}

const _imageDataSettings: ImageDataSettings = {colorSpace: "srgb"}
function getImageData(image: HTMLImageElement) {
  _canvas.width = image.naturalWidth;
  _canvas.height = image.naturalHeight;
  _ctx.drawImage(image, 0, 0);
  return _ctx.getImageData(0, 0, image.naturalWidth, image.naturalHeight, _imageDataSettings);
}


class Pixel {
  constructor(
    public color: RgbaColor,
    public position: Instance,
  ) {}
}

const reusedPixel = new Pixel(new RgbaColor(), new Instance());

export function *getPixels(image: HTMLImageElement): Generator<Pixel> {
  const data = getImageData(image);
  const {naturalWidth: width, naturalHeight: height} = image;
  const position = reusedPixel.position;
  const color = reusedPixel.color;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      position.x = x;
      position.y = y;
      color.r = data.data[i + RgbaChannelEnum.RED];
      color.g = data.data[i + RgbaChannelEnum.GREEN];
      color.b = data.data[i + RgbaChannelEnum.BLUE];
      color.a = data.data[i + RgbaChannelEnum.ALPHA];
      yield reusedPixel;
    }
  }
}


