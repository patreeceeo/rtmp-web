import { ByteBuffer } from './ByteBuffer.ts'
import { BinaryObjectAdaptor, boolAdaptor, networkIdAdaptor, uint16Adaptor, vec2Adaptor } from './BinaryAdaptor.ts';
import { NetworkId } from "./state/Network.ts";
import { ColorId } from "./state/Player.ts";
import { Vec2 } from "./Vec2.ts";

export interface IPayload {
  write(buf: ByteBuffer): void
}

export interface IPayloadMutable extends IPayload {
  read(buf: ByteBuffer): void
}

export class NilPayloadMutable implements IPayloadMutable {
  write(_buf: ByteBuffer): void {
  }
  read(_buf: ByteBuffer): void {
  }
}

const playerMoveAdaptor = new BinaryObjectAdaptor<PlayerMove>([
  ['delta', vec2Adaptor],
  ['nid', networkIdAdaptor],
  ['sid', uint16Adaptor]
])

export class PlayerMove implements IPayload {
  constructor(readonly delta: Vec2, readonly nid: NetworkId, readonly sid: number) {}
  write(buf: ByteBuffer): void {
    playerMoveAdaptor.write(buf, this)
  }
}

export class PlayerMoveMutable extends PlayerMove implements IPayloadMutable {
  constructor(public delta: Vec2, public nid: NetworkId, public sid: number) {
    super(delta, nid, sid)
  }
  read(buf: ByteBuffer): void {
    playerMoveAdaptor.read(buf, this)
  }
  copy(move: PlayerMove) {
    this.delta.copy(move.delta)
    this.nid = move.nid
    this.sid = move.sid
  }
}

const playerAddAdaptor = new BinaryObjectAdaptor<PlayerAdd>([
  ['position', vec2Adaptor],
  // TODO figure out why TSC complains about this
  // deno-lint-ignore no-explicit-any
  ['isLocal', boolAdaptor as any],
  // TODO figure out why TSC complains about this
  // deno-lint-ignore no-explicit-any
  ['nid', networkIdAdaptor as any]
]);

export class PlayerAdd implements IPayload {
  constructor(
    readonly position: Vec2,
    readonly isLocal: boolean,
    readonly nid: NetworkId,
  ) {}
  write(buf: ByteBuffer): void {
    playerAddAdaptor.write(buf, this)
  }
}

export class PlayerAddMutable extends PlayerAdd implements IPayloadMutable {
  constructor(
    public position: Vec2,
    public isLocal: boolean,
    public nid: NetworkId,
  ) {
    super(position, isLocal, nid)
  }
  read(buf: ByteBuffer): void {
    playerAddAdaptor.read(buf, this)
  }
}

export class PlayerRemove implements IPayload {
  constructor(
    readonly nid: NetworkId,
  ) {}
  write(buf: ByteBuffer): void {
    networkIdAdaptor.write(buf, this.nid)
  }
}

export class PlayerRemoveMutable extends PlayerRemove implements IPayloadMutable {
  constructor(
    public nid: NetworkId,
  ) {
    super(nid)
  }
  read(buf: ByteBuffer): void {
    this.nid = networkIdAdaptor.read(buf)
  }
}

const colorChangeAdaptor = new BinaryObjectAdaptor<ColorChange>([
  ['color', uint16Adaptor],
  ['nid', networkIdAdaptor]
])

export class ColorChange implements IPayload {
  constructor(
    readonly color: ColorId,
    readonly nid: NetworkId
  ) {}
  write(buf: ByteBuffer): void {
    colorChangeAdaptor.write(buf, this)
  }
}

export class ColorChangeMutable extends ColorChange implements IPayloadMutable {
  constructor(
    public color: ColorId,
    public nid: NetworkId
  ) {
    super(color, nid)
  }
  read(buf: ByteBuffer): void {
    colorChangeAdaptor.read(buf, this)
  }
}

export enum MessageType {
  nil,
  playerAdded,
  playerRemoved,
  playerMoved,
  colorChange
}
export type MessagePlayloadByType = {
  [MessageType.nil]: NilPayloadMutable;
  [MessageType.playerAdded]: PlayerAdd;
  [MessageType.playerRemoved]: PlayerRemove;
  [MessageType.playerMoved]: PlayerMove;
  [MessageType.colorChange]: ColorChange;
};
export type MessageMutablePlayloadByType = {
  [MessageType.nil]: NilPayloadMutable;
  [MessageType.playerAdded]: PlayerAddMutable;
  [MessageType.playerRemoved]: PlayerRemoveMutable;
  [MessageType.playerMoved]: PlayerMoveMutable;
  [MessageType.colorChange]: ColorChangeMutable;
};

export interface IMessage<Type extends MessageType> {
  type: Type;
  payload: MessagePlayloadByType[Type];
  write(buf: ByteBuffer): void;
}


export class Message<Type extends MessageType> implements IMessage<Type> {
  constructor(readonly type: Type, readonly payload: MessagePlayloadByType[Type]){
  }
  write(buf: ByteBuffer): void {
    buf.writeUint8(this.type)
    this.payload.write(buf)
  }
}


export interface IMessageMutable<Type extends MessageType> extends IMessage<Type> {
  read(buf: ByteBuffer): void
}

const payloadMap: MessageMutablePlayloadByType = {
  [MessageType.nil]: new NilPayloadMutable(),
  [MessageType.playerAdded]: new PlayerAddMutable(new Vec2(), false, 0 as NetworkId),
  [MessageType.playerRemoved]: new PlayerRemoveMutable(0 as NetworkId),
  [MessageType.playerMoved]: new PlayerMoveMutable(new Vec2(), 0 as NetworkId, 0),
  [MessageType.colorChange]: new ColorChangeMutable(ColorId.BLUE, 0 as NetworkId)
}

export class MessageMutable<Type extends MessageType> extends Message<Type> implements IMessageMutable<Type> {
  constructor(public type: Type, public payload: MessageMutablePlayloadByType[Type]){
    super(type, payload)
  }
  read(buf: ByteBuffer): void {
    this.type = buf.readUint8() as Type
    this.payload = payloadMap[this.type]
    this.payload.read(buf)
  }
}

export type IAnyMessage = IMessage<MessageType>;
export type IAnyMessageMutable = IMessageMutable<MessageType>;
export type AnyMessagePayload = MessagePlayloadByType[MessageType];

const resusedBuffer = new ByteBuffer(new ArrayBuffer(128))
const reusedMessage = new MessageMutable(MessageType.nil, new NilPayloadMutable()) as IAnyMessageMutable
export function parseMessage(serializedData: ArrayBuffer): IAnyMessage {
  const buf = new ByteBuffer(serializedData)
  reusedMessage.read(buf)
  return reusedMessage
}


export function serializeMessage<Type extends MessageType>(
  type: Type,
  payload: MessagePlayloadByType[Type],
): ArrayBufferLike {
  reusedMessage.type = type
  reusedMessage.payload = payload
  reusedMessage.write(resusedBuffer)
  resusedBuffer.reset()
  return resusedBuffer.buffer
}
