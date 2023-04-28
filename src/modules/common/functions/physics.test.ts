import { Vec2 } from "../Vec2.ts";
import { assertEquals } from "asserts";
import { simulate } from "./physics.ts";

Deno.test("physics: acceleration", () => {
  const timeDelta = 10;
  const position = new Vec2();
  const velocity = new Vec2(5);
  const acceleration = new Vec2();

  acceleration.x = 3; // space units per time unit squared
  simulate(timeDelta, acceleration, velocity, position);

  assertEquals(velocity.x, 35);
  // velocity * timeDelta + 1/2 * acceleration * timeDelta ** 2
  // 5 * 10 + 1/2 * 3 * 10 ** 2 = 200
  assertEquals(position.x, 200);
});

Deno.test("physics: max velocity", () => {
  const timeDelta = 10;
  const position = new Vec2();
  const velocity = new Vec2(5);
  const acceleration = new Vec2();
  const maxVelocity = 10;

  acceleration.x = 3; // space units per time unit squared
  simulate(timeDelta, acceleration, velocity, position, { maxVelocity });

  assertEquals(velocity.x, 10);
});

Deno.test("physics: friction", () => {
  const timeDelta = 10;
  const position = new Vec2();
  const velocity = new Vec2(4);
  const acceleration = new Vec2();
  const friction = 0.5;

  simulate(timeDelta, acceleration, velocity, position, { friction });

  assertEquals(velocity.x, 0);
});

Deno.test("physics: friction & maxVelocity", () => {
  const timeDelta = 10;
  const position = new Vec2();
  const velocity = new Vec2(4);
  const acceleration = new Vec2();
  const friction = 0.1;
  const maxVelocity = 2;

  simulate(timeDelta, acceleration, velocity, position, {
    friction,
    maxVelocity,
  });

  assertEquals(velocity.x, 2);
});
