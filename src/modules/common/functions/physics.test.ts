import * as Vec2 from "~/common/Vec2.ts";
import { assertEquals } from "asserts";
import {
  SimulateOptions,
  simulatePositionWithVelocity,
  simulateVelocityWithAcceleration,
} from "./physics.ts";

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
