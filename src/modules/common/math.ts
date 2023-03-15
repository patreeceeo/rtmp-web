import { Vec2 } from "./State.ts";

export function distanceSquared2(a: Vec2, b: Vec2) {
  return Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2)
}
