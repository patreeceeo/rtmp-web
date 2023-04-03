import { DataViewMovable } from "./DataView.ts";
import {
  BinaryObjectAdaptor,
  boolAdaptor,
  networkIdAdaptor,
  uint16Adaptor,
  vec2Adaptor,
} from "./BinaryAdaptor.ts";
import { NetworkId } from "./state/Network.ts";
import { ColorId } from "./state/Player.ts";
import { Vec2 } from "./Vec2.ts";

export interface IPayload {
  sid: number;
  nid: number;
  write(buf: DataViewMovable): void;
}

export interface IPayloadMutable extends IPayload {
  read(buf: DataViewMovable): void;
  copy(payload: this): void;
}

const nilAdaptor = new BinaryObjectAdaptor<NilPayload>([
  ["sid", uint16Adaptor],
  ["nid", networkIdAdaptor],
]);

export class NilPayload implements IPayload {
  constructor(readonly nid: NetworkId, readonly sid: number) {}
  write(buf: DataViewMovable): void {
    nilAdaptor.write(buf, this);
  }
}

export class NilPayloadMutable extends NilPayload implements IPayloadMutable {
  constructor(public nid: NetworkId, public sid: number) {
    super(nid, sid);
  }
  read(buf: DataViewMovable): void {
    nilAdaptor.read(buf, this);
  }
  copy(source: NilPayloadMutable) {
    this.nid = source.nid;
    this.sid = source.sid;
  }
}

const playerMoveAdaptor = new BinaryObjectAdaptor<PlayerMove>([
  ["sid", uint16Adaptor],
  ["delta", vec2Adaptor],
  ["nid", networkIdAdaptor],
]);

export class PlayerMove implements IPayload {
  constructor(
    readonly delta: Vec2,
    readonly nid: NetworkId,
    readonly sid: number,
  ) {}
  write(buf: DataViewMovable): void {
    playerMoveAdaptor.write(buf, this);
  }
}

export class PlayerMoveMutable extends PlayerMove implements IPayloadMutable {
  constructor(public delta: Vec2, public nid: NetworkId, public sid: number) {
    super(delta, nid, sid);
  }
  read(buf: DataViewMovable): void {
    playerMoveAdaptor.read(buf, this);
  }
  copy(move: PlayerMove) {
    this.delta.copy(move.delta);
    this.nid = move.nid;
    this.sid = move.sid;
  }
}

const playerAddAdaptor = new BinaryObjectAdaptor<PlayerAdd>([
  ["sid", uint16Adaptor],
  ["position", vec2Adaptor],
  // TODO figure out why TSC complains about this
  // deno-lint-ignore no-explicit-any
  ["isLocal", boolAdaptor as any],
  // TODO figure out why TSC complains about this
  // deno-lint-ignore no-explicit-any
  ["nid", networkIdAdaptor as any],
]);

export class PlayerAdd implements IPayload {
  constructor(
    readonly position: Vec2,
    readonly isLocal: boolean,
    readonly nid: NetworkId,
    readonly sid: number,
  ) {}
  write(buf: DataViewMovable): void {
    playerAddAdaptor.write(buf, this);
  }
}

export class PlayerAddMutable extends PlayerAdd implements IPayloadMutable {
  constructor(
    public position: Vec2,
    public isLocal: boolean,
    public nid: NetworkId,
    public sid: number,
  ) {
    super(position, isLocal, nid, sid);
  }
  read(buf: DataViewMovable): void {
    playerAddAdaptor.read(buf, this);
  }
  copy(source: PlayerAdd) {
    this.position.copy(source.position);
    this.isLocal = source.isLocal;
    this.nid = source.nid;
  }
}

const playerRemoveAdaptor = new BinaryObjectAdaptor<PlayerRemove>([
  ["sid", uint16Adaptor],
  ["nid", networkIdAdaptor],
]);

export class PlayerRemove implements IPayload {
  constructor(
    readonly nid: NetworkId,
    readonly sid: number,
  ) {}
  write(buf: DataViewMovable): void {
    playerRemoveAdaptor.write(buf, this);
  }
}

export class PlayerRemoveMutable extends PlayerRemove
  implements IPayloadMutable {
  constructor(
    public nid: NetworkId,
    public sid: number,
  ) {
    super(nid, sid);
  }
  read(buf: DataViewMovable): void {
    playerRemoveAdaptor.read(buf, this);
  }
  copy(source: PlayerRemove) {
    this.nid = source.nid;
  }
}

const colorChangeAdaptor = new BinaryObjectAdaptor<ColorChange>([
  ["sid", uint16Adaptor],
  ["color", uint16Adaptor],
  ["nid", networkIdAdaptor],
]);

export class ColorChange implements IPayload {
  constructor(
    readonly color: ColorId,
    readonly nid: NetworkId,
    readonly sid: number,
  ) {}
  write(buf: DataViewMovable): void {
    colorChangeAdaptor.write(buf, this);
  }
}

