import { DataViewMovable } from "./DataView.ts";
import {
  asPlainObject,
  BufferProxyObject,
  IBufferProxyObject,
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

const NullBuffer = new ArrayBuffer(0);
const NullDataView = new DataViewMovable(NullBuffer);

class MessageDef<P extends IPayloadAny> implements IMessageDef<P> {
  byteLength: number;
  payload: BufferProxyObject<P>;
  constructor(
    readonly type: number,
    readonly spec: IBufferProxyObjectSpec<P>,
  ) {
    this.payload = new BufferProxyObject(NullDataView, 0, spec);
    this.byteLength = this.payload.meta__byteLength + 1;
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
    this.payload.meta__byteOffset = byteOffset + 1;
    this.payload.meta__dataViewSource = view;
    writePayload(this.payload as unknown as P);
    const bytesRemaining = this.payload.meta__bytesRemaining;
    invariant(
      bytesRemaining == 0,
      `Payload should be completely written. There are ${bytesRemaining} bytes remaining`,
    );
    return this.payload as unknown as P;
  }
}

const messageDefsByType: Array<IMessageDefAny> = [];

export function defMessageType<P extends IPayloadAny>(
  // TODO use opaque type?
  type: number,
  spec: IBufferProxyObjectSpec<P>,
): IMessageDef<P> {
  const def = new MessageDef(type, spec);
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

  def.payload.meta__dataViewSource = view;
  def.payload.meta__byteOffset = byteOffset + 1;

  return asPlainObject(
    def.payload as unknown as IBufferProxyObject<P>,
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
