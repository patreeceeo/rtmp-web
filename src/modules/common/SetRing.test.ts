import { assert, assertEquals } from "asserts";
import { toArray } from "./Iterable.ts";
import { SetRing } from "./SetRing.ts";

Deno.test("SetRing", () => {
  const maxKeys = 3;
  const maxValueDiff = 3;
  const ring = new SetRing(maxKeys, maxValueDiff);

  for (const item of [0, 1, 2, 1]) {
    ring.add(0, item);
  }

  ring.add(1, 3);
  ring.add(2, 2);
  ring.add(2, 1);
  ring.add(2, 0);
  ring.add(1, 3);

  assert(ring.has(0));
  assert(ring.has(1));
  assert(ring.has(2));
  assert(!ring.has(3));

  // can add multiple _unique_ values per key
  assertEquals(toArray(ring.values(0)), [0, 1, 2]);
  assertEquals(toArray(ring.values(1)), [3]);
  assertEquals(toArray(ring.values(2)), [2, 1, 0]);

  // can get values across multple keys
  assertEquals(toArray(ring.sliceValues(0, 1)), [0, 1, 2, 3]);
  assertEquals(toArray(ring.sliceValues(1, 2)), [3, 2, 1, 0]);
  assertEquals(toArray(ring.sliceValues(0, 2)), [0, 1, 2, 3, 2, 1, 0]);

  // pushes out least-recently added key (0)
  ring.add(3, 1);
  ring.add(3, 2);
  ring.add(3, 3);

  assert(!ring.has(0));
  assert(ring.has(1));
  assert(ring.has(2));
  assertEquals(toArray(ring.sliceValues(0, 3)), [3, 2, 1, 0, 1, 2, 3]);

  // discard values outside range
  ring.add(3, 5);
  assertEquals(toArray(ring.sliceValues(0, 3)), [3, 2, 2, 3, 5]);
});
