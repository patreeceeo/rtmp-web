import { DataViewMovable } from "./DataView.ts";
import {
  asPlainObject,
  createBufferProxyObjectConstructor,
  IBufferProxyObjectConstructor,
  IBufferProxyObjectSpec,
} from "./BufferValue.ts";
import { invariant } from "./Error.ts";

export const MAX_MESSAGE_BYTE_LENGTH = 32; // arbitrary, seems like plenty for now

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
    const { bytesRemaining } = payload.meta;
    // TODO
    invariant(
      bytesRemaining === 0,
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
  return messageDefsByType[type];
}

export function readMessage<P extends IPayloadAny = IPayloadAny>(
  view: DataViewMovable,
  byteOffset: number,
): [number, P] {
  const type = readMessageType(view, byteOffset);
  const def = getMessageDef(type) as MessageDef<P>;

  return [
    type,
    asPlainObject(new def.Payload(view, byteOffset + 1, { readOnly: true })),
  ];
}

function readMessageType(view: DataViewMovable, byteOffset: number): number {
  return view.getUint8(byteOffset);
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
