import * as Vec2 from "~/common/Vec2.ts";
import { assertEquals } from "asserts";
import {
  resolveTileCollisions,
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

Deno.test("tile collisions: left tile edge & bottom right corner of dynamic", () => {
  const position = new Vec2.Instance(TILE_SIZE, TILE_SIZE + 1);
  const velocity = new Vec2.Instance(1, 1);
  const options = new SimulateOptions();
  const matrix = new Matrix2<boolean>(2, 2, false);
  matrix.set(1, 1, true);

  options.hitBox = new Vec2.Instance(2, 2);

  resolveTileCollisions(position, velocity, matrix, options);

  assertEquals(position.x, TILE_SIZE - options.hitBox.x / 2);
  assertEquals(position.y, TILE_SIZE + 1);
  assertEquals(velocity.x, 0);
  assertEquals(velocity.y, 1);
});

Deno.test("tile collisions: left tile edge & top right corner of dynamic", () => {
  const position = new Vec2.Instance(TILE_SIZE, TILE_SIZE - 1);
  const velocity = new Vec2.Instance(1, 1);
  const options = new SimulateOptions();
  const matrix = new Matrix2<boolean>(2, 2, false);
  matrix.set(1, 0, true);

  options.hitBox = new Vec2.Instance(2, 2);

  resolveTileCollisions(position, velocity, matrix, options);

  assertEquals(position.x, TILE_SIZE - options.hitBox.x / 2);
  assertEquals(position.y, TILE_SIZE - 1);
  assertEquals(velocity.x, 0);
  assertEquals(velocity.y, 1);
});

Deno.test("tile collisions: right tile edge & top left corner of dynamic", () => {
  const position = new Vec2.Instance(TILE_SIZE, TILE_SIZE - 1);
  const velocity = new Vec2.Instance(-1, -1);
  const options = new SimulateOptions();
  const matrix = new Matrix2<boolean>(2, 2, false);
  matrix.set(0, 0, true);

  options.hitBox = new Vec2.Instance(2, 2);

  resolveTileCollisions(position, velocity, matrix, options);

  assertEquals(position.x, TILE_SIZE + options.hitBox.x / 2);
  assertEquals(position.y, TILE_SIZE - 1);
  assertEquals(velocity.x, 0);
  assertEquals(velocity.y, -1);
});

Deno.test("tile collisions: right tile edge & bottom left corner of dynamic", () => {
  const position = new Vec2.Instance(TILE_SIZE, TILE_SIZE + 1);
  const velocity = new Vec2.Instance(-1, -1);
  const options = new SimulateOptions();
  const matrix = new Matrix2<boolean>(2, 2, false);
  matrix.set(0, 1, true);

  options.hitBox = new Vec2.Instance(2, 2);

  resolveTileCollisions(position, velocity, matrix, options);

  assertEquals(position.x, TILE_SIZE + options.hitBox.x / 2);
  assertEquals(position.y, TILE_SIZE + 1);
  assertEquals(velocity.x, 0);
  assertEquals(velocity.y, -1);
});

Deno.test("tile collisions: top tile edge & bottom right corner of dynamic", () => {
  const position = new Vec2.Instance(TILE_SIZE + 1, TILE_SIZE);
  const velocity = new Vec2.Instance(1, 1);
  const options = new SimulateOptions();
  const matrix = new Matrix2<boolean>(2, 2, false);
  matrix.set(1, 1, true);

  options.hitBox = new Vec2.Instance(2, 2);

  resolveTileCollisions(position, velocity, matrix, options);

  assertEquals(position.x, TILE_SIZE + 1);
  assertEquals(position.y, TILE_SIZE - options.hitBox.y / 2);
  assertEquals(velocity.x, 1);
  assertEquals(velocity.y, 0);
});

Deno.test("tile collisions: top tile edge & bottom left corner of dynamic", () => {
  const position = new Vec2.Instance(TILE_SIZE - 1, TILE_SIZE);
  const velocity = new Vec2.Instance(1, 1);
  const options = new SimulateOptions();
  const matrix = new Matrix2<boolean>(2, 2, false);
  matrix.set(0, 1, true);

  options.hitBox = new Vec2.Instance(2, 2);

  resolveTileCollisions(position, velocity, matrix, options);

  assertEquals(position.x, TILE_SIZE - 1);
  assertEquals(position.y, TILE_SIZE - options.hitBox.y / 2);
  assertEquals(velocity.x, 1);
  assertEquals(velocity.y, 0);
});

Deno.test("tile collisions: bottom tile edge & top left corner of dynamic", () => {
  const position = new Vec2.Instance(TILE_SIZE - 1, TILE_SIZE);
  const velocity = new Vec2.Instance(-1, -1);
  const options = new SimulateOptions();
  const matrix = new Matrix2<boolean>(2, 2, false);
  matrix.set(0, 0, true);

  options.hitBox = new Vec2.Instance(2, 2);

  resolveTileCollisions(position, velocity, matrix, options);

  assertEquals(position.x, TILE_SIZE - 1);
  assertEquals(position.y, TILE_SIZE + options.hitBox.y / 2);
  assertEquals(velocity.x, -1);
  assertEquals(velocity.y, 0);
});

Deno.test("tile collisions: bottom tile edge & top right corner of dynamic", () => {
  const position = new Vec2.Instance(TILE_SIZE + 1, TILE_SIZE);
  const velocity = new Vec2.Instance(-1, -1);
  const options = new SimulateOptions();
  const matrix = new Matrix2<boolean>(2, 2, false);
  matrix.set(1, 0, true);

  options.hitBox = new Vec2.Instance(2, 2);

  resolveTileCollisions(position, velocity, matrix, options);

  assertEquals(position.x, TILE_SIZE + 1);
  assertEquals(position.y, TILE_SIZE + options.hitBox.y / 2);
  assertEquals(velocity.x, -1);
  assertEquals(velocity.y, 0);
});

Deno.test("tile collisions: opposite corners", () => {
  const position = new Vec2.Instance(TILE_SIZE, TILE_SIZE);
  const velocity = new Vec2.Instance(1, 1);
  const options = new SimulateOptions();
  const matrix = new Matrix2<boolean>(2, 2, false);
  matrix.set(1, 1, true);

  options.hitBox = new Vec2.Instance(2, 2);

  resolveTileCollisions(position, velocity, matrix, options);

  assertEquals(position.x, TILE_SIZE - options.hitBox.x / 2);
  assertEquals(position.y, TILE_SIZE - options.hitBox.y / 2);
  assertEquals(velocity.x, 0);
  assertEquals(velocity.y, 0);
});
