// import * as ECS from "bitecs";
// import { Vec2SmallSpec } from "../BufferValue.ts";
// import { EntityId, IEntityProxy } from "./mod.ts";
// import { EntityCollection } from "./mod.ts";
// import { assertEquals } from "asserts"

// Deno.test("EntityCollection", () => {
//   const world = ECS.createWorld();
//   const PositionStore = ECS.defineComponent(Vec2SmallSpec);
//   class Proxy implements IEntityProxy {
//     static readonly components = [PositionStore];
//     eid = ECS.addEntity(world) as EntityId;
//   }
//   const collection = new EntityCollection(Proxy)
//   const proxy = collection.create()
//   assertEquals(proxy.eid, 0)
// })
