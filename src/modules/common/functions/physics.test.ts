import * as Vec2 from "~/common/Vec2.ts";
import { assertEquals } from "asserts";
import {
  CardinalDirection,
  detectTileCollision1d,
  SimulateOptions,
  simulatePositionWithVelocity,
  simulateVelocityWithAcceleration,
  TILE_SIZE,
} from "./physics.ts";
import { Matrix2 } from "../math.ts";

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

  const matrix = new Matrix2<boolean>(2, 2, false);
  matrix.set(0, 0, true);

  let result: number;
  result = detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.xMin,
    options,
  );
  assertEquals(result, options.hitBox.x / 2);

  position.x += options.hitBox.x / 2;
  result = detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.xMin,
    options,
  );
  assertEquals(result, 0);

  position.x += 1;
  result = detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.xMin,
    options,
  );
  assertEquals(result, -1);
});

Deno.test("detect tile collision: xMax", () => {
  const position = new Vec2.Instance(TILE_SIZE, TILE_SIZE - 1);
  const options = new SimulateOptions();
  options.hitBox = new Vec2.Instance(2, 2);

  const matrix = new Matrix2<boolean>(2, 2, false);
  matrix.set(1, 0, true);

  let result: number;
  result = detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.xMax,
    options,
  );

  assertEquals(result, options.hitBox.x / 2);
  position.x -= options.hitBox.x / 2;

  result = detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.xMax,
    options,
  );
  assertEquals(result, 0);

  position.x -= 1;

  result = detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.xMax,
    options,
  );
  assertEquals(result, -1);
});

Deno.test("detect tile collision: yMin", () => {
  const position = new Vec2.Instance(TILE_SIZE - 1, TILE_SIZE);
  const options = new SimulateOptions();
  options.hitBox = new Vec2.Instance(2, 2);

  const matrix = new Matrix2<boolean>(2, 2, false);
  matrix.set(0, 0, true);

  let result: number;
  result = detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.yMin,
    options,
  );
  assertEquals(result, options.hitBox.y / 2);

  position.y += options.hitBox.y / 2;
  result = detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.yMin,
    options,
  );
  assertEquals(result, 0);

  position.y += 1;
  result = detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.yMin,
    options,
  );
  assertEquals(result, -1);
});

Deno.test("detect tile collision: yMax", () => {
  const position = new Vec2.Instance(TILE_SIZE - 1, TILE_SIZE);
  const options = new SimulateOptions();
  options.hitBox = new Vec2.Instance(2, 2);

  const matrix = new Matrix2<boolean>(2, 2, false);
  matrix.set(0, 1, true);

  let result: number;
  result = detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.yMax,
    options,
  );

  assertEquals(result, options.hitBox.y / 2);
  position.y -= options.hitBox.y / 2;

  result = detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.yMax,
    options,
  );
  assertEquals(result, 0);

  position.y -= 1;

  result = detectTileCollision1d(
    position,
    matrix,
    CardinalDirection.yMax,
    options,
  );
  assertEquals(result, -1);
});
