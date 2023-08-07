import * as Vec2 from "~/common/Vec2.ts";
import { assertEquals } from "asserts";
import {
  CardinalDirection,
  detectTileCollision1d,
  SimulateOptions,
  simulatePositionWithVelocity,
  simulateVelocityWithAcceleration,
  TILE_SIZE,
  TileCollision1d,
} from "./physics.ts";
import { Matrix2 } from "../math.ts";
import { EntityId, UNDEFINED_ENTITY } from "~/common/Entity.ts";

Deno.test("physics: acceleration", () => {
  const deltaTime = 10;
  const velocity = new Vec2.Instance(5);
  const acceleration = new Vec2.Instance();

  acceleration.x = 3; // space units per time unit squared
  simulateVelocityWithAcceleration(velocity, acceleration, deltaTime);

  assertEquals(velocity.x, 35);
});

Deno.test("physics: max velocity", () => {
  const timeDelta = 10;
  const velocity = new Vec2.Instance(5);
  const acceleration = new Vec2.Instance();
  const options = new SimulateOptions();

  options.maxSpeed = 10;

  acceleration.x = 3; // space units per time unit squared

  simulateVelocityWithAcceleration(velocity, acceleration, timeDelta, options);

  assertEquals(velocity.x, 10);
});

Deno.test("physics: friction", () => {
  const timeDelta = 10;
  const position = new Vec2.Instance();
  const velocity = new Vec2.Instance(4);
  const options = new SimulateOptions();

  options.friction = 128;

  simulatePositionWithVelocity(position, velocity, timeDelta, options);

  assertEquals(velocity.x, 0);
});

Deno.test("detect tile collision: xMin", () => {
  const position = new Vec2.Instance(TILE_SIZE, TILE_SIZE - 1);
  const options = new SimulateOptions();
  options.hitBox = new Vec2.Instance(2, 2);

  const matrix = new Matrix2<EntityId>(2, 2, UNDEFINED_ENTITY);
  matrix.set(0, 0, 0 as EntityId);

  const result = new TileCollision1d();
  detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.xMin,
    result,
    options,
  );
  assertEquals(result.impactDistance, options.hitBox.x / 2);

  position.x += options.hitBox.x / 2;
  detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.xMin,
    result,
    options,
  );
  assertEquals(result.impactDistance, 0);

  position.x += 1;
  detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.xMin,
    result,
    options,
  );
  assertEquals(result.tileEntityId, UNDEFINED_ENTITY);
});

Deno.test("detect tile collision: xMax", () => {
  const position = new Vec2.Instance(TILE_SIZE, TILE_SIZE - 1);
  const options = new SimulateOptions();
  options.hitBox = new Vec2.Instance(2, 2);

  const matrix = new Matrix2<EntityId>(2, 2, UNDEFINED_ENTITY);
  matrix.set(1, 0, 0 as EntityId);

  const result = new TileCollision1d();
  detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.xMax,
    result,
    options,
  );

  assertEquals(result.impactDistance, options.hitBox.x / 2);
  position.x -= options.hitBox.x / 2;

  detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.xMax,
    result,
    options,
  );
  assertEquals(result.impactDistance, 0);

  position.x -= 1;

  detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.xMax,
    result,
    options,
  );
  assertEquals(result.tileEntityId, UNDEFINED_ENTITY);
});

Deno.test("detect tile collision: yMin", () => {
  const position = new Vec2.Instance(TILE_SIZE - 1, TILE_SIZE);
  const options = new SimulateOptions();
  options.hitBox = new Vec2.Instance(2, 2);

  const matrix = new Matrix2<EntityId>(2, 2, UNDEFINED_ENTITY);
  matrix.set(0, 0, 0 as EntityId);

  const result = new TileCollision1d();
  detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.yMin,
    result,
    options,
  );
  assertEquals(result.impactDistance, options.hitBox.y / 2);

  position.y += options.hitBox.y / 2;
  detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.yMin,
    result,
    options,
  );
  assertEquals(result.impactDistance, 0);

  position.y += 1;
  detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.yMin,
    result,
    options,
  );
  assertEquals(result.tileEntityId, UNDEFINED_ENTITY);
});

Deno.test("detect tile collision: yMax", () => {
  const position = new Vec2.Instance(TILE_SIZE - 1, TILE_SIZE);
  const options = new SimulateOptions();
  options.hitBox = new Vec2.Instance(2, 2);

  const matrix = new Matrix2<EntityId>(2, 2, UNDEFINED_ENTITY);
  matrix.set(0, 1, 0 as EntityId);

  const result = new TileCollision1d();
  detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.yMax,
    result,
    options,
  );

  assertEquals(result.impactDistance, options.hitBox.y / 2);
  position.y -= options.hitBox.y / 2;

  detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.yMax,
    result,
    options,
  );
  assertEquals(result.impactDistance, 0);

  position.y -= 1;

  detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.yMax,
    result,
    options,
  );
  assertEquals(result.tileEntityId, UNDEFINED_ENTITY);
});
