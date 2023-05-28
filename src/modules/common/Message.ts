import { DataViewMovable } from "./DataView.ts";
import {
  asPlainObject,
  createBufferProxyObjectConstructor,
  IBufferProxyObjectConstructor,
  IBufferProxyObjectSpec,
  MAX_BYTE_LENGTH,
} from "./BufferValue.ts";
import { invariant } from "./Error.ts";

export const MAX_MESSAGE_BYTE_LENGTH = MAX_BYTE_LENGTH;

// deno-lint-ignore no-explicit-any
export type IPayloadAny = Record<string, any>;

export interface IMessageDef<P> {
  type: number;
  byteLength: number;
  write(
    view: DataViewMovable,
    byteOffset: number,
    writePayload: IWritePayload<P>,
  ): P;
}

export type IMessageDefAny = IMessageDef<IPayloadAny>;

export interface IWritePayload<P> {
  (payload: P): void;
}

class MessageDef<P extends IPayloadAny> implements IMessageDef<P> {
  byteLength: number;
  constructor(
    readonly type: number,
    readonly Payload: IBufferProxyObjectConstructor<P>,
  ) {
    this.byteLength = Payload.byteLength + 1;
    invariant(
      this.byteLength <= MAX_MESSAGE_BYTE_LENGTH,
      `message type ${type} exceeds the maximum length by ${
        this.byteLength - MAX_MESSAGE_BYTE_LENGTH
      } bytes`,
    );
  }
  write(
    view: DataViewMovable,
    byteOffset: number,
    writePayload: IWritePayload<P>,
  ): P {
    view.setUint8(byteOffset, this.type);
    const payload = new this.Payload(view, byteOffset + 1);
    writePayload(payload);
    const bytesRemaining = payload.meta__bytesRemaining;
    // TODO should be equal to 0, but there's a bug in BufferProxyObject
    invariant(
      bytesRemaining <= 0,
      `Payload should be completely written. There are ${bytesRemaining} bytes remaining`,
    );
    return payload;
  }
}

const messageDefsByType: Array<IMessageDefAny> = [];

export function defMessageType<P extends IPayloadAny>(
  // TODO use opaque type?
  type: number,
  spec: IBufferProxyObjectSpec<P>,
): IMessageDef<P> {
  const Payload = createBufferProxyObjectConstructor(spec);
  const def = new MessageDef(type, Payload);
  invariant(!(type in messageDefsByType), `redefining message type ${type}`);
  messageDefsByType[type] = def;
  return def;
}

export function reset() {
  messageDefsByType.length = 0;
}

export function getMessageDef(type: number) {
  invariant(
    type in messageDefsByType,
    `Could not find a message definition for type ${type}`,
  );
  return messageDefsByType[type];
}

export function readMessageType(
  view: DataViewMovable,
  byteOffset: number,
): number {
  return view.getUint8(byteOffset);
}

export function readMessagePayload<P extends IPayloadAny = IPayloadAny>(
  view: DataViewMovable,
  byteOffset: number,
  type = readMessageType(view, byteOffset),
): P {
  const def = getMessageDef(type) as MessageDef<P>;

  return asPlainObject(
    new def.Payload(view, byteOffset + 1, { readOnly: true }),
  );
}

export function readPingId(view: DataViewMovable, byteOffset: number): number {
  return view.getUint8(byteOffset + 1);
}

export function readMessage<P extends IPayloadAny = IPayloadAny>(
  view: DataViewMovable,
  byteOffset: number,
): [number, P] {
  const type = readMessageType(view, byteOffset);

  return [
    type,
    readMessagePayload(view, byteOffset, type),
  ];
}

export function copyMessage(
  src: DataViewMovable,
  srcByteOffset: number,
  dest: DataViewMovable,
  destByteOffset: number,
) {
  const type = readMessageType(src, srcByteOffset);
  const MsgDef = getMessageDef(type);
  for (let byteIndex = 0; byteIndex < MsgDef.byteLength; byteIndex++) {
    dest.setUint8(
      destByteOffset + byteIndex,
      src.getUint8(srcByteOffset + byteIndex),
    );
  }
  return MsgDef;
}
