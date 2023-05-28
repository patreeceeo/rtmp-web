import * as asserts from "asserts";
import { IVec2, Vec2 } from "./Vec2.ts";
import {
  createBufferProxyObjectConstructor,
  getDataView,
  Int24Value,
  MAX_BYTE_LENGTH,
  PrimitiveValue,
  ValueBoxStacker,
  Vec2LargeProxy,
  Vec2SmallProxy,
} from "./BufferValue.ts";
import { DataViewMovable } from "./DataView.ts";

Deno.test(
  "createBufferProxyObjectConstructor: 2 objs of same type differing data",
  () => {
    interface IMyObject {
      score: number;
      type: number;
    }
    const MyObject = createBufferProxyObjectConstructor<IMyObject>({
      score: [0, PrimitiveValue.Uint16],
      type: [2, PrimitiveValue.Uint8],
    });
    const buf = new DataViewMovable(new ArrayBuffer(128));

    const obj = new MyObject(buf, 0);
    const obj2 = new MyObject(buf, MyObject.byteLength);

    obj.score = 1234;
    obj.type = 13;

    obj2.score = 100;
    obj2.type = 8;

    asserts.assertEquals(obj.score, 1234);
    asserts.assertEquals(obj.type, 13);

    asserts.assertEquals(obj2.score, 100);
    asserts.assertEquals(obj2.type, 8);
  },
);

Deno.test("createBufferProxyObjectConstructor: metadata", () => {
  interface IMyObject {
    score: number;
    type: number;
  }
  const MyObject = createBufferProxyObjectConstructor<IMyObject>({
    score: [0, PrimitiveValue.Uint16],
    type: [2, PrimitiveValue.Uint8],
  });
  const buf = new DataViewMovable(new ArrayBuffer(128));

  const obj = new MyObject(buf, 0);

  asserts.assertEquals(MyObject.byteLength, 3);

  asserts.assertEquals(obj.meta__bytesRemaining, 3);

  obj.score = 182;
  asserts.assertEquals(obj.meta__bytesRemaining, 1);

  obj.type = 13;
  asserts.assertEquals(obj.meta__bytesRemaining, 0);
});

Deno.test("createBufferProxyObjectConstructor: obj with obj properties", () => {
  interface IMyObject {
    position: IVec2;
  }
  const MyObject = createBufferProxyObjectConstructor<IMyObject>({
    position: [0, Vec2SmallProxy],
  });
  const buf = new DataViewMovable(new ArrayBuffer(128));

  const obj = new MyObject(buf, 0);

  obj.position.x = 11;
  obj.position.y = 22;

  asserts.assertEquals(obj.position.x, 11);
  asserts.assertEquals(obj.position.y, 22);
});

Deno.test("createBufferProxyObjectConstructor: classes", () => {
  interface IMyObject {
    position: Vec2;
    isEvil: boolean;
  }
  const MyObject = createBufferProxyObjectConstructor<IMyObject>({
    isEvil: [0, PrimitiveValue.Bool],
    position: [1, Vec2LargeProxy],
  });
  const buf = new DataViewMovable(new ArrayBuffer(128));

  const obj = new MyObject(buf, 0);

  const vec2 = new Vec2(22, 33);

  obj.position = vec2;
  obj.isEvil = true;

  asserts.assertEquals(obj.position, vec2);
  asserts.assertEquals(obj.isEvil, true);
  asserts.assertEquals(obj.meta__bytesRemaining, 0);
});

Deno.test("createBufferProxyObjectConstructor: plain", () => {
  interface IMyObject {
    position: Vec2;
    isEvil: boolean;
  }
  const MyObject = createBufferProxyObjectConstructor<IMyObject>({
    isEvil: [0, PrimitiveValue.Bool],
    position: [1, Vec2SmallProxy],
  });
  const buf = new DataViewMovable(new ArrayBuffer(128));

  const obj = new MyObject(buf, 0);

  const vec2 = new Vec2(22, 33);

  obj.position = vec2;
  obj.isEvil = true;

  asserts.assertEquals(obj.meta__plain, {
    position: { x: 22, y: 33 },
    isEvil: true,
  });
});

Deno.test("Multiple representations of the same data", () => {
  interface IMyObject {
    int32: number;
    int16: number;
  }
  const MyObject = createBufferProxyObjectConstructor<IMyObject>({
    int32: [0, PrimitiveValue.Int32],
    int16: [2, PrimitiveValue.Int16],
  });
  const buf = new DataViewMovable(new ArrayBuffer(4));
  const expectedInt32 = (1 << 15) + (1 << 31);

  const obj = new MyObject(buf, 0);
  obj.int32 = expectedInt32;

  asserts.assertEquals(obj.int32, expectedInt32);
  asserts.assertEquals(obj.int16, expectedInt32 >> 16);
});

Deno.test("Int24Value", () => {
  const buf = new DataViewMovable(new ArrayBuffer(128));

  const testValues = [2 ** 8 / 2, 2 ** 8 + 1, 2 ** 16 + 1, 2 ** 23 - 1];

  for (const v of testValues) {
    Int24Value.write(buf, 0, v);

    asserts.assertEquals(Int24Value.read(buf, 0), v);
  }
  for (const v of testValues) {
    Int24Value.write(buf, 0, -v);

    asserts.assertEquals(Int24Value.read(buf, 0), -v);
  }
});

Deno.test("value box stacker", () => {
  const stack = new ValueBoxStacker();
  const int24Box = stack.box(PrimitiveValue.Int24);
  const vec2LargeBox = stack.box(Vec2LargeProxy);
  const forked = stack.fork();
  const boolBox = stack.box(PrimitiveValue.Bool);
  const uint8Box = forked.box(PrimitiveValue.Uint8);

  asserts.assertEquals(int24Box, [0, PrimitiveValue.Int24]);
  asserts.assertEquals(vec2LargeBox, [3, Vec2LargeProxy]);
  asserts.assertEquals(boolBox, [11, PrimitiveValue.Bool]);
  asserts.assertEquals(uint8Box, [11, PrimitiveValue.Uint8]);
});

Deno.test("getDataView can wrap around to beginning of buffer", () => {
  const buffer = new ArrayBuffer(MAX_BYTE_LENGTH);
  const view = new DataView(buffer);

  // Initialize buffer with values 1 through 16
  for (let i = 0; i < MAX_BYTE_LENGTH; i++) {
    view.setUint8(i, i);
  }

  for (let start = 0; start < MAX_BYTE_LENGTH; start++) {
    const result = getDataView(buffer, start);
    // values should be shifted to the left by `start`
    for (let i = 0; i < result.byteLength - start; i++) {
      asserts.assertEquals(result.getUint8(i), i + start);
    }
    // `start` values from beginning should be at the end
    for (let i = 0; i < start; i++) {
      asserts.assertEquals(result.getUint8(result.byteLength - start + i), i);
    }
  }
});
// TODO test reading/writing at every possible position in a buffer
// TODO test reading/writing every possible value for every data type
