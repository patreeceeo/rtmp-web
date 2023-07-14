import { getDistanceBetweenEllipses } from "./math.ts";
import { assert, assertEquals } from "asserts";

Deno.test("distance between ellipses", () => {
  const centerA = { x: 0, y: 0 };
  const centerB = { x: 2, y: 0 };
  assertEquals(getDistanceBetweenEllipses(centerA, centerB, 1, 1), 0);

  centerB.x = 4;
  assertEquals(getDistanceBetweenEllipses(centerA, centerB, 2, 1), 0);

  centerA.x = 1;
  centerA.y = 2;
  centerB.y = 3;
  centerB.x = 3;
  assert(getDistanceBetweenEllipses(centerA, centerB, 2, 4) < 1);
});
