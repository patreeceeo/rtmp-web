import { assertEquals, assertStrictEquals } from "asserts";
import { DataViewMovable } from "./DataView.ts";

interface TestValue<V> {
  readonly value: V;
  readonly bytes: Uint8Array;
  readonly littleEndian?: boolean;
  readonly byteLength?: number;
  readonly byteEncoding?: string;
}

interface TestEntry<V> {
  readonly type: string;
  readonly values: TestValue<V>[];
  getValue(buffer: DataViewMovable, entry: TestValue<V>): V;
  readValue(buffer: DataViewMovable, entry: TestValue<V>): V;
  // deno-lint-ignore no-explicit-any
  setValue(buffer: DataViewMovable, entry: TestValue<V>): any;
  // deno-lint-ignore no-explicit-any
  writeValue(buffer: DataViewMovable, entry: TestValue<V>): any;
}

// deno-lint-ignore no-explicit-any
const entries: TestEntry<any>[] = [
  {
    type: "Bool",
    getValue: function (buffer) {
      return buffer.getBool(0);
    },
    readValue: function (buffer) {
      return buffer.readBool();
    },
    setValue: function (buffer, entry) {
      buffer.setBool(0, entry.value);
    },
    writeValue: function (buffer, entry) {
      buffer.writeBool(entry.value);
    },
    values: [
      {
        value: true,
        bytes: new Uint8Array([0x01]),
      },
      {
        value: false,
        bytes: new Uint8Array([0x00]),
      },
    ],
  },
  {
    type: "Int8",
    getValue: function (buffer) {
      return buffer.getInt8(0);
    },
    readValue: function (buffer) {
      return buffer.readInt8();
    },
    setValue: function (buffer, entry) {
      return buffer.setInt8(0, entry.value);
    },
    writeValue: function (buffer, entry) {
      return buffer.writeInt8(entry.value);
    },
    values: [
      {
        value: 0,
        bytes: new Uint8Array([0x00]),
      },
      {
        value: -1,
        bytes: new Uint8Array([0xff]),
      },
    ],
  },
  {
    type: "Uint8",
    getValue: function (buffer) {
      return buffer.getUint8(0);
    },
    readValue: function (buffer) {
      return buffer.readUint8();
    },
    setValue: function (buffer, entry) {
      return buffer.setUint8(0, entry.value);
    },
    writeValue: function (buffer, entry) {
      return buffer.writeUint8(entry.value);
    },
    values: [
      {
        value: 0,
        bytes: new Uint8Array([0x00]),
      },
      {
        value: 255,
        bytes: new Uint8Array([0xff]),
      },
    ],
  },
  {
    type: "Int16",
    getValue: function (buffer, entry) {
      return buffer.getInt16(0, entry.littleEndian);
    },
    readValue: function (buffer, entry) {
      return buffer.readInt16(entry.littleEndian);
    },
    setValue: function (buffer, entry) {
      return buffer.setInt16(0, entry.value, entry.littleEndian);
    },
    writeValue: function (buffer, entry) {
      return buffer.writeInt16(entry.value, entry.littleEndian);
    },
    values: [
      {
        value: 0,
        bytes: new Uint8Array([0x00, 0x00]),
      },
      {
        value: -1,
        bytes: new Uint8Array([0xff, 0xff]),
      },
      {
        value: 1501,
        littleEndian: true,
        bytes: new Uint8Array([0xdd, 0x05]),
      },
      {
        value: -4608,
        littleEndian: true,
        bytes: new Uint8Array([0x00, 0xee]),
      },
    ],
  },
  {
    type: "Uint16",
    getValue: function (buffer, entry) {
      return buffer.getUint16(0, entry.littleEndian);
    },
    readValue: function (buffer, entry) {
      return buffer.readUint16(entry.littleEndian);
    },
    setValue: function (buffer, entry) {
      return buffer.setUint16(0, entry.value, entry.littleEndian);
    },
    writeValue: function (buffer, entry) {
      return buffer.writeUint16(entry.value, entry.littleEndian);
    },
    values: [
      {
        value: 0,
        littleEndian: true,
        bytes: new Uint8Array([0x00, 0x00]),
      },
      {
        value: 17408,
        littleEndian: true,
        bytes: new Uint8Array([0x00, 0x44]),
      },
      {
        value: 863,
        bytes: new Uint8Array([0x03, 0x5f]),
      },
      {
        value: 19852,
        bytes: new Uint8Array([0x4d, 0x8c]),
      },
    ],
  },
  {
    type: "Int32",
    getValue: function (buffer, entry) {
      return buffer.getInt32(0, entry.littleEndian);
    },
    readValue: function (buffer, entry) {
      return buffer.readInt32(entry.littleEndian);
    },
    setValue: function (buffer, entry) {
      return buffer.setInt32(0, entry.value, entry.littleEndian);
    },
    writeValue: function (buffer, entry) {
      return buffer.writeInt32(entry.value, entry.littleEndian);
    },
    values: [
      {
        value: 0,
        bytes: new Uint8Array([0x00, 0x00, 0x00, 0x00]),
      },
      {
        value: 13398,
        bytes: new Uint8Array([0x00, 0x00, 0x34, 0x56]),
      },
      {
        value: 255,
        littleEndian: true,
        bytes: new Uint8Array([0xff, 0x00, 0x00, 0x00]),
      },
      {
        value: -31199487,
        littleEndian: true,
        bytes: new Uint8Array([0x01, 0xef, 0x23, 0xfe]),
      },
    ],
  },
  {
    type: "Uint32",
    getValue: function (buffer, entry) {
      return buffer.getUint32(0, entry.littleEndian);
    },
    readValue: function (buffer, entry) {
      return buffer.readUint32(entry.littleEndian);
    },
    setValue: function (buffer, entry) {
      return buffer.setUint32(0, entry.value, entry.littleEndian);
    },
    writeValue: function (buffer, entry) {
      return buffer.writeUint32(entry.value, entry.littleEndian);
    },
    values: [
      {
        value: 0,
        littleEndian: true,
        bytes: new Uint8Array([0x00, 0x00, 0x00, 0x00]),
      },
      {
        value: 4278255871,
        littleEndian: true,
        bytes: new Uint8Array([0xff, 0x00, 0x01, 0xff]),
      },
      {
        value: 838868224,
        bytes: new Uint8Array([0x32, 0x00, 0x1d, 0x00]),
      },
      {
        value: 4294967295,
        bytes: new Uint8Array([0xff, 0xff, 0xff, 0xff]),
      },
    ],
  },
  {
    type: "Float32",
    getValue: function (buffer, entry) {
      return buffer.getFloat32(0, entry.littleEndian);
    },
    readValue: function (buffer, entry) {
      return buffer.readFloat32(entry.littleEndian);
    },
    setValue: function (buffer, entry) {
      return buffer.setFloat32(0, entry.value, entry.littleEndian);
    },
    writeValue: function (buffer, entry) {
      return buffer.writeFloat32(entry.value, entry.littleEndian);
    },
    values: [
      {
        value: 0,
        bytes: new Uint8Array([0x00, 0x00, 0x00, 0x00]),
      },
      {
        value: -1.7147039117384454e38,
        bytes: new Uint8Array([0xff, 0x00, 0xff, 0xff]),
      },
      {
        value: 2.3680999571924454e-38,
        littleEndian: true,
        bytes: new Uint8Array([0x7f, 0xee, 0x00, 0x01]),
      },
      {
        value: 49478916636672,
        littleEndian: true,
        bytes: new Uint8Array([0xd5, 0x00, 0x34, 0x56]),
      },
    ],
  },
  {
    type: "Float64",
    getValue: function (buffer, entry) {
      return buffer.getFloat64(0, entry.littleEndian);
    },
    readValue: function (buffer, entry) {
      return buffer.readFloat64(entry.littleEndian);
    },
    setValue: function (buffer, entry) {
      return buffer.setFloat64(0, entry.value, entry.littleEndian);
    },
    writeValue: function (buffer, entry) {
      return buffer.writeFloat64(entry.value, entry.littleEndian);
    },
    values: [
      {
        value: 0,
        littleEndian: true,
        bytes: new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
      },
      {
        value: -1.0038006599012751e92,
        littleEndian: true,
        bytes: new Uint8Array([0x24, 0x3f, 0x6a, 0x88, 0x85, 0xa3, 0x08, 0xd3]),
      },
      {
        value: 3.186958684239239e-58,
        bytes: new Uint8Array([0x34, 0x00, 0x00, 0xff, 0x01, 0xfe, 0x00, 0x81]),
      },
      {
        value: -5.486124072790359e303,
        bytes: new Uint8Array([0xff, 0x00, 0x00, 0x00, 0x00, 0x32, 0x10, 0x00]),
      },
    ],
  },
];

