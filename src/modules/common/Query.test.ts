import { assertEquals } from "asserts";
import { defineQuery, Not } from "./Query.ts";
import { addComponent } from "./Component.ts";
import { PositionComponent, SoftDeletedTag } from "./components.ts";
import { addEntity } from "./Entity.ts";
import { defaultWorld } from "./World.ts";

Deno.test("Not modifier", () => {
  const query = defineQuery([SoftDeletedTag, PositionComponent]);
  const queryNot = defineQuery([Not(SoftDeletedTag), PositionComponent]);
  const entity = addEntity();

  addComponent(PositionComponent, entity);

  assertEquals(query(defaultWorld).length, 0);
  assertEquals(queryNot(defaultWorld)[0], entity.eid);

  addComponent(SoftDeletedTag, entity);

  assertEquals(queryNot(defaultWorld).length, 0);
  assertEquals(query(defaultWorld)[0], entity.eid);
});
