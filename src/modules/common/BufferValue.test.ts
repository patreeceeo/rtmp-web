import * as asserts from "asserts";
import { IVec2, Vec2 } from "./Vec2.ts";
import {
  BufferProxyObject,
  getDataView,
  IBufferProxyObject,
  IBufferProxyObjectSpec,
  Int24Value,
  MAX_BYTE_LENGTH,
  PrimitiveValue,
  ValueBoxStacker,
  Vec2LargeSpec,
  Vec2SmallSpec,
} from "./BufferValue.ts";
import { DataViewMovable } from "./DataView.ts";

Deno.test("BufferProxyObject: 2 objs of same type differing data", () => {
  interface IMyObject {
    score: number;
    type: number;
  }
  const buf = new DataViewMovable(new ArrayBuffer(128));
  const spec: IBufferProxyObjectSpec<IMyObject> = {
    props: {
      score: [0, PrimitiveValue.Uint16],
      type: [2, PrimitiveValue.Uint8],
    },
  };
  const obj = new BufferProxyObject<IMyObject>(
    buf,
    0,
    spec,
  ) as unknown as IBufferProxyObject<IMyObject>;
  const obj2 = new BufferProxyObject<IMyObject>(
    buf,
    obj.meta__byteLength,
    spec,
  ) as unknown as IMyObject;

  obj.score = 1234;
  obj.type = 13;

  obj2.score = 100;
  obj2.type = 8;

  asserts.assertEquals(obj.score, 1234);
  asserts.assertEquals(obj.type, 13);

  asserts.assertEquals(obj2.score, 100);
  asserts.assertEquals(obj2.type, 8);
});

Deno.test("BufferProxyObject: metadata", () => {
  interface IMyObject {
    score: number;
    position: Vec2;
  }
  const buf = new DataViewMovable(new ArrayBuffer(128));
  const buf2 = new DataViewMovable(new ArrayBuffer(128));
  const spec: IBufferProxyObjectSpec<IMyObject> = {
    props: {
      score: [0, PrimitiveValue.Uint16],
      position: [2, Vec2SmallSpec],
    },
  };
  const obj = new BufferProxyObject<IMyObject>(
    buf,
    0,
    spec,
  ) as unknown as IBufferProxyObject<IMyObject>;

  asserts.assertEquals(obj.meta__byteLength, 4);

  asserts.assertEquals(obj.meta__bytesRemaining, 4);

  obj.score = 182;
  asserts.assertEquals(obj.meta__bytesRemaining, 2);

  obj.position.x = 11;
  asserts.assertEquals(obj.meta__bytesRemaining, 1);

  obj.position.y = 22;
  asserts.assertEquals(obj.meta__bytesRemaining, 0);

  obj.meta__byteOffset = 1;
  asserts.assertEquals(obj.meta__bytesRemaining, 4);

  obj.score = 182;
  asserts.assertEquals(obj.meta__bytesRemaining, 2);

  obj.position.x = 11;
  asserts.assertEquals(obj.meta__bytesRemaining, 1);

  obj.position.y = 22;
  asserts.assertEquals(obj.meta__bytesRemaining, 0);

  obj.meta__dataViewSource = buf2;
  asserts.assertEquals(obj.meta__bytesRemaining, 4);
});

Deno.test("BufferProxyObject: obj with obj properties", () => {
  interface IMyObject {
    position: IVec2;
  }
  const buf = new DataViewMovable(new ArrayBuffer(128));
  const obj = new BufferProxyObject<IMyObject>(buf, 0, {
    props: {
      position: [0, Vec2SmallSpec],
    },
  }) as unknown as IBufferProxyObject<IMyObject>;

  obj.position.x = 11;
  obj.position.y = 22;

  asserts.assertEquals(obj.position.x, 11);
  asserts.assertEquals(obj.position.y, 22);
});