Deno.test("DataViewMovable", () => {
  for (const entry of entries) {
    const { type, values, getValue, readValue, setValue, writeValue } = entry;

    for (const entry of values) {
      const { value, bytes, byteLength } = entry;
      const buffer = new DataViewMovable(bytes.buffer);

      const valueGet = getValue(buffer, entry);
      assertEquals(
        value,
        valueGet,
        `expected get${type}() to return ${value}, but got ${valueGet} instead.`,
      );

      const valueRead = readValue(buffer, entry);
      assertEquals(
        valueGet,
        valueRead,
        `expected read${type}() to return ${value}, but got ${valueRead} instead.`,
      );
      assertStrictEquals(
        buffer.byteOffset,
        buffer.byteLength,
        `expected read${type}() to offset ${buffer.byteLength} bytes, but got ${buffer.byteOffset} instead.`,
      );

      buffer.reset();
      buffer.clear();

      const lengthSet = setValue(buffer, entry);
      assertStrictEquals(
        lengthSet,
        byteLength,
        `expected set${type}(${value}) to return a byte length of ${byteLength}, but got ${lengthSet} instead.`,
      );
      const bytesSet = new Uint8Array(buffer.buffer);
      assertEquals(
        bytesSet,
        bytes,
        `expected set${type}(${value}) to encode as ${bytes}, but got ${bytesSet} instead.`,
      );

      writeValue(buffer, entry);
      assertEquals(
        bytesSet,
        bytes,
        `expected write${type}(${value}) to encode as ${bytes}, but got ${bytesSet} instead.`,
      );
      assertStrictEquals(
        buffer.byteOffset,
        buffer.byteLength,
        `expected write${type}(${value}) to offset ${buffer.byteLength} bytes, but got ${buffer.byteOffset} instead.`,
      );
    }
  }
});

Deno.test("DataViewMovable isCircular", () => {
  // 16 bit
  const buf3 = new ArrayBuffer(3);
  const dv3 = new DataViewMovable(buf3, { isCircular: true });

  dv3.setInt16(5, 33);
  assertEquals(dv3.getInt16(5), 33);

  dv3.setUint16(5, 33);
  assertEquals(dv3.getUint16(5), 33);

  // 32 bit
  const buf5 = new ArrayBuffer(5);
  const dv5 = new DataViewMovable(buf5, { isCircular: true });

  for (let i = 0; i < 9; i++) {
    dv5.setInt32(i, 33);
    assertEquals(dv5.getInt32(i), 33);

    dv5.setUint32(i, 33);
    assertEquals(dv5.getUint32(i), 33);

    dv5.setFloat32(i, 33);
    assertEquals(dv5.getFloat32(i), 33);
  }

  // 64 bit
  const buf9 = new ArrayBuffer(9);
  const dv9 = new DataViewMovable(buf9, { isCircular: true });

  for (let i = 0; i < 17; i++) {
    dv9.setFloat64(i, 33);
    assertEquals(dv9.getFloat64(i), 33);
  }
});
