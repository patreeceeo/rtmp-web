import * as Vec2 from "./Vec2.ts";
import { assertAlmostEquals } from "asserts";

function assertVecAlmostEquals(actual: Vec2.Instance, expected: Vec2.Instance) {
  assertAlmostEquals(actual.x, expected.x);
  assertAlmostEquals(actual.y, expected.y);
}
Deno.test("Vec2: clamp", () => {
  assertVecAlmostEquals(
    Vec2.clamp(new Vec2.Instance(0, 3), 5),
    new Vec2.Instance(0, 3),
  );
  assertVecAlmostEquals(
    Vec2.clamp(new Vec2.Instance(0, 5), 3),
    new Vec2.Instance(0, 3),
  );
  assertVecAlmostEquals(
    Vec2.clamp(new Vec2.Instance(0, -5), 3),
    new Vec2.Instance(0, -3),
  );
  assertVecAlmostEquals(
    Vec2.clamp(new Vec2.Instance(3, 0), 5),
    new Vec2.Instance(3, 0),
  );
  assertVecAlmostEquals(
    Vec2.clamp(new Vec2.Instance(5, 0), 3),
    new Vec2.Instance(3, 0),
  );
  assertVecAlmostEquals(
    Vec2.clamp(new Vec2.Instance(-5, 0), 3),
    new Vec2.Instance(-3, 0),
  );
  assertVecAlmostEquals(
    Vec2.clamp(new Vec2.Instance(6, 8), 5),
    new Vec2.Instance(3, 4),
  );
});
