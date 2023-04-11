import { assertEquals } from "asserts";
import { map, toArray } from "./Iterable.ts";

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
