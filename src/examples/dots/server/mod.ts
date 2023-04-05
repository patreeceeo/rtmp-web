import {
  ColorChange,
  createPayloadMap,
  MessagePlayloadByType,
  MessageType,
  parseMessage,
  PlayerAdd,
  PlayerRemove,
} from "~/common/Message.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { Time } from "~/common/state/Time.ts";
import { TimeSystem } from "~/common/systems/Time.ts";
import { MovementSystem } from "~/server/systems/Movement.ts";
import { NetworkSystem } from "~/server/systems/Network.ts";
import { Pipeline, SystemPartial } from "~/common/systems/mod.ts";
import {
  broadcastMessage,
  sendMessageToClient,
  ServerApp,
  startServer,
} from "~/server/mod.ts";
import { WORLD_DIMENSIONS } from "../mod.ts";
import { ServerNetworkState } from "../../../modules/server/state/Network.ts";
import { MessageState } from "~/common/state/Message.ts";

const payloadMap = createPayloadMap();

const idleTimeout = 60;

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
  [MessageType.playerMoved]: (_ws, move) => {
    MessageState.addCommand(MessageType.playerMoved, move);
  },
  [MessageType.colorChange]: (ws, cc) => {
    const eid = ServerNetworkState.getEntityId(cc.nid);
    const player = PlayerState.getPlayer(eid!);
    player.color = (cc as ColorChange).color;
    player.lastActiveTime = Time.elapsed;
    broadcastMessage(MessageType.colorChange, cc, { exclude: ws });
  },
};

function getRandomInt(min: number, max: number) {
  return Math.round(Math.random() * max) + min;
}

class DotsServerApp implements ServerApp {
  idleTimeout = idleTimeout;
  handleOpen(ws: WebSocket, _: Event) {
    const addedPlayer = PlayerState.createPlayer();
    const playerNid = ServerNetworkState.createId();
    const client = ServerNetworkState.getClientForSocket(ws)!;
    client.addNetworkId(playerNid);

    addedPlayer.position.set(
      getRandomInt(0, WORLD_DIMENSIONS.WIDTH),
      getRandomInt(0, WORLD_DIMENSIONS.HEIGHT),
    );
    addedPlayer.color = getRandomInt(0, 6);
    ServerNetworkState.setNetworkEntity(playerNid, addedPlayer.eid, false);

    sendMessageToClient(
      ws,
      MessageType.playerAdded,
      new PlayerAdd(
        addedPlayer.position,
        true,
        playerNid,
        MessageState.lastStepId,
      ),
    );

    // Tell other clients about added player
    // TODO use broadcastMessage
    broadcastMessage(
      MessageType.playerAdded,
      new PlayerAdd(
        addedPlayer.position,
        false,
        playerNid,
        MessageState.lastStepId,
      ),
      { exclude: ws },
    );

    // Catch up
    for (const eid of PlayerState.getPlayerEids()) {
      const player = PlayerState.getPlayer(eid);
      if (eid !== addedPlayer.eid) {
        sendMessageToClient(
          ws,
          MessageType.playerAdded,
          new PlayerAdd(
            player.position,
            false,
            ServerNetworkState.getId(eid)!,
            MessageState.lastStepId,
          ),
        );
      }
    }
  }

  handleClose(ws: WebSocket, _: Event) {
    const client = ServerNetworkState.getClientForSocket(ws)!;
    ServerNetworkState.removeClient(client.nid);
    for (const nid of client.getNetworkIds()) {
      const eid = ServerNetworkState.getEntityId(nid);
      PlayerState.deletePlayer(eid!);
      broadcastMessage(
        MessageType.playerRemoved,
        new PlayerRemove(nid, MessageState.lastStepId),
      );
    }
  }

  handleError(_client: WebSocket, message: Event) {
    console.error("Error!", message);
  }

  handleMessage(client: WebSocket, message: MessageEvent) {
    const [type, payload] = parseMessage(message.data, payloadMap);

    if (type in socketRouter) {
      const handler = socketRouter[type as keyof typeof socketRouter];
      handler(
        client,
        payload as ServerMessagePlayloadByType[
          keyof ServerMessagePlayloadByType
        ],
      );
    } else {
      console.warn("No handler for message type", type);
    }
  }
}

const pipeline = new Pipeline([
  TimeSystem(),
  MovementSystem(),
  NetworkSystem({ idleTimeout }),
] as Array<SystemPartial>);
pipeline.start(80);
startServer(new DotsServerApp());
