import { clampLine, getDistanceSquared } from "../common/math.ts";
import {
  MessagePlayloadByType,
  MessageType,
  parseMessage,
  PlayerAdd,
  PlayerMove,
  serializeMessage,
} from "../common/Message.ts";

import { sendIfOpen, SerializedData } from "../common/socket.ts";
import { NetworkId, NetworkState } from "../common/state/Network.ts";
import { PlayerState } from "../common/state/Player.ts";
// TODO add this stuff to NetworkState?
// TODO use array
const connectedClients = new Map<NetworkId, WebSocket>();
// TODO use weakmap?
const connectedClientsReverse = new Map<WebSocket, NetworkId>();

// send a message to all connected clients
function broadcast(
  message: SerializedData,
  except?: WebSocket,
) {
  for (const client of connectedClients.values()) {
    if (except !== client) {
      sendIfOpen(client, message);
    }
  }
}

export const handleOpen = (client: WebSocket, _: Event) => {
  const addedPlayer = PlayerState.createPlayer();
  addedPlayer.position.set(100, 100);
  const nid = NetworkState.createId();
  NetworkState.setNetworkEntity(nid, addedPlayer.eid, false);

  connectedClients.set(nid, client);
  connectedClientsReverse.set(client, nid);
  sendIfOpen(
    client,
    serializeMessage(
      MessageType.playerAdded,
      new PlayerAdd(true, addedPlayer.position, nid),
    ),
  );

  // Tell other clients about added player
  broadcast(
    serializeMessage(
      MessageType.playerAdded,
      new PlayerAdd(false, addedPlayer.position, nid),
    ),
    client,
  );

  // Catch up
  for (const eid of PlayerState.getPlayerEids()) {
    const player = PlayerState.getPlayer(eid);
    if (eid !== addedPlayer.eid) {
      sendIfOpen(
        client,
        serializeMessage(
          MessageType.playerAdded,
          new PlayerAdd(false, player.position, NetworkState.getId(eid)!),
        ),
      );
    }
  }
};

export const handleClose = (client: WebSocket, _: Event) => {
  const nid = connectedClientsReverse.get(client);
  connectedClientsReverse.delete(client);
  if (nid) {
    const eid = NetworkState.getEntityId(nid);
    connectedClients.delete(nid);
    PlayerState.deletePlayer(eid!);
    broadcast(serializeMessage(MessageType.playerRemoved, nid));
  }
};

export const handleError = (_client: WebSocket, message: Event) => {
  console.error("Error!", message);
};

export const handleMessage = (client: WebSocket, message: MessageEvent) => {
  const parsedMessage = parseMessage(message.data);

  if (parsedMessage.type in socketRouter) {
    const handler =
      socketRouter[parsedMessage.type as keyof typeof socketRouter];
    handler(
      client,
      parsedMessage
        .payload as ServerMessagePlayloadByType[
          keyof ServerMessagePlayloadByType
        ],
    );
  } else {
    console.warn("No handler for", parsedMessage.type);
  }
};

type ServerMessagePlayloadByType = Pick<
  MessagePlayloadByType,
  MessageType.playerMoved
>;

const socketRouter: Record<
  keyof ServerMessagePlayloadByType,
  (
    client: WebSocket,
    data: ServerMessagePlayloadByType[keyof ServerMessagePlayloadByType],
  ) => void
> = {
  [MessageType.playerMoved]: handlePlayerMoved,
};

const MAX_MOVE_DISTANCE = 5;
const MAX_MOVE_DISTANCE_SQUARED = MAX_MOVE_DISTANCE * MAX_MOVE_DISTANCE;
function handlePlayerMoved(_client: WebSocket, requestedMove: PlayerMove) {
  const eid = NetworkState.getEntityId(requestedMove.nid);
  if (PlayerState.hasPlayer(eid!)) {
    const player = PlayerState.getPlayer(eid!);
    let move: PlayerMove;
    if (
      getDistanceSquared(player.position, requestedMove.to) <
        MAX_MOVE_DISTANCE_SQUARED
    ) {
      move = requestedMove;
    } else {
      const clamped = clampLine(
        player!.position,
        requestedMove.to,
        MAX_MOVE_DISTANCE,
      );
      move = new PlayerMove(clamped!, requestedMove.nid);
    }
    player.position.copy(move.to);
    broadcast(serializeMessage(MessageType.playerMoved, move));
  } else {
    console.warn(
      `Requested moving unknown player with nid ${requestedMove.nid}`,
    );
  }
}
