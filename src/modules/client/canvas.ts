import { ReadOnly } from "~/common/Vec2.ts";

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  stroke?: boolean,
) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.closePath();
  ctx[stroke ? "stroke" : "fill"]();
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.closePath();
}

export function setupCanvas(el: HTMLCanvasElement, resolution: ReadOnly) {
  // Get the DPR and size of the canvas
  const dpr = 2 ** Math.ceil(Math.log2(window.devicePixelRatio));

  el.width = resolution.x * dpr;
  el.height = resolution.y * dpr;

  const ctx = el.getContext("2d")!;
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    // Scale the context to ensure correct drawing operations
    ctx.scale(dpr, dpr);
  }
}
