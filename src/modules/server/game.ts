import { clampLine } from "../common/math.ts";
import {
  serializeMessage,
  parseMessage,
MessageType,
MessagePlayloadByType,
PlayerMove
} from "../common/Message.ts";

import { sendIfOpen, SerializedData } from "../common/socket.ts";
import { PlayerState } from "../common/State.ts";
// TODO use array
const connectedClients = new Map<number, WebSocket>();
// TODO use weakmap?
const connectedClientsReverse = new Map<WebSocket, number>();

// send a message to all connected clients
function broadcast(
  message: SerializedData,
) {
  for (const client of connectedClients.values()) {
    sendIfOpen(client, message);
  }
}

export const handleOpen = (client: WebSocket, _: Event) => {
  const addedPlayer = PlayerState.createPlayer()

  connectedClients.set(addedPlayer.nid, client);
  connectedClientsReverse.set(client, addedPlayer.nid);
  sendIfOpen(client, serializeMessage(MessageType.playerAdded, {isLocal: true, player: addedPlayer}));
  broadcast(serializeMessage(MessageType.playerAdded, {isLocal: false, player: addedPlayer}));
  for(const player of PlayerState.getPlayers()) {
    sendIfOpen(client, serializeMessage(MessageType.playerAdded, {isLocal: false, player}));
  }
};

export const handleClose = (client: WebSocket, _: Event) => {
  const nid = connectedClientsReverse.get(client);
  connectedClientsReverse.delete(client);
  if (nid) {
    connectedClients.delete(nid);
    PlayerState.deletePlayer(nid)
    broadcast(serializeMessage(MessageType.playerRemoved, nid));
  }
};

export const handleError = (_client: WebSocket, message: Event) => {
  console.error("Error!", message)
};

export const handleMessage = (client: WebSocket, message: MessageEvent) => {
  const parsedMessage = parseMessage(message.data)

  if(parsedMessage.type in socketRouter) {
    const handler = socketRouter[parsedMessage.type as keyof typeof socketRouter];
    handler(client, parsedMessage.payload as ServerMessagePlayloadByType[keyof ServerMessagePlayloadByType]);
  } else {
    console.warn("No handler for", parsedMessage.type);
  }
};

type ServerMessagePlayloadByType = Pick<MessagePlayloadByType, MessageType.playerMoved>

const socketRouter: Record<keyof ServerMessagePlayloadByType, (client: WebSocket, data: ServerMessagePlayloadByType[keyof ServerMessagePlayloadByType]) => void> = {
  [MessageType.playerMoved]: handlePlayerMoved,
};

const MAX_MOVE_DISTANCE = 5
const MAX_MOVE_DISTANCE_SQUARED = MAX_MOVE_DISTANCE * MAX_MOVE_DISTANCE
function handlePlayerMoved(_client: WebSocket, requestedMove: PlayerMove) {
  let move: PlayerMove
  if(PlayerState.getPlayerDistanceSquared(requestedMove.nid, requestedMove.to) < MAX_MOVE_DISTANCE_SQUARED) {
    move = requestedMove
  } else {
    const player = PlayerState.getPlayer(requestedMove.nid)
    const clamped = clampLine(player!.position, requestedMove.to, MAX_MOVE_DISTANCE)
    move = new PlayerMove(clamped!, requestedMove.nid)
  }
  PlayerState.movePlayer(requestedMove.nid, move.to)
  broadcast(serializeMessage(MessageType.playerMoved, move))
}
