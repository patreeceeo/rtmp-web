import { Vec2 } from "../Vec2.ts";
import { assertEquals } from "asserts";
import {
  determinePositionAtTime,
  determineRestingPosition,
  simulateAcceleration,
  SimulateOptions,
  simulateVelocity,
} from "./physics.ts";
import { Box } from "../Box.ts";

const originalVelocity = new Vec2();

Deno.test("deterministic physics: resting position with velocity & friction", () => {
  const position = new Vec2();
  const velocity = new Vec2(3, 0); // space units per time unit squared
  originalVelocity.copy(velocity);

  const options = new SimulateOptions();
  options.friction = 0.5;
  determineRestingPosition(position, velocity, options);

  assertEquals(position.x, 2.5 + 2 + 1.5 + 1 + 0.5);
  assertEquals(position.y, 0);
  assertEquals(velocity, originalVelocity);
});

Deno.test("deterministic physics: resting position Infinity because zero friction", () => {
  const position = new Vec2();
  const velocity = new Vec2(3, 0); // space units per time unit squared

  const options = new SimulateOptions();

  determineRestingPosition(position, velocity, options);
  assertEquals(position.x, Infinity);
});

Deno.test("deterministic physics: resting position unchanged because zero velocity", () => {
  const position = new Vec2(13, 0);
  const velocity = Vec2.ZERO;

  const options = new SimulateOptions();

  determineRestingPosition(position, velocity, options);
  assertEquals(position.x, 13);
});

Deno.test("deterministic physics: resting position with worldDimensions", () => {
  const position = new Vec2();
  const velocity = new Vec2(3, 0); // space units per time unit squared

  const options = new SimulateOptions();
  options.worldDimensions = new Box(0, 0, 10, 10);

  determineRestingPosition(position, velocity, options);
  assertEquals(position.x, 10);
});

Deno.test("deterministic physics: resting position with worldDimensions and negative velocity", () => {
  const position = new Vec2(8, 0);
  const velocity = new Vec2(-3, 0); // space units per time unit squared

  const options = new SimulateOptions();
  options.worldDimensions = new Box(0, 0, 10, 10);

  determineRestingPosition(position, velocity, options);
  assertEquals(position.x, 0);
});

Deno.test("deterministic physics: position at time with friction", () => {
  const position = new Vec2();
  const originalPosition = new Vec2();
  const velocity = new Vec2(3, 0); // space units per time unit squared
  originalVelocity.copy(velocity);
  originalPosition.copy(position);

  const options = new SimulateOptions();
  options.friction = 1;
  determinePositionAtTime(position, velocity, 1, options);

  assertEquals(position.x, 2);
  assertEquals(position.y, 0);
  assertEquals(velocity, originalVelocity);

  position.copy(originalPosition);
  determinePositionAtTime(position, velocity, 2, options);

  assertEquals(position.x, 2 + 1);
  assertEquals(position.y, 0);
  assertEquals(velocity, originalVelocity);

  position.copy(originalPosition);
  determinePositionAtTime(position, velocity, 3, options);

  assertEquals(position.x, 2 + 1);
  assertEquals(position.y, 0);
  assertEquals(velocity, originalVelocity);
});

Deno.test("physics: acceleration", () => {
  const deltaTime = 10;
  const velocity = new Vec2(5);
  const acceleration = new Vec2();

  acceleration.x = 3; // space units per time unit squared
  simulateAcceleration(velocity, acceleration, deltaTime);

  assertEquals(velocity.x, 35);

  assertEquals(acceleration.x, 0);
});

Deno.test("physics: max velocity", () => {
  const timeDelta = 10;
  const velocity = new Vec2(5);
  const acceleration = new Vec2();
  const options = new SimulateOptions();

  options.maxVelocity = 10;

  acceleration.x = 3; // space units per time unit squared

  simulateAcceleration(velocity, acceleration, timeDelta, options);

  assertEquals(velocity.x, 10);
});

Deno.test("physics: friction", () => {
  const timeDelta = 10;
  const position = new Vec2();
  const velocity = new Vec2(4);
  const options = new SimulateOptions();

  options.friction = 0.5;

  simulateVelocity(position, velocity, timeDelta, options);

  assertEquals(velocity.x, 0);
});
