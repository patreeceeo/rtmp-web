import { ByteBuffer } from './ByteBuffer.ts'
import { NetworkId } from './state/Network.ts'
import { Vec2 } from './Vec2.ts'

export interface IBinaryFieldAdaptor<Type> {
  read(buf: ByteBuffer): Type
  write(buf: ByteBuffer, value: Type): void
}

class BoolAdaptor implements IBinaryFieldAdaptor<boolean> {
  read(buf: ByteBuffer): boolean {
    return buf.readBool()
  }
  write(buf: ByteBuffer, value: boolean): void {
    buf.writeBool(value)
  }
}

class Uint16Adaptor implements IBinaryFieldAdaptor<number> {
  read(buf: ByteBuffer): number {
    return buf.readUint16()
  }
  write(buf: ByteBuffer, value: number): void {
    buf.writeUint16(value)
  }
}
class Float64Adaptor implements IBinaryFieldAdaptor<number> {
  read(buf: ByteBuffer): number {
    return buf.readFloat64()
  }
  write(buf: ByteBuffer, value: number): void {
    buf.writeFloat64(value)
  }
}
class NetworkIdAdaptor implements IBinaryFieldAdaptor<number> {
  read(buf: ByteBuffer): NetworkId {
    return buf.readUint16() as NetworkId
  }
  write(buf: ByteBuffer, value: NetworkId): void {
    buf.writeUint16(value)
  }
}


export const boolAdaptor = new BoolAdaptor()
export const uint16Adaptor = new Uint16Adaptor()
export const float64Adaptor = new Float64Adaptor()
export const networkIdAdaptor = new NetworkIdAdaptor()


// deno-lint-ignore no-explicit-any
type IAnyBinaryAdaptor = BinaryObjectAdaptor<Record<string, any>> | IBinaryFieldAdaptor<any>
// deno-lint-ignore no-explicit-any
type IBinaryAdaptor<Type> = Type extends Record<string, any> ? BinaryObjectAdaptor<Type> : IBinaryFieldAdaptor<Type>

// deno-lint-ignore no-explicit-any
export class BinaryObjectAdaptor<Type extends Record<string, any>> {
  isObject = true
  #specMap: Record<string, IAnyBinaryAdaptor>
  constructor(readonly spec: Array<[keyof Type, IBinaryAdaptor<Type[keyof Type]>]>) {
    this.#specMap = Object.fromEntries(spec)
  }
  read(buf: ByteBuffer, target: Type) {
    for(const [fieldName, adaptor] of this.spec) {
      if("isObject" in adaptor) {
        adaptor.read(buf, target[fieldName]) as Type[keyof Type]
      } else {
        target[fieldName] = adaptor.read(buf) as Type[keyof Type]
      }
    }
    return target
  }
  write(buf: ByteBuffer, source: Type) {
    for(const [fieldName, fieldValue] of Object.entries(source)) {
      const adaptor = this.#specMap[fieldName] as IBinaryFieldAdaptor<Type[keyof Type]>
      adaptor.write(buf, fieldValue as Type[keyof Type])
    }
  }
}


export const vec2Adaptor = new BinaryObjectAdaptor<Vec2>([
  ['x', float64Adaptor],
  ['y', float64Adaptor]
])
