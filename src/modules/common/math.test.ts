import * as math from './math.ts'
import * as asserts from 'asserts'
import { Vec2 } from './Vec2.ts'

function vec2AlmostEquals(actual: Vec2, expected: Vec2) {
  asserts.assertAlmostEquals(actual.x, expected.x)
  asserts.assertAlmostEquals(actual.y, expected.y)
}

Deno.test("clampLine", () => {
  vec2AlmostEquals(math.clampLine(new Vec2(0, 0), new Vec2(0, 5), 3), new Vec2(0, 3))
  vec2AlmostEquals(math.clampLine(new Vec2(0, 0), new Vec2(0, -5), 3), new Vec2(0, -3))
  vec2AlmostEquals(math.clampLine(new Vec2(0, 0), new Vec2(5, 0), 3), new Vec2(3, 0))
  vec2AlmostEquals(math.clampLine(new Vec2(0, 0), new Vec2(-5, 0), 3), new Vec2(-3, 0))
  vec2AlmostEquals(math.clampLine(new Vec2(0, 0), new Vec2(6, 8), 5), new Vec2(3, 4))
  vec2AlmostEquals(math.clampLine(new Vec2(0, 0), new Vec2(-6, -8), 5), new Vec2(-3, -4))
  vec2AlmostEquals(math.clampLine(new Vec2(0, 0), new Vec2(6, -8), 5), new Vec2(3, -4))
  vec2AlmostEquals(math.clampLine(new Vec2(0, 0), new Vec2(-6, 8), 5), new Vec2(-3, 4))
  vec2AlmostEquals(math.clampLine(new Vec2(10, 10), new Vec2(16, 18), 5), new Vec2(13, 14))
  vec2AlmostEquals(math.clampLine(new Vec2(10, 10), new Vec2(4, 2), 5), new Vec2(7, 6))
})
