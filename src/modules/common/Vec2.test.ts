import { Vec2 } from "./Vec2.ts";
import { assertAlmostEquals } from "asserts";

function assertVecAlmostEquals(actual: Vec2, expected: Vec2) {
  assertAlmostEquals(actual.x, expected.x);
  assertAlmostEquals(actual.y, expected.y);
}
Deno.test("Vec2: clamp", () => {
  assertVecAlmostEquals(new Vec2(0, 3).clamp(5), new Vec2(0, 3));
  assertVecAlmostEquals(new Vec2(0, 5).clamp(3), new Vec2(0, 3));
  assertVecAlmostEquals(new Vec2(0, -5).clamp(3), new Vec2(0, -3));
  assertVecAlmostEquals(new Vec2(3, 0).clamp(5), new Vec2(3, 0));
  assertVecAlmostEquals(new Vec2(5, 0).clamp(3), new Vec2(3, 0));
  assertVecAlmostEquals(new Vec2(-5, 0).clamp(3), new Vec2(-3, 0));
  assertVecAlmostEquals(new Vec2(6, 8).clamp(5), new Vec2(3, 4));
});
