import { assertEquals } from "asserts";
import { filter, map, toArray } from "./Iterable.ts";

Deno.test("Iterable#toArray", () => {
  function* genFn() {
    yield 1;
    yield 2;
    yield "red";
    yield "blue";
  }
  assertEquals(toArray(genFn()), [1, 2, "red", "blue"]);
});
Deno.test("Iterable#map", () => {
  function* genFn() {
    yield { sid: 1 };
    yield { sid: 2 };
    yield { sid: "red" };
    yield { sid: "blue" };
  }
  assertEquals(toArray(map(genFn(), ({ sid }) => sid)), [1, 2, "red", "blue"]);
  assertEquals(toArray(map(genFn(), "sid")), [1, 2, "red", "blue"]);
});

function time(fn: () => void) {
  const start = performance.now();
  fn();
  const end = performance.now();
  return end - start;
}

Deno.test("performance: map", () => {
  const iterable = [1, 2, 3];
  const libTime = time(() => {
    for (let i = 0; i < 1000000; i++) {
      map(iterable, (x) => x + 1);
    }
  });
  const natTime = time(() => {
    for (let i = 0; i < 1000000; i++) {
      iterable.map((x) => x + 1);
    }
  });
  console.log(`map() relative performance: ${natTime - libTime}ms`);
});

Deno.test("performance: filter", () => {
  const iterable = [1, 2, 3];
  const libTime = time(() => {
    for (let i = 0; i < 1000000; i++) {
      filter(iterable, (x) => x > 1);
    }
  });
  const natTime = time(() => {
    for (let i = 0; i < 1000000; i++) {
      iterable.filter((x) => x > 1);
    }
  });
  console.log(`filter() relative performance: ${natTime - libTime}ms`);
});

Deno.test("performance: toArray", () => {
  const iterable = [1, 2, 3];
  const target: number[] = [];
  const libTime = time(() => {
    for (let i = 0; i < 1000000; i++) {
      toArray(filter(iterable, (x) => x > 1), target);
    }
  });
  const natTime = time(() => {
    for (let i = 0; i < 1000000; i++) {
      iterable.filter((x) => x > 1);
    }
  });
  console.log(`toArray() relative performance: ${natTime - libTime}ms`);
});
