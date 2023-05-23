import { weightedAverage } from "./Ping.ts";
import { assertEquals } from "asserts";

Deno.test("weightedAverage", () => {
  const result = weightedAverage(1, 2);
  assertEquals(result, (1 * 2 + 2 * 5) / 7);
});
