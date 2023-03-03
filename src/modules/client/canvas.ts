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
