import {
  MessagePlayloadByType,
  MessageType,
  parseMessage,
  PlayerAdd,
  serializeMessage,
} from "../common/Message.ts";

import { broadcast, sendIfOpen } from "../common/socket.ts";
import { Client, NetworkState } from "../common/state/Network.ts";
import { PlayerState } from "../common/state/Player.ts";
import { NetworkSystem } from "../common/systems/Network.ts";
import { TimeSystem } from "../common/systems/Time.ts";
import { startPipeline, SystemEventQueues, SystemPartial } from "../common/systems/mod.ts";
import { MovementSystem } from "../common/systems/Movement.ts";
import { Time } from "../common/state/Time.ts";

export const handleOpen = (client: WebSocket, _: Event) => {
  const addedPlayer = PlayerState.createPlayer();
  addedPlayer.position.set(100, 100);
  const nid = NetworkState.createId();
  NetworkState.setNetworkEntity(nid, addedPlayer.eid, false);
  NetworkState.setClient(new Client(nid, client, Time.elapsed))
  sendIfOpen(
    client,
    serializeMessage(
      MessageType.playerAdded,
      new PlayerAdd(true, addedPlayer.position, nid),
    ),
  );

  // Tell other clients about added player
  broadcast(
    NetworkState.getClientSockets(),
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

export const handleClose = (ws: WebSocket, _: Event) => {
  const client = NetworkState.getClientForSocket(ws)
  if(client) {
    const eid = NetworkState.getEntityId(client!.nid);
    PlayerState.deletePlayer(eid!);
    NetworkState.removeClient(client.nid);
    broadcast(NetworkState.getClientSockets(),  serializeMessage(MessageType.playerRemoved, client.nid));
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

const systems = [TimeSystem(), MovementSystem(), NetworkSystem()] as Array<SystemPartial>

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
  [MessageType.playerMoved]: (_client, move) => {
    eventQueues.addPlayerMove(move.nid, move.delta)
  },
};

const eventQueues = new SystemEventQueues()

startPipeline(systems, 80, eventQueues)
