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

const defaultOptions = new ImageOptions();

export function getDataUrl(
  image: HTMLImageElement,
  sourceBox: IBox,
  options = defaultOptions,
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
