/**
 * @file an implementation of a custom data structure that allows users to interact with data stored in an ArrayBuffer object through the familiar JavaScript object interface.
 */
// TODO maybe just use plain old DataView and manage the byte offset and circular behavior at a higher level
// TODO rename this file
// TODO this file is too large
import { DataViewMovable } from "./DataView.ts";
import { invariant } from "./Error.ts";
import { NetworkId } from "./state/Network.ts";
import { OpaqueType } from "./util.ts";
import { Instance as Vec2Instance } from "./Vec2.ts";

export interface IBufferPrimativeValue<Type, BoxType = Type> {
  isPrimative: true;
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
// TODO why aren't these just plain objects of type IBufferPrimativeValue?
class BoolValue {
  static isPrimative = true;
  static byteLength = 1;
  static read(buf: DataViewMovable, offset: number): boolean {
    return buf.getBool(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: boolean): void {
    buf.setBool(offset, value);
  }
}

class Uint8Value {
  static isPrimative = true;
  static byteLength = 1;
  static read(buf: DataViewMovable, offset: number): number {
    return buf.getUint8(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setUint8(offset, value);
  }
}

class Int8Value {
  static isPrimative = true;
  static byteLength = 1;
  static read(buf: DataViewMovable, offset: number): number {
    return buf.getInt8(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setInt8(offset, value);
  }
}

class Uint16Value {
  static isPrimative = true;
  static byteLength = 2;
  static read(buf: DataViewMovable, offset: number): number {
    return buf.getUint16(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setUint16(offset, value);
  }
}

class Int16Value {
  static isPrimative = true;
  static byteLength = 2;
  static read(buf: DataViewMovable, offset: number): number {
    return buf.getInt16(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setInt16(offset, value);
  }
}
class Int32Value {
  static isPrimative = true;
  static byteLength = 4;
  static read(buf: DataViewMovable, offset: number): number {
    return buf.getInt32(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setInt32(offset, value);
  }
}
class BigUint64Value {
  static isPrimative = true;
  static byteLength = 2;
  static read(buf: DataViewMovable, offset: number): bigint {
    return buf.getBigUint64(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: bigint): void {
    buf.setBigUint64(offset, value);
  }
}
class Float64Value {
  static isPrimative = true;
  static byteLength = 8;
  static read(buf: DataViewMovable, offset: number): number {
    return buf.getFloat64(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setFloat64(offset, value);
  }
}
class StepIdValue {
  static isPrimative = true;
  static byteLength = 8;
  static read(buf: DataViewMovable, offset: number): number {
    return buf.getFloat64(offset);
  }
  static write(buf: DataViewMovable, offset: number, value: number): void {
    buf.setFloat64(offset, value);
  }
}
class NetworkIdValue {
  static isPrimative = true;
  static byteLength = 2;
  static read(buf: DataViewMovable, offset: number): NetworkId {
    return buf.getUint16(offset) as NetworkId;
  }
  static write(buf: DataViewMovable, offset: number, value: NetworkId): void {
    buf.setUint16(offset, value);
  }
}

export class Int24Value {
  static isPrimative = true;
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
  Int24: Int24Value as IBufferPrimativeValue<number>,
  Int32: Int32Value as IBufferPrimativeValue<number>,
  BigUint64: BigUint64Value as IBufferPrimativeValue<bigint>,
  Float64: Float64Value as IBufferPrimativeValue<number>,
  StepId: StepIdValue as IBufferPrimativeValue<number>,
  NetworkId: NetworkIdValue as IBufferPrimativeValue<NetworkId>,
};

export type IBufferValueSpec<Iface> = // deno-lint-ignore no-explicit-any
  Iface extends Record<string, any>
    ? Iface extends OpaqueType<string> ? IBufferPrimativeValue<Iface>
    : IBufferProxyObjectSpec<Iface>
    : IBufferPrimativeValue<Iface>;

interface IBufferProxyObjectConstructorOptions {
  readOnly: boolean;
  parent: BufferProxyObject<Record<string, unknown>>;
}

export interface IBufferProxyObjectConstructor<
  // deno-lint-ignore no-explicit-any
  Iface extends Record<string, any>,
> {
  isObject: true;
  byteLength: number;
  spec: IBufferProxyObjectSpec<Iface>;
  new (
    buf: DataViewMovable,
    byteOffset: number,
    options?: Partial<IBufferProxyObjectConstructorOptions>,
  ): IBufferProxyObject<Iface>;
}

export type IBufferProxyObject<
  // deno-lint-ignore no-explicit-any
  Iface extends Record<string, any>,
> = Iface & {
  readonly meta__bytesRemaining: number;
  readonly meta__byteLength: number;
  readonly meta__spec: IBufferProxyObjectSpec<Iface>;
  readonly meta__dataView: DataView;
  // deno-lint-ignore no-explicit-any
  readonly meta__plain: Record<string, any>;
  meta__dataViewSource: DataViewMovable;
  meta__byteOffset: number;
};

const ERROR_MESSAGE_RESERVED_FIELD_NAME =
  "Field names cannot start with `meta__`";

export type IBufferProxyObjectSpec<
  // deno-lint-ignore no-explicit-any
  Iface extends Record<string, any>,
  Klass extends Iface = Iface,
> = {
  props: {
    [K in keyof Iface]: K extends keyof Iface
      // deno-lint-ignore no-explicit-any
      ? ReturnType<Iface[K]["toJSON"]> extends Record<string, any> ? readonly [
          number,
          IBufferValueSpec<ReturnType<Iface[K]["toJSON"]>>,
        ]
      : readonly [number, IBufferValueSpec<Iface[K]>]
      : never | "missing key";
  };
  Klass?: new () => Klass;
};

export function getByteLength<
  Iface,
>(spec: IBufferValueSpec<Iface>): number {
  let maxByteOffset = 0;
  let lastKey: string;
  if ("isPrimative" in spec) {
    return spec.byteLength;
  } else {
    for (const key in spec.props) {
      if (spec.props[key][0] >= maxByteOffset) {
        maxByteOffset = spec.props[key][0] as number;
        lastKey = key;
      }
    }
    const lastField = spec.props[lastKey!][1] as IBufferValueSpec<unknown>;
    if ("isPrimative" in lastField) {
      return maxByteOffset + lastField.byteLength;
    } else {
      return maxByteOffset + getByteLength(lastField);
    }
  }
}

export class BufferProxyObject<
  // deno-lint-ignore no-explicit-any
  Iface extends Record<string, any>,
  Klass extends Iface = Iface,
> {
  static readonly isObject = true;
  readonly meta__bytesRemaining!: number;
  readonly meta__resetBytesRemainingRecursively!: () => void;
  readonly meta__byteLength!: number;
  readonly meta__plain!: Iface;
  readonly meta__dataView!: DataView;
  meta__byteOffset!: number;
  meta__dataViewSource!: DataViewMovable;
  constructor(
    dataViewSource: DataViewMovable,
    public meta__relByteOffset: number,
    readonly meta__spec: IBufferProxyObjectSpec<Iface>,
    readonly meta__options: Partial<IBufferProxyObjectConstructorOptions> = {},
  ) {
    const byteLength = getByteLength(
      meta__spec as IBufferValueSpec<Iface>,
    );
    const instance = "Klass" in meta__spec ? new meta__spec.Klass!() : this;

    const getByteOffset = (o: BufferProxyObject<any, any>): number => {
      return (
        o.meta__relByteOffset +
        (o.meta__options.parent ? getByteOffset(o.meta__options.parent) : 0)
      );
    };

    const specPropKeys = Object.keys(meta__spec.props);

    function resetBytesRemaining(o: Record<string, number>) {
      for (const fieldName of specPropKeys) {
        const fieldSpec =
          (meta__spec.props as IBufferValueSpec<Iface>["props"])[
            fieldName
          ];
        if ("isPrimative" in fieldSpec[1]) {
          o[fieldName] = fieldSpec[1].byteLength;
        }
      }
    }

    function getBytesRemaining(o: Record<string, number>) {
      let bytesRemaining = byteLength;
      for (const fieldName of specPropKeys) {
        const value = (meta__spec.props as IBufferValueSpec<Iface>["props"])[
          fieldName
        ][1];
        if (
          "isPrimative" in
            (meta__spec.props as IBufferValueSpec<Iface>["props"])[
              fieldName
            ][1]
        ) {
          bytesRemaining -= (value as IBufferPrimativeValue<Iface>).byteLength -
            o[fieldName];
        }
      }
      return bytesRemaining;
    }

    const bytesRemainingByField: Record<string, number> = {};
    resetBytesRemaining(bytesRemainingByField);

    // TODO update bytes remaining when moved

    const propertyDescriptors: PropertyDescriptorMap = {
      meta__isObject: {
        value: true,
        writable: false,
      },
      meta__byteLength: {
        value: byteLength,
        writable: false,
      },
      meta__byteOffset: {
        get: () => getByteOffset(this),
        set: (value: number) => {
          if (!meta__options.parent) {
            this.meta__relByteOffset = value;
            if (dataViewSource.byteLength > 0) {
              this.meta__resetBytesRemainingRecursively();
            }
          } else {
            throw new Error("Cannot set byteOffset on a child object");
          }
        },
      },
      meta__spec: {
        get: () => {
          return meta__spec;
        },
      },
      /** @deprecated except for debugging/testing */
      meta__plain: {
        get: () => {
          // deno-lint-ignore no-explicit-any
          const o: any = {} as any;
          for (const fieldName of specPropKeys) {
            // deno-lint-ignore no-explicit-any
            const value = (this as any)[fieldName];
            if (value?.meta__isObject) {
              o[fieldName] = value.meta__plain;
            } else {
              o[fieldName] = propertyDescriptors[fieldName].get?.();
            }
          }
          return o;
        },
      },
      // TODO convert to a method?
      meta__bytesRemaining: {
        get: () => {
          let bytesRemaining = getBytesRemaining(bytesRemainingByField);
          for (const fieldName of specPropKeys) {
            // deno-lint-ignore no-explicit-any
            const value = (this as any)[fieldName];
            if (value?.meta__isObject) {
              bytesRemaining -= value.meta__byteLength -
                value.meta__bytesRemaining;
            }
          }
          return bytesRemaining;
        },
      },
      meta__resetBytesRemainingRecursively: {
        value: () => {
          resetBytesRemaining(bytesRemainingByField);
          for (const fieldName of specPropKeys) {
            // deno-lint-ignore no-explicit-any
            const value = (this as any)[fieldName];
            if (value?.meta__isObject) {
              value.meta__resetBytesRemainingRecursively();
            }
          }
        },
      },
      // TODO convert to a method?
      meta__dataView: {
        get: () => {
          return getDataView(
            dataViewSource.buffer,
            // TODO why is this off by 1???
            (getByteOffset(this) - 1) %
              dataViewSource.byteLength,
          );
        },
      },
      meta__dataViewSource: {
        get: () => {
          return dataViewSource;
        },
        set: (value: DataViewMovable) => {
          dataViewSource = value;
          if (dataViewSource.byteLength > 0) {
            resetBytesRemaining(bytesRemainingByField);
          }
          for (const key of specPropKeys) {
            const subSpec =
              (meta__spec.props as IBufferValueSpec<Iface>["props"])[
                key
              ][1];
            if (!("isPrimative" in subSpec)) {
              // deno-lint-ignore no-explicit-any
              (this as any)[key].meta__dataViewSource = dataViewSource;
            }
          }
        },
      },
    };
    for (
      const fieldName of specPropKeys
    ) {
      const [relativeByteOffset, subSpec] =
        // deno-lint-ignore no-explicit-any
        (meta__spec.props as any)[fieldName];
      invariant(
        !fieldName.startsWith("meta__"),
        ERROR_MESSAGE_RESERVED_FIELD_NAME,
      );
      const fieldDescriptor: PropertyDescriptor = {};
      if (!("isPrimative" in subSpec)) {
        const proxy = new BufferProxyObject(
          dataViewSource,
          relativeByteOffset,
          subSpec,
          Object.assign({}, meta__options, { parent: this }),
        );
        fieldDescriptor.get = () => proxy;
      } else {
        fieldDescriptor.get = () => {
          return subSpec.read(
            dataViewSource,
            getByteOffset(this) + relativeByteOffset,
          );
        };
        if (!meta__options.readOnly) {
          fieldDescriptor.set = (v: Iface[keyof Iface]) => {
            subSpec.write(
              dataViewSource,
              getByteOffset(this) + relativeByteOffset,
              v,
            );
            bytesRemainingByField[fieldName] = 0;
          };
        }
      }
      propertyDescriptors[fieldName] = fieldDescriptor;
    }
    Object.defineProperties(instance, propertyDescriptors);
    return instance as unknown as BufferProxyObject<Iface, Klass>;
  }
}

export class ValueBoxStacker {
  #byteOffset: number;
  constructor(byteOffset = 0) {
    this.#byteOffset = byteOffset;
  }
  box<Iface>(
    Value: IBufferValueSpec<Iface>,
  ) {
    const byteLength = getByteLength(Value);
    const byteOffset = this.#byteOffset;
    this.#byteOffset += byteLength;
    return [byteOffset, Value] as const;
  }
  fork() {
    return new ValueBoxStacker(this.#byteOffset);
  }
}

// deno-lint-ignore no-explicit-any
export function asPlainObject<T extends Record<string, any>>(
  proxy: IBufferProxyObject<T>,
) {
  return proxy as T;
}

// TODO unifiy with ECS typedefs (Vec2SmallType, Vec2LargeType)
export const Vec2SmallSpec: IBufferProxyObjectSpec<Vec2Instance> = {
  props: {
    x: [0, PrimitiveValue.Int8],
    y: [1, PrimitiveValue.Int8],
  },
  Klass: Vec2Instance,
};

export const Vec2LargeSpec: IBufferProxyObjectSpec<Vec2Instance> = {
  props: {
    x: [0, PrimitiveValue.Int32],
    y: [4, PrimitiveValue.Int32],
  },
  Klass: Vec2Instance,
};

export const MAX_BYTE_LENGTH = 64; // arbitrary, seems like plenty for now
const tempBuffer = new ArrayBuffer(MAX_BYTE_LENGTH);
export function getDataView(buffer: ArrayBuffer, byteOffset: number): DataView {
  invariant(
    byteOffset < buffer.byteLength,
    "byteOffset exceeds length of buffer",
  );
  const byteLength = MAX_BYTE_LENGTH;
  if (byteOffset + byteLength <= buffer.byteLength) {
    return new DataView(buffer, byteOffset, byteLength);
  } else {
    const newView = new DataView(tempBuffer);
    const originalView = new DataView(buffer);

    let newIndex = 0;
    for (
      let i = byteOffset;
      i < buffer.byteLength && newIndex < byteLength;
      i++, newIndex++
    ) {
      const value = originalView.getUint8(i);
      newView.setUint8(newIndex, value);
    }

    for (
      let i = 0;
      i < buffer.byteLength && newIndex < byteLength;
      i++, newIndex++
    ) {
      const value = originalView.getUint8(i);
      newView.setUint8(newIndex, value);
    }

    return newView;
  }
}
