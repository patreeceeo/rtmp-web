import * as math from './math.ts'
import * as asserts from 'asserts'
import { Vec2 } from './Vec2.ts'

Deno.test("clampLine", () => {
  asserts.assertEquals(math.clampLine(new Vec2(0, 0), new Vec2(0, 5), 3), new Vec2(0, 3))
  asserts.assertEquals(math.clampLine(new Vec2(0, 0), new Vec2(0, -5), 3), new Vec2(0, -3))
  asserts.assertEquals(math.clampLine(new Vec2(0, 0), new Vec2(5, 0), 3), new Vec2(3, 0))
  asserts.assertEquals(math.clampLine(new Vec2(0, 0), new Vec2(-5, 0), 3), new Vec2(-3, 0))
})
