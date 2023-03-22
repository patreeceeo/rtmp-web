import { SerializedData } from "../common/socket.ts";
import { NetworkId } from "./state/Network.ts";
import { ColorId } from "./state/Player.ts";
import { Vec2 } from "./Vec2.ts";

export interface IPlayerMove {
  delta: Vec2
  nid: NetworkId
  /** sequence number */
  sid: number
}
export class PlayerMove implements IPlayerMove {
  constructor(readonly delta: Vec2, readonly nid: NetworkId, readonly sid: number) {}
}
export class PlayerMoveWritable implements IPlayerMove {
  constructor(public delta = new Vec2(), public nid = 0 as NetworkId, public sid = 0) {}
  copy(src: IPlayerMove) {
    this.delta.copy(src.delta)
    this.nid = src.nid
    this.sid = src.sid
  }
}

export class PlayerAdd {
  constructor(
    readonly position: Vec2,
    readonly isLocal: boolean,
    readonly nid: NetworkId,
  ) {}
}

export class ColorChange {
  constructor(
    readonly color: ColorId,
    readonly nid: NetworkId
  ) {}
}

export enum MessageType {
  playerAdded = "+",
  playerRemoved = "-",
  playerMoved = ">",
  colorChange = 'c'
}
export type MessagePlayloadByType = {
  [MessageType.playerAdded]: PlayerAdd;
  [MessageType.playerRemoved]: NetworkId;
  [MessageType.playerMoved]: PlayerMove;
  [MessageType.colorChange]: ColorChange;
};

export interface Message<Type extends MessageType> {
  type: Type;
  payload: MessagePlayloadByType[Type];
}
export type MessageArgs<Type extends MessageType> = [
  Type,
  MessagePlayloadByType[Type]
]

// TODO replace all instances of AnyMessage with AnyMessageArgs?
export type AnyMessage = Message<MessageType>;
export type AnyMessageArgs = MessageArgs<MessageType>;
export type AnyMessagePayload = MessagePlayloadByType[MessageType];

const payloadParsersByType: Record<
  keyof MessagePlayloadByType,
  (data: string) => MessagePlayloadByType[keyof MessagePlayloadByType]
> = {
  [MessageType.playerAdded]: (json) => {
    const obj = JSON.parse(json);
    const position = obj["position"];
    return new PlayerAdd(
      new Vec2(position.x, position.y),
      obj["isLocal"],
      obj["nid"],
    );
  },
  [MessageType.playerRemoved]: (json) => parseInt(json) as NetworkId,
  [MessageType.playerMoved]: (json) => {
    const obj = JSON.parse(json);
    const nid = obj["nid"];
    const delta = obj["delta"];
    const sid = obj["sid"];
    return new PlayerMove(new Vec2(delta.x, delta.y), nid, sid);
  },
  [MessageType.colorChange]: (json) => {
    const obj = JSON.parse(json);
    const nid = obj["nid"];
    const color = obj["color"];
    return new ColorChange(color, nid);
  },
};
const payloadSerializersByType: Record<
  keyof MessagePlayloadByType,
  (data: MessagePlayloadByType[keyof MessagePlayloadByType]) => string
> = {
  [MessageType.playerAdded]: JSON.stringify,
  [MessageType.playerRemoved]: JSON.stringify,
  [MessageType.playerMoved]: JSON.stringify,
  [MessageType.colorChange]: JSON.stringify,
};

export function parseMessage(serializedData: SerializedData): AnyMessage {
  // TODO(optimize) use typed arrays / protobuf / binary
  const dataString = serializedData.toString();
  const type = dataString[0] as MessageType;
  const payload = payloadParsersByType[type](dataString.slice(1));
  return {
    type,
    payload,
  };
}

export function serializeMessage<Type extends MessageType>(
  type: Type,
  payload: MessagePlayloadByType[Type],
): SerializedData {
  const payloaString = payloadSerializersByType[type](payload);
  return `${type}${payloaString}`;
}