Deno.test("BufferProxyObject: moveable instances", () => {
  interface IMyObject {
    position: IVec2;
  }
  const buf1 = new DataViewMovable(new ArrayBuffer(128));
  const buf2 = new DataViewMovable(new ArrayBuffer(128));
  const obj = new BufferProxyObject<IMyObject>(buf1, 0, {
    props: {
      position: [0, Vec2SmallSpec],
    },
  }) as unknown as IBufferProxyObject<IMyObject>;

  obj.position.x = 11;
  obj.position.y = 22;

  obj.meta__byteOffset = obj.meta__byteLength;

  obj.position.x = 33;
  obj.position.y = 44;

  obj.meta__dataViewSource = buf2;
  obj.meta__byteOffset = 0;

  obj.position.x = 55;
  obj.position.y = 66;

  obj.meta__dataViewSource = buf1;
  obj.meta__byteOffset = 0;

  asserts.assertEquals(obj.position.x, 11);
  asserts.assertEquals(obj.position.y, 22);

  obj.meta__byteOffset = obj.meta__byteLength;

  asserts.assertEquals(obj.position.x, 33);
  asserts.assertEquals(obj.position.y, 44);

  obj.meta__dataViewSource = buf2;
  obj.meta__byteOffset = 0;

  asserts.assertEquals(obj.position.x, 55);
  asserts.assertEquals(obj.position.y, 66);
});

Deno.test("BufferProxyObject: classes", () => {
  interface IMyObject {
    position: Vec2;
    isEvil: boolean;
  }
  const buf = new DataViewMovable(new ArrayBuffer(128));
  const spec: IBufferProxyObjectSpec<IMyObject> = {
    props: {
      isEvil: [0, PrimitiveValue.Bool],
      position: [1, Vec2LargeSpec],
    },
  };
  const obj = new BufferProxyObject<IMyObject>(
    buf,
    0,
    spec,
  ) as unknown as IBufferProxyObject<IMyObject>;

  const vec2 = new Vec2(22, 33);

  obj.position.copy(vec2);
  obj.isEvil = true;

  asserts.assertEquals(obj.position, vec2);
  asserts.assertEquals(obj.isEvil, true);
  asserts.assertEquals(obj.meta__bytesRemaining, 0);
});

Deno.test("BufferProxyObject: plain", () => {
  interface IMyObject {
    position: Vec2;
    isEvil: boolean;
  }
  const buf = new DataViewMovable(new ArrayBuffer(128));
  const obj = new BufferProxyObject<IMyObject>(buf, 0, {
    props: {
      isEvil: [0, PrimitiveValue.Bool],
      position: [1, Vec2SmallSpec],
    },
  }) as unknown as IBufferProxyObject<IMyObject>;

  const vec2 = new Vec2(22, 33);

  obj.position.copy(vec2);
  obj.isEvil = true;

  asserts.assertEquals(obj.meta__plain, {
    position: { x: 22, y: 33 },
    isEvil: true,
  });
});

Deno.test("BufferProxyObject: meta__dataView", () => {
  interface IMyObject {
    position: Vec2;
  }
  const buf = new DataViewMovable(new ArrayBuffer(128));
  const spec = {
    props: {
      position: [0, Vec2SmallSpec],
    },
  } as IBufferProxyObjectSpec<IMyObject>;
  const obj1 = new BufferProxyObject<IMyObject>(
    buf,
    1,
    spec,
  ) as unknown as IBufferProxyObject<IMyObject>;
  const obj2 = new BufferProxyObject<IMyObject>(
    buf,
    1,
    spec,
  ) as unknown as IBufferProxyObject<IMyObject>;

  obj1.meta__byteOffset = 12;
  obj1.position.x = 11;
  obj1.position.y = 22;

  const src = obj1.meta__dataView;
  const dest = obj2.meta__dataView;
  for (let byteIndex = 0; byteIndex < src.byteLength; byteIndex++) {
    dest.setUint8(byteIndex, src.getUint8(byteIndex));
  }
  asserts.assertEquals(obj2.position.x, 11);
  asserts.assertEquals(obj2.position.y, 22);
});

Deno.test("Multiple representations of the same data", () => {
  interface IMyObject {
    int32: number;
    int16: number;
  }
  const buf = new DataViewMovable(new ArrayBuffer(4));
  const obj = new BufferProxyObject<IMyObject>(buf, 0, {
    props: {
      int32: [0, PrimitiveValue.Int32],
      int16: [2, PrimitiveValue.Int16],
    },
  }) as unknown as IBufferProxyObject<IMyObject>;
  const expectedInt32 = (1 << 15) + (1 << 31);

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
  const vec2LargeBox = stack.box(Vec2LargeSpec);
  const forked = stack.fork();
  const boolBox = stack.box(PrimitiveValue.Bool);
  const uint8Box = forked.box(PrimitiveValue.Uint8);

  asserts.assertEquals(int24Box, [0, PrimitiveValue.Int24]);
  asserts.assertEquals(vec2LargeBox, [3, Vec2LargeSpec]);
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
// // TODO test reading/writing at every possible position in a buffer
// // TODO test reading/writing every possible value for every data type
