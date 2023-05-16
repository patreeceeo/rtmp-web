/**
 * @file an implementation of a custom data structure that allows users to interact with data stored in an ArrayBuffer object through the familiar JavaScript object interface.
 */
// TODO maybe just use plain old DataView and manage the byte offset and circular behavior at a higher level
// TODO rename this file
import { DataViewMovable } from "./DataView.ts";
import { filter } from "./Iterable.ts";
import { roundTo8thBit } from "./math.ts";
import { OpaqueType } from "./state/mod.ts";
import { NetworkId } from "./state/Network.ts";
import { IVec2, Vec2 } from "./Vec2.ts";

export interface IBufferPrimativeValue<Type, BoxType = Type> {
  byteLength: number;
  read(buf: DataViewMovable, offset: number): BoxType;
  write(buf: DataViewMovable, offset: number, value: Type): void;
}

// TODO replace with the following, so that DataViewMovable can align with DataView
// class BoolBox implements IBufferPrimativeBox<boolean> {
//   byteLength = 1;
//   read(buf: DataView, offset: number): boolean {
//     return buf.getUint8(offset) !== 0;
//   }
//   write(buf: DataView, offset: number, value: boolean): void {
//     buf.setUint8(offset, value ? 1 : 0);
//   }
// }
class BoolValue {
  static byteLength = 1;
  static read(buf: DataViewMovable, offset: number): boolean {
    return buf.getBool(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: boolean): void {
    buf.setBool(offset, value);
  }
}

class Uint8Value {
  static byteLength = 1;
  static read(buf: DataViewMovable, offset: number): number {
    return buf.getUint8(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setUint8(offset, value);
  }
}

class Int8Value {
  static byteLength = 1;
  static read(buf: DataViewMovable, offset: number): number {
    return buf.getInt8(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setInt8(offset, value);
  }
}

class Uint16Value {
  static byteLength = 2;
  static read(buf: DataViewMovable, offset: number): number {
    return buf.getUint16(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setUint16(offset, value);
  }
}

class Int16Value {
  static byteLength = 2;
  static read(buf: DataViewMovable, offset: number): number {
    return buf.getInt16(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setInt16(offset, value);
  }
}
class Int32Value {
  static byteLength = 4;
  static read(buf: DataViewMovable, offset: number): number {
    return buf.getInt32(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setInt32(offset, value);
  }
}
class BigUint64Value {
  static byteLength = 2;
  static read(buf: DataViewMovable, offset: number): bigint {
    return buf.getBigUint64(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: bigint): void {
    buf.setBigUint64(offset, value);
  }
}
class Float64Value {
  static byteLength = 8;
  static read(buf: DataViewMovable, offset: number): number {
    return buf.getFloat64(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setFloat64(offset, value);
  }
}
class StepIdValue {
  static byteLength = 8;
  static read(buf: DataViewMovable, offset: number): number {
    return buf.getFloat64(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setFloat64(offset, value);
  }
}
class NetworkIdValue {
  static byteLength = 2;
  static read(buf: DataViewMovable, offset: number): NetworkId {
    return buf.getUint16(offset) as NetworkId;
  }
  static write(buf: DataViewMovable, offset: number, value: NetworkId): void {
    buf.setUint16(offset, value);
  }
}
export class Int24Value {
  static byteLength = 3;
  static read(buf: DataViewMovable, offset: number): number {
    const val = buf.getUint8(offset) |
      (buf.getUint8(offset + 1) << 8) |
      (buf.getUint8(offset + 2) << 16);
    return (val << 8) >> 8; // This line is used to extend the sign bit
  }
  static write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setUint8(offset, value & 0xff);
    buf.setUint8(offset + 1, (value >> 8) & 0xff);
    buf.setUint8(offset + 2, (value >> 16) & 0xff);
  }
}

export const PrimitiveValue = {
  // TypeScript is so stupid sometimes...
  Bool: BoolValue as
    | IBufferPrimativeValue<boolean, true>
    | IBufferPrimativeValue<boolean, false>,
  Uint8: Uint8Value as IBufferPrimativeValue<number>,
  Int8: Int8Value as IBufferPrimativeValue<number>,
  Uint16: Uint16Value as IBufferPrimativeValue<number>,
  Int16: Int16Value as IBufferPrimativeValue<number>,
  Int32: Int32Value as IBufferPrimativeValue<number>,
  BigUint64: BigUint64Value as IBufferPrimativeValue<bigint>,
  Float64: Float64Value as IBufferPrimativeValue<number>,
  StepId: StepIdValue as IBufferPrimativeValue<number>,
  NetworkId: NetworkIdValue as IBufferPrimativeValue<NetworkId>,
  Int24: Int24Value as IBufferPrimativeValue<number>,
};

export type IBufferValue<
  Iface,
  Klass extends Iface = Iface,
> = Iface extends Record<string, any> // deno-lint-ignore no-explicit-any
  ? Iface extends OpaqueType<string> ? IBufferPrimativeValue<Iface>
  : IBufferProxyObjectConstructor<Partial<Iface>, Klass>
  : IBufferPrimativeValue<Iface>;

interface IBufferProxyObjectConstructorOptions {
  readOnly: boolean;
}

export interface IBufferProxyObjectConstructor<
  // deno-lint-ignore no-explicit-any
  Iface extends Record<string, any>,
  Klass extends Iface = Iface,
> {
  isObject: true;
  byteLength: number;
  spec: IBufferProxyObjectSpec<Iface>;
  new (
    buf: DataViewMovable,
    byteOffset: number,
    options?: Partial<IBufferProxyObjectConstructorOptions>,
  ): IBufferProxyObject<Iface, Klass>;
}

export type IBufferProxyObject<
  // deno-lint-ignore no-explicit-any
  Iface extends Record<string, any>,
  Klass extends Iface = Iface,
> = Iface & {
  meta: {
    bytesRemaining: number;
    spec: IBufferProxyObjectSpec<Iface, Klass>;
    // deno-lint-ignore no-explicit-any
    plain: Record<string, any>;
  };
};

// deno-lint-ignore no-explicit-any
export function getByteLength<
  Iface extends Record<string, any>,
  Klass extends Iface = Iface,
>(
  spec: IBufferProxyObjectSpec<Iface, Klass>,
) {
  return Object.values(spec).reduce(
    (sum, [_, field]) => sum + field.byteLength,
    0,
  );
}

const ERROR_MESSAGE_RESERVED_FIELD_NAME = "`meta` is a reserved field name";

// deno-lint-ignore no-explicit-any
export type IBufferProxyObjectSpec<
  Iface extends Record<string, any>,
  Klass extends Iface = Iface,
> = Iface extends { meta: any } // deno-lint-ignore no-explicit-any
  ? typeof ERROR_MESSAGE_RESERVED_FIELD_NAME
  : {
    [K in keyof Iface]: K extends keyof Iface
      ? [number, IBufferValue<Iface[K], Klass[K]>]
      : never | "missing key";
  };

// TODO change this to not instantiate the boxes, let the definitions of objects do that so that they can specifiy the offset in the array buffer relative to the start of the object for each box, so that
// we can have multiple properties with their own representation of the same data.
export function createBufferProxyObjectConstructor<
  // deno-lint-ignore no-explicit-any
  Iface extends Record<string, any>,
  Klass extends Iface = Iface,
>(
  spec: IBufferProxyObjectSpec<Iface>,
  Klass: (new () => Klass) | null = null,
): IBufferProxyObjectConstructor<Iface, Klass> {
  if (!("meta" in spec)) {
    // deno-lint-ignore no-explicit-any
    const validFields = spec;
    const byteLength = getByteLength(validFields);
    class BufferProxyObject {
      static isObject = true;
      static byteLength = byteLength;
      static spec = spec;
      constructor(
        buf: DataViewMovable,
        byteOffset: number,
        options: Partial<IBufferProxyObjectConstructorOptions> = {},
      ) {
        const instance = Klass === null ? this : new Klass();
        // TODO this doesn't work if the same property is written to more than once
        let bytesRemainingSelf = byteLength;
        const meta = Object.create(null, {
          spec: {
            get: () => {
              return spec;
            },
          },
          plain: {
            get: () => {
              // deno-lint-ignore no-explicit-any
              const o: any = {} as any;
              for (const [fieldName, [_, Value]] of Object.entries(spec)) {
                if ("isObject" in Value) {
                  o[fieldName as keyof Iface] =
                    // deno-lint-ignore no-explicit-any
                    (instance as any)[fieldName].meta.plain;
                } else {
                  // deno-lint-ignore no-explicit-any
                  o[fieldName as keyof Iface] = (instance as any)[fieldName];
                }
              }
              return o;
            },
          },
          bytesRemaining: {
            get: () => {
              let bytesRemaining = bytesRemainingSelf;
              const proxyEntries = filter(
                Object.entries(spec),
                ([_key, [_, coder]]) => "isObject" in coder,
              );
              for (const [key, [_, Value]] of proxyEntries) {
                // deno-lint-ignore no-explicit-any
                const { meta } = (this as any)[key] as IBufferProxyObject<any>;
                bytesRemaining -= Value.byteLength - meta.bytesRemaining;
              }
              return bytesRemaining;
            },
          },
        });
        const propertyDescriptors: PropertyDescriptorMap = {
          meta: {
            get: () => meta,
          },
        };
        for (
          const [fieldName, [relativeByteOffset, Value]] of Object.entries(
            validFields,
          )
        ) {
          const fieldByteOffset = byteOffset + relativeByteOffset;
          const fieldDescriptor: PropertyDescriptor = {};
          if ("isObject" in Value) {
            const proxy = new Value(buf, fieldByteOffset, options);
            fieldDescriptor.get = () => proxy;
          } else {
            fieldDescriptor.get = () => {
              return Value.read(buf, fieldByteOffset);
            };
          }
          if (!options.readOnly) {
            if ("isObject" in Value) {
              const proxy = new Value(buf, fieldByteOffset, options);
              fieldDescriptor.set = (v: Iface[keyof Iface]) => {
                for (const key of Object.keys(proxy.meta.spec)) {
                  // deno-lint-ignore no-explicit-any
                  (instance as any)[fieldName][key] = v[key];
                }
              };
            } else {
              fieldDescriptor.set = (v: Iface[keyof Iface]) => {
                bytesRemainingSelf -= Value.byteLength;
                Value.write(buf, fieldByteOffset, v);
              };
            }
          }
          propertyDescriptors[fieldName] = fieldDescriptor;
        }
        Object.defineProperties(instance, propertyDescriptors);
        return instance as IBufferProxyObject<Iface, Klass>;
      }
    }
    return BufferProxyObject as IBufferProxyObjectConstructor<Iface, Klass>;
  } else {
    throw new Error(ERROR_MESSAGE_RESERVED_FIELD_NAME);
  }
}

// deno-lint-ignore no-explicit-any
export function asPlainObject<T extends Record<string, any>>(
  proxy: IBufferProxyObject<T>,
) {
  return proxy as T;
}

export const Vec2SmallProxy = createBufferProxyObjectConstructor<IVec2, Vec2>(
  {
    x: [0, PrimitiveValue.Int8],
    y: [1, PrimitiveValue.Int8],
  },
  Vec2,
);

export class Int24Roundedto16 {
  static byteLength = 2;
  static read(buf: DataViewMovable, byteOffset: number) {
    return roundTo8thBit(Int24Value.read(buf, byteOffset));
  }
  static write(_buf: DataViewMovable, _byteOffset: number, _value: number) {
    throw new Error("not implemented");
  }
}

export const Vec2LargeProxy = createBufferProxyObjectConstructor<IVec2>(
  {
    x: [0, PrimitiveValue.Int32],
    y: [4, PrimitiveValue.Int32],
  },
  Vec2,
);