export class ColorChangeMutable extends ColorChange implements IPayloadMutable {
  constructor(
    public color: ColorId,
    public nid: NetworkId,
    public sid: number,
  ) {
    super(color, nid, sid);
  }
  read(buf: DataViewMovable): void {
    colorChangeAdaptor.read(buf, this);
  }
  copy(source: ColorChange) {
    this.color = source.color;
  }
}

export enum MessageType {
  nil,
  playerAdded,
  playerRemoved,
  playerMoved,
  colorChange,
}
export type MessagePlayloadByType = {
  [MessageType.nil]: NilPayload;
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
}

/** TODO deprecate? */
export class Message<Type extends MessageType> implements IMessage<Type> {
  constructor(
    readonly type: Type,
    readonly payload: MessagePlayloadByType[Type],
  ) {
  }
  write(buf: DataViewMovable): void {
    writeMessage(buf, this.type, this.payload);
  }
}

export function writeMessage<Type extends MessageType>(
  buf: DataViewMovable,
  type: Type,
  payload: MessagePlayloadByType[Type],
) {
  buf.writeUint8(type);
  payload.write(buf);
}

export interface IMessageMutable<Type extends MessageType>
  extends IMessage<Type> {
  payload: MessageMutablePlayloadByType[Type];
  read(buf: DataViewMovable): void;
  set(type: MessageType, payload: AnyMessagePayload): void;
}

export function createPayloadMap(): MessageMutablePlayloadByType {
  return {
    [MessageType.nil]: new NilPayloadMutable(0 as NetworkId, 0),
    [MessageType.playerAdded]: new PlayerAddMutable(
      new Vec2(),
      false,
      0 as NetworkId,
      0,
    ),
    [MessageType.playerRemoved]: new PlayerRemoveMutable(0 as NetworkId, 0),
    [MessageType.playerMoved]: new PlayerMoveMutable(
      new Vec2(),
      0 as NetworkId,
      0,
    ),
    [MessageType.colorChange]: new ColorChangeMutable(
      ColorId.BLUE,
      0 as NetworkId,
      0,
    ),
  };
}

const payloadMap = createPayloadMap();

/** TODO deprecate */
export class MessageMutable<Type extends MessageType> extends Message<Type>
  implements IMessageMutable<Type> {
  constructor(
    public type: Type,
    public payload: MessageMutablePlayloadByType[Type],
  ) {
    super(type, payload);
  }
  read(buf: DataViewMovable): void {
    const [type, payload] = readMessage(buf, payloadMap);
    this.type = type as Type;
    // deno-lint-ignore no-explicit-any
    this.payload = payload as any;
  }
  set<NewType extends MessageType>(
    type: NewType,
    payload: MessagePlayloadByType[NewType],
  ) {
    // TODO this is one of those cases where typescript seems to mostly
    // just get in the way..?
    const msg = this as unknown as IMessageMutable<NewType>;
    msg.type = type;
    msg.payload = payloadMap[type];
    // deno-lint-ignore no-explicit-any
    msg.payload.copy(payload as any);
  }
}

export function readMessage<Type extends MessageType>(
  buf: DataViewMovable,
  payloadMap: MessageMutablePlayloadByType,
): [Type, MessagePlayloadByType[Type]] {
  const type = buf.readUint8() as Type;
  const initialOffset = buf.byteOffset;
  if (type in payloadMap) {
    const payload = payloadMap[type];
    payload.read(buf);
    return [type, payload];
  }
  buf.jump(initialOffset);
  throw new Error("Did not find a payload for type " + type);
}

export function* readMessages(
  n: number,
  buf: DataViewMovable,
  payloadMap: MessageMutablePlayloadByType,
  options: { rewind?: boolean } = {},
): Generator<[MessageType, AnyMessagePayload]> {
  let remaining = n;
  const initialByteOffset = buf.byteOffset;
  while (remaining > 0) {
    yield readMessage(buf, payloadMap);
    remaining--;
  }
  if (options.rewind) {
    buf.jump(initialByteOffset);
  }
}

export type IAnyMessage = IMessage<MessageType>;
export type IAnyMessageMutable = IMessageMutable<MessageType>;
export type AnyMessagePayload = MessagePlayloadByType[MessageType];

const resusedBuffer = new DataViewMovable(new ArrayBuffer(128));
export function parseMessage<Type extends MessageType>(
  serializedData: ArrayBuffer,
  payloadMap: MessageMutablePlayloadByType,
): [Type, MessagePlayloadByType[Type]] {
  const buf = new DataViewMovable(serializedData);
  return readMessage(buf, payloadMap);
}

export function serializeMessage<Type extends MessageType>(
  type: Type,
  payload: MessagePlayloadByType[Type],
): ArrayBufferLike {
  writeMessage(resusedBuffer, type, payload);
  resusedBuffer.reset();
  return resusedBuffer.buffer;
}
