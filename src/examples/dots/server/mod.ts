import {
  createPayloadMap,
  MessageType,
  parseMessage,
  PlayerAdd,
  PlayerRemove,
} from "~/common/Message.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { TimeSystem } from "~/common/systems/Time.ts";
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
import { TraitSystem } from "../../../modules/client/systems/Trait.ts";

const payloadMap = createPayloadMap();

const idleTimeout = 60;

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

  handleMessage(_client: WebSocket, message: MessageEvent) {
    const [type, payload] = parseMessage(message.data, payloadMap);
    MessageState.addCommand(type, payload);
  }
}

const pipeline = new Pipeline([
  TimeSystem(),
  TraitSystem(),
  NetworkSystem({ idleTimeout }),
] as Array<SystemPartial>);
pipeline.start(80);
startServer(new DotsServerApp());
