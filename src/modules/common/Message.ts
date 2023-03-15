import { SerializedData } from "../common/socket.ts";
import { NetworkId, Player, Vec2 } from "../common/State.ts";

export class PlayerMove {
  constructor(readonly to: Vec2, readonly nid: NetworkId) {}
}

export enum MessageType {
  playerAdded,
  playerRemoved,
  playerMoved,
}
export type MessagePlayloadByType = {
  [MessageType.playerAdded]: {isLocal: boolean, player: Player},
  [MessageType.playerRemoved]: NetworkId,
  [MessageType.playerMoved]: PlayerMove
}

export interface Message<Type extends MessageType> {
  type: Type;
  payload: MessagePlayloadByType[Type];
}

export type AnyMessage = Message<MessageType>

const payloadParsersByType: Record<keyof MessagePlayloadByType, (data: string) => MessagePlayloadByType[keyof MessagePlayloadByType]> = {
  [MessageType.playerAdded]: (json) => {
    const obj = JSON.parse(json)
    const player = obj["player"]
    const position = player["position"]
    return {isLocal: obj["isLocal"], player: new Player(player["nid"], new Vec2(position.x, position.y))}
  },
  [MessageType.playerRemoved]: JSON.parse,
  [MessageType.playerMoved]: JSON.parse,
}
const payloadSerializersByType: Record<keyof MessagePlayloadByType, (data: MessagePlayloadByType[keyof MessagePlayloadByType]) => string> = {
  [MessageType.playerAdded]: JSON.stringify,
  [MessageType.playerRemoved]: JSON.stringify,
  [MessageType.playerMoved]: JSON.stringify,
}

export function parseMessage(serializedData: SerializedData): AnyMessage {
  // TODO(optimize) use typed arrays / protobuf / binary
  const dataString = serializedData.toString()
  const type = parseInt(dataString[0]) as MessageType
  const payload = payloadParsersByType[type](dataString.slice(1))
  return {
    type,
    payload
  }
}

export function serializeMessage<Type extends MessageType>(type: Type, payload: MessagePlayloadByType[Type]) {
  const typeString = type.toString()
  const payloaString = payloadSerializersByType[type](payload)
  return `${typeString}${payloaString}`
}
