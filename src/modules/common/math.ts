import { Vec2 } from "./Vec2.ts";

export function getDistanceSquared(a: Vec2, b: Vec2) {
  return Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);
}

export function clampLine(
  start: Vec2,
  end: Vec2,
  maxLength: number,
): Vec2 | null {
  const { x: x1, y: y1 } = start;
  const { x: x2, y: y2 } = end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distanceCircleToLine = Math.abs(dy * x1 - dx * y1 - x1 * y2 + x2 * y1) /
    Math.sqrt(dx * dx + dy * dy);
  const length = Math.sqrt(dx * dx + dy * dy);

  // Special case
  if (x1 === x2) {
    return new Vec2(x1, (y1 + maxLength) * Math.sign(y2));
  }

  // Check if the line intersects the circle
  if (distanceCircleToLine > maxLength) {
    return null;
  }

  // Calculate the distance from the intersection point to the endpoints of the line
  const a = Math.sqrt(
    maxLength * maxLength - distanceCircleToLine * distanceCircleToLine,
  );
  const t = a / length;

  // Calculate the intersection point
  const x = x1 + t * dx;
  const y = y1 + t * dy;

  return new Vec2(x, y);
}
