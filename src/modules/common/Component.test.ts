import { addComponent, removeComponent } from "./Component.ts";
import {
  MaxSpeedComponent,
  PositionComponent,
  SoftDeletedTag,
} from "./components.ts";
import { addEntity } from "./Entity.ts";
import { assertEquals, assertThrows } from "asserts";
import { Not } from "./Query.ts";

Deno.test("Tag component", () => {
  const entity = addEntity();
  addComponent(SoftDeletedTag, entity);

  assertEquals(entity.isSoftDeleted, true);

  removeComponent(SoftDeletedTag, entity);

  assertEquals(entity.isSoftDeleted, false);
});

Deno.test("Component with simple schema", () => {
  /*
   * The type system makes this look like entities are immutable,
   * but they're not. They are being mutated in place, and we
   * different identifiers for each change to the entity so the
   * type system can keep track of the changes.
   */
  const entity = addEntity();
  const e2 = addComponent(MaxSpeedComponent, entity);

  assertEquals(e2.maxSpeed, 0);

  e2.maxSpeed = 1;

  assertEquals(e2.maxSpeed, 1);

  const e3 = removeComponent(MaxSpeedComponent, e2);

  // The property has been omitted in the type but it's actually
  // still there as a getter that throws an error. Thought perhaps it might be better to delete it or set it to `undefined`?
  assertThrows(() => (e3 as any).maxSpeed);
});

// Deno.test("Component with computed values", () => {
//   const entity = addEntity()
//   const e2 = addComponent(MaxSpeedComponent, entity)

//   assertEquals(e2.maxSpeedSq, 0)

//   e2.maxSpeed = 2

//   assertEquals(e2.maxSpeedSq, 4)
// })

Deno.test("Component with complex schema", () => {
  const entity = addEntity();
  const entityWithPosition = addComponent(PositionComponent, entity);
  const { position } = entityWithPosition;

  assertEquals(position.x, 0);
  assertEquals(position.y, 0);

  position.x = 1;
  position.y = 2;

  assertEquals(position.x, 1);
  assertEquals(position.y, 2);
  assertEquals(position.x, position.store.x[entity.eid]);
  assertEquals(position.y, position.store.y[entity.eid]);

  const e2 = removeComponent(PositionComponent, entityWithPosition);
  assertThrows(() => (e2 as any).position);
});

Deno.test("Component with modifier", () => {
  const entity = addEntity();
  addComponent(SoftDeletedTag, entity);

  assertEquals(entity.isSoftDeleted, true);

  assertThrows(() => addComponent(Not(SoftDeletedTag), entity));
  removeComponent(SoftDeletedTag, entity);

  addComponent(Not(SoftDeletedTag), entity);

  assertEquals(entity.isSoftDeleted, false);
});
