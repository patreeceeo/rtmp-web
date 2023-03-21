import {
  MessagePlayloadByType,
  MessageType,
  parseMessage,
  PlayerAdd,
  serializeMessage,
} from "~/common/Message.ts";
import { Client, NetworkState } from "~/common/state/Network.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { broadcast, sendIfOpen } from "~/common/socket.ts";
import { Time } from "~/common/state/Time.ts";
import { TimeSystem } from "~/common/systems/Time.ts";
import {
  addPlayerMoveFromClient,
  MovementSystem,
} from "~/common/systems/Movement.ts";
import { NetworkSystem } from "~/common/systems/Network.ts";
import { startPipeline, SystemPartial } from "~/common/systems/mod.ts";
import { ServerApp, startServer } from "~/server/mod.ts";

const systems = [TimeSystem(), MovementSystem(), NetworkSystem()] as Array<
  SystemPartial
>;

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
    addPlayerMoveFromClient(move);
  },
};

class DotsServerApp implements ServerApp {
  handleOpen(client: WebSocket, _: Event) {
    const addedPlayer = PlayerState.createPlayer();
    addedPlayer.position.set(100, 100);
    const nid = NetworkState.createId();
    NetworkState.setNetworkEntity(nid, addedPlayer.eid, false);
    NetworkState.setClient(new Client(nid, client, Time.elapsed));
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
  }

  handleClose(ws: WebSocket, _: Event) {
    const client = NetworkState.getClientForSocket(ws);
    if (client) {
      const eid = NetworkState.getEntityId(client!.nid);
      PlayerState.deletePlayer(eid!);
      NetworkState.removeClient(client.nid);
      broadcast(
        NetworkState.getClientSockets(),
        serializeMessage(MessageType.playerRemoved, client.nid),
      );
    }
  }

  handleError(_client: WebSocket, message: Event) {
    console.error("Error!", message);
  }

  handleMessage(client: WebSocket, message: MessageEvent) {
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
  }
}

startPipeline(systems, 80);
startServer(new DotsServerApp());
