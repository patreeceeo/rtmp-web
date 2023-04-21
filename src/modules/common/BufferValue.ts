/**
 * @file an implementation of a custom data structure that allows users to interact with data stored in an ArrayBuffer object through the familiar JavaScript object interface.
 */
// TODO maybe just use plain old DataView and manage the byte offset and circular behavior at a higher level
// TODO rename this file
import { DataViewMovable } from "./DataView.ts";
import { filter } from "./Iterable.ts";
import { OpaqueType } from "./state/mod.ts";
import { NetworkId } from "./state/Network.ts";
import { IVec2, Vec2 } from "./Vec2.ts";

export interface IBufferPrimativeBox<Type, BoxType = Type> {
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
class BoolBox implements IBufferPrimativeBox<boolean> {
  byteLength = 1;
  read(buf: DataViewMovable, offset: number): boolean {
    return buf.getBool(offset);
  }
  write(buf: DataViewMovable, offset: number, value: boolean): void {
    buf.setBool(offset, value);
  }
}

class Uint8Box implements IBufferPrimativeBox<number> {
  byteLength = 1;
  read(buf: DataViewMovable, offset: number): number {
    return buf.getUint8(offset);
  }
  write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setUint8(offset, value);
  }
}

class Uint16Box implements IBufferPrimativeBox<number> {
  byteLength = 2;
  read(buf: DataViewMovable, offset: number): number {
    return buf.getUint16(offset);
  }
  write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setUint16(offset, value);
  }
}
class Int16Box implements IBufferPrimativeBox<number> {
  byteLength = 2;
  read(buf: DataViewMovable, offset: number): number {
    return buf.getInt16(offset);
  }
  write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setInt16(offset, value);
  }
}
class Float64Box implements IBufferPrimativeBox<number> {
  byteLength = 8;
  read(buf: DataViewMovable, offset: number): number {
    return buf.getFloat64(offset);
  }
  write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setFloat64(offset, value);
  }
}
class NetworkIdBox implements IBufferPrimativeBox<NetworkId> {
  byteLength = 2;
  read(buf: DataViewMovable, offset: number): NetworkId {
    return buf.getUint16(offset) as NetworkId;
  }
  write(buf: DataViewMovable, offset: number, value: NetworkId): void {
    buf.setUint16(offset, value);
  }
}

export const PrimitiveType = {
  // TypeScript is so stupid sometimes...
  Bool: new BoolBox() as
    | IBufferPrimativeBox<boolean, true>
    | IBufferPrimativeBox<boolean, false>,
  Uint8: new Uint8Box(),
  Uint16: new Uint16Box(),
  Int16: new Int16Box(),
  Float64: new Float64Box(),
  NetworkId: new NetworkIdBox(),
};

export type IBufferPrimativeBoxBoolean =
  | IBufferPrimativeBox<true>
  | IBufferPrimativeBox<false>;

export type IBufferValue<
  Iface,
  Klass extends Iface = Iface,
> // deno-lint-ignore no-explicit-any
 = Iface extends Record<string, any>
  ? Iface extends OpaqueType<string> ? IBufferPrimativeBox<Iface>
  : IBufferProxyObjectConstructor<Partial<Iface>, Klass>
  : IBufferPrimativeBox<Iface>;

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
    pojo: Record<string, any>;
  };
};

// deno-lint-ignore no-explicit-any
export function getByteLength<Type extends Record<string, any>>(
  spec: Record<keyof Type, IBufferValue<Type[keyof Type]>>,
) {
  return Object.values(spec).reduce((sum, field) => sum + field.byteLength, 0);
}

const ERROR_MESSAGE_RESERVED_FIELD_NAME = "`meta` is a reserved field name";

// deno-lint-ignore no-explicit-any
export type IBufferProxyObjectSpec<
  Iface extends Record<string, any>,
  Klass extends Iface = Iface,
> = Iface extends // deno-lint-ignore no-explicit-any
{ meta: any } ? typeof ERROR_MESSAGE_RESERVED_FIELD_NAME
  : {
    [K in keyof Iface]: K extends keyof Iface ? IBufferValue<Iface[K], Klass[K]>
      : never | "missing key";
  };

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
    const validFields = spec as Record<string, any>;
    class BufferProxyObject {
      static isObject = true;
      static byteLength = getByteLength(validFields);
      static spec = spec;
      constructor(
        buf: DataViewMovable,
        byteOffset: number,
        options: Partial<IBufferProxyObjectConstructorOptions> = {},
      ) {
        const instance = Klass === null ? this : new Klass();
        let nextByteOffset = byteOffset;
        const byteLength = getByteLength(validFields);
        let bytesRemainingSelf = byteLength;
        const meta = Object.create(null, {
          spec: {
            get: () => {
              return spec;
            },
          },
          pojo: {
            get: () => {
              // deno-lint-ignore no-explicit-any
              const o: any = {} as any;
              for (const [fieldName, fieldCoder] of Object.entries(spec)) {
                if ("isObject" in fieldCoder) {
                  o[fieldName as keyof Iface] =
                    // deno-lint-ignore no-explicit-any
                    (instance as any)[fieldName].meta.pojo;
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
                ([_key, coder]) => "isObject" in coder,
              );
              for (const [key, coder] of proxyEntries) {
                // deno-lint-ignore no-explicit-any
                const { meta } = (this as any)[key] as IBufferProxyObject<any>;
                bytesRemaining -= coder.byteLength - meta.bytesRemaining;
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
        for (const [fieldName, fieldCoder] of Object.entries(validFields)) {
          const fieldByteOffset = nextByteOffset;
          const fieldDescriptor: PropertyDescriptor = {};
          if ("isObject" in fieldCoder) {
            const proxy = new (fieldCoder as IBufferProxyObjectConstructor<
              Klass[keyof Iface]
            >)(
              buf,
              fieldByteOffset,
              options,
            );
            proxy.meta.byteOffset = fieldByteOffset;
            fieldDescriptor.get = () => proxy;
          } else {
            fieldDescriptor.get = () => {
              return fieldCoder.read(buf, fieldByteOffset);
            };
          }
          if (!options.readOnly) {
            if ("isObject" in fieldCoder) {
              const proxy = new (fieldCoder as IBufferProxyObjectConstructor<
                Klass[keyof Iface]
              >)(
                buf,
                fieldByteOffset,
                options,
              );
              fieldDescriptor.set = (v: Iface[keyof Iface]) => {
                for (const key of Object.keys(proxy.meta.spec)) {
                  // deno-lint-ignore no-explicit-any
                  (instance as any)[fieldName][key] = v[key];
                }
              };
            } else {
              fieldDescriptor.set = (v: Iface[keyof Iface]) => {
                bytesRemainingSelf -= fieldCoder.byteLength;
                fieldCoder.write(buf, fieldByteOffset, v);
              };
            }
          }
          propertyDescriptors[fieldName] = fieldDescriptor;
          nextByteOffset += fieldCoder.byteLength;
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

export const Vec2Proxy = createBufferProxyObjectConstructor<IVec2, Vec2>({
  x: PrimitiveType.Float64,
  y: PrimitiveType.Float64,
}, Vec2);
