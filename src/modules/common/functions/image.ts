import { IBox } from "../Box.ts";

const _canvas = document.createElement("canvas");
export class ImageOptions {
  flipH = false;
  flipV = false;
  flipD = false;
  reset() {
    this.flipH = false;
    this.flipD = false;
    this.flipV = false;
  }
}

const _defaultOptions = new ImageOptions();

const _imagePromiseCache: { [url: string]: Promise<HTMLImageElement> } = {};
const _imageCache: { [url: string]: HTMLImageElement } = {};

export function loadFromUrl(
  url: string,
  cacheKey = url,
): Promise<HTMLImageElement> {
  if (!(cacheKey in _imagePromiseCache)) {
    return _imagePromiseCache[cacheKey] = new Promise<HTMLImageElement>(
      (res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = url;
        _imageCache[cacheKey] = img;
      },
    );
  } else {
    return _imagePromiseCache[cacheKey];
  }
}

export function getFromCache(cacheKey: string) {
  return _imageCache[cacheKey];
}

export function getDataUrl(
  image: HTMLImageElement,
  sourceBox: IBox,
  options = _defaultOptions,
) {
  _canvas.width = sourceBox.w;
  _canvas.height = sourceBox.h;
  const ctx = _canvas.getContext("2d")!;

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

  return _canvas.toDataURL("image/png");
}
