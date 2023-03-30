import {
ColorChange,
  MessagePlayloadByType,
  MessageType,
  parseMessage,
  PlayerAdd,
  PlayerMove,
  PlayerRemove,
  serializeMessage,
} from "~/common/Message.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { broadcast, sendIfOpen } from "~/common/socket.ts";
import { Time } from "~/common/state/Time.ts";
import { TimeSystem } from "~/common/systems/Time.ts";
import {
  addPlayerMoveFromClient, MovementSystem,
} from "~/server/systems/Movement.ts";
import { NetworkSystem } from "~/server/systems/Network.ts";
import { startPipeline, SystemPartial } from "~/common/systems/mod.ts";
import { broadcastMessage, ServerApp, startServer } from "~/server/mod.ts";
import { WORLD_DIMENSIONS } from "../mod.ts";
import { Client, ServerNetworkState } from "../../../modules/server/state/Network.ts";

const idleTimeout = 60
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
  [MessageType.playerMoved]: (ws, move) => {
    addPlayerMoveFromClient(move as PlayerMove, ws);
  },
  [MessageType.colorChange]: (ws, cc) => {
    const eid = ServerNetworkState.getEntityId(cc.nid)
    const player = PlayerState.getPlayer(eid!)
    player.color = (cc as ColorChange).color
    player.lastActiveTime = Time.elapsed
    broadcastMessage(MessageType.colorChange, cc, {exclude: ws})
  },
};

function getRandomInt(min: number, max: number) {
  return Math.round(Math.random() * max) + min
}

class DotsServerApp implements ServerApp {
  idleTimeout = idleTimeout
  handleOpen(ws: WebSocket, _: Event) {
    const addedPlayer = PlayerState.createPlayer();
    const playerNid = ServerNetworkState.createId();
    const client = ServerNetworkState.getClientForSocket(ws)!;
    client.addNetworkId(playerNid);

    addedPlayer.position.set(getRandomInt(0, WORLD_DIMENSIONS.WIDTH), getRandomInt(0, WORLD_DIMENSIONS.HEIGHT));
    addedPlayer.color = getRandomInt(0, 6)
    ServerNetworkState.setNetworkEntity(playerNid, addedPlayer.eid, false);

    sendIfOpen(
      ws,
      serializeMessage(
        MessageType.playerAdded,
        new PlayerAdd(addedPlayer.position, true, playerNid),
      ),
    );

    // Tell other clients about added player
    // TODO use broadcastMessage
    broadcast(
      ServerNetworkState.getClientSockets(),
      serializeMessage(
        MessageType.playerAdded,
        new PlayerAdd(addedPlayer.position, false, playerNid),
      ),
      ws,
    );

    // Catch up
    for (const eid of PlayerState.getPlayerEids()) {
      const player = PlayerState.getPlayer(eid);
      if (eid !== addedPlayer.eid) {
        sendIfOpen(
          ws,
          serializeMessage(
            MessageType.playerAdded,
            new PlayerAdd(player.position, false, ServerNetworkState.getId(eid)!),
          ),
        );
      }
    }
  }

  handleClose(ws: WebSocket, _: Event) {
    const client = ServerNetworkState.getClientForSocket(ws)!;
    ServerNetworkState.removeClient(client.nid);
    for(const nid of client.getNetworkIds()) {
      const eid = ServerNetworkState.getEntityId(nid);
      PlayerState.deletePlayer(eid!);
      broadcastMessage(MessageType.playerRemoved, new PlayerRemove(nid))
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
