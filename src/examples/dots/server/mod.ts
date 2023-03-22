import {
ColorChange,
  MessagePlayloadByType,
  MessageType,
  parseMessage,
  PlayerAdd,
  PlayerMove,
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
import { NetworkSystem } from "~/server/systems/Network.ts";
import { broadcastMessage, startPipeline, SystemPartial } from "~/common/systems/mod.ts";
import { ServerApp, startServer } from "~/server/mod.ts";
import { WORLD_DIMENSIONS } from "../mod.ts";

const idleTimeout = 6
const systems = [TimeSystem(), MovementSystem(), NetworkSystem({idleTimeout})] as Array<
  SystemPartial
>;

type ServerMessagePlayloadByType = Pick<
  MessagePlayloadByType,
  MessageType.playerMoved | MessageType.colorChange
>;

const socketRouter: Record<
  keyof ServerMessagePlayloadByType,
  (
    client: WebSocket,
    data: ServerMessagePlayloadByType[keyof ServerMessagePlayloadByType],
  ) => void
> = {
  [MessageType.playerMoved]: (_client, move) => {
    addPlayerMoveFromClient(move as PlayerMove);
  },
  [MessageType.colorChange]: (_client, cc) => {
    const eid = NetworkState.getEntityId(cc.nid)
    const player = PlayerState.getPlayer(eid!)
    player.color = (cc as ColorChange).color
    player.lastActiveTime = Time.elapsed
    broadcastMessage(MessageType.colorChange, cc, cc.nid)
  },
};

function getRandomInt(min: number, max: number) {
  return Math.round(Math.random() * max) + min
}

class DotsServerApp implements ServerApp {
  idleTimeout = idleTimeout
  handleOpen(client: WebSocket, _: Event) {
    const addedPlayer = PlayerState.createPlayer();
    addedPlayer.position.set(getRandomInt(0, WORLD_DIMENSIONS.WIDTH), getRandomInt(0, WORLD_DIMENSIONS.HEIGHT));
    addedPlayer.color = getRandomInt(0, 6)
    const nid = NetworkState.createId();
    NetworkState.setNetworkEntity(nid, addedPlayer.eid, false);
    NetworkState.setClient(new Client(nid, client, Time.elapsed));
    sendIfOpen(
      client,
      serializeMessage(
        MessageType.playerAdded,
        new PlayerAdd(addedPlayer.position, true, nid),
      ),
    );

    // Tell other clients about added player
    broadcast(
      NetworkState.getClientSockets(),
      serializeMessage(
        MessageType.playerAdded,
        new PlayerAdd(addedPlayer.position, false, nid),
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
            new PlayerAdd(player.position, false, NetworkState.getId(eid)!),
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
