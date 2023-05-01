import { Vec2 } from "../Vec2.ts";
import { assertEquals } from "asserts";
import { simulateAcceleration, simulateVelocity } from "./physics.ts";

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
  const maxVelocity = 10;

  acceleration.x = 3; // space units per time unit squared
  simulateAcceleration(velocity, acceleration, timeDelta, { maxVelocity });

  assertEquals(velocity.x, 10);
});

Deno.test("physics: friction", () => {
  const timeDelta = 10;
  const position = new Vec2();
  const velocity = new Vec2(4);
  const friction = 0.5;

  simulateVelocity(position, velocity, timeDelta, { friction });

  assertEquals(velocity.x, 0);
});
