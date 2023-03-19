import { Vec2 } from "./Vec2.ts";

export function getDistanceSquared(a: Vec2, b: Vec2) {
  return Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);
}

export function clampLine(
  start: Vec2,
  end: Vec2,
  maxLength: number,
): Vec2 {
  const { x: x1, y: y1 } = start;
  const { x: x2, y: y2 } = end;
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Special case: start and end points are the same
  if (dx === 0 && dy === 0) {
    return new Vec2(x1, y1);
  }

  // Calculate the distance between start and end points
  const length = Math.sqrt(dx * dx + dy * dy);

  // Special case: start and end points are too close
  if (length <= maxLength) {
    return new Vec2(x2, y2);
  }

  // Calculate the new point that is maxLength away from start in the direction of end
  const newX = x1 + dx * maxLength / length;
  const newY = y1 + dy * maxLength / length;

  return new Vec2(newX, newY);
}
