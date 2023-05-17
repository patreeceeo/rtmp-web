import "../mod.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { NetworkSystem } from "~/server/systems/Network.ts";
import {
  FixedIntervalDriver,
  Pipeline,
  SystemPartial,
} from "~/common/systems/mod.ts";
import {
  broadcastMessage,
  sendMessageToClient,
  ServerApp,
  startServer,
} from "~/server/mod.ts";
import { ServerNetworkState } from "../../../modules/server/state/Network.ts";
import { MessageState } from "~/common/state/Message.ts";
import { TraitSystem } from "../../../modules/server/systems/Trait.ts";
import { LevelState } from "../../../modules/common/state/LevelState.ts";
import { getRandomIntBetween } from "../../../modules/common/random.ts";
import { PlayerAdd, PlayerRemove } from "../common/messages.ts";
import { DataViewMovable } from "../../../modules/common/DataView.ts";

const idleTimeout = 60;

class DotsServerApp implements ServerApp {
  idleTimeout = idleTimeout;
  handleOpen(ws: WebSocket, _: Event) {
    const addedPlayer = PlayerState.createPlayer();
    const playerNid = ServerNetworkState.createId();
    const client = ServerNetworkState.getClientForSocket(ws)!;
    client.addNetworkId(playerNid);

    addedPlayer.position.set(
      getRandomIntBetween(0, LevelState.dimensions.x),
      getRandomIntBetween(0, LevelState.dimensions.y),
    );
    addedPlayer.color = getRandomIntBetween(0, 6);
    ServerNetworkState.setNetworkEntity(playerNid, addedPlayer.eid, false);

    sendMessageToClient(ws, PlayerAdd, (p) => {
      p.position.copy(addedPlayer.position);
      p.isLocal = true;
      p.nid = playerNid;
      p.sid = MessageState.currentStep;
    }),
      // Tell other clients about added player
      broadcastMessage(
        PlayerAdd,
        (p) => {
          p.position.copy(addedPlayer.position);
          p.isLocal = false;
          p.nid = playerNid;
          p.sid = MessageState.currentStep;
        },
        { exclude: ws },
      );

    // Catch up new client on current state of the world
    for (const eid of PlayerState.getEntityIds()) {
      const player = PlayerState.getPlayer(eid);
      if (eid !== addedPlayer.eid) {
        sendMessageToClient(ws, PlayerAdd, (p) => {
          p.position.copy(player.position);
          p.isLocal = false;
          p.nid = ServerNetworkState.getId(eid)!;
          p.sid = MessageState.currentStep;
        });
      }
    }
  }

  handleClose(ws: WebSocket, _: Event) {
    const client = ServerNetworkState.getClientForSocket(ws)!;
    ServerNetworkState.removeClient(client.nid);
    for (const nid of client.getNetworkIds()) {
      const eid = ServerNetworkState.getEntityId(nid);
      PlayerState.deletePlayer(eid!);
      broadcastMessage(PlayerRemove, (p) => {
        p.nid = nid;
        p.sid = MessageState.currentStep;
      });
    }
  }

  handleError(_client: WebSocket, message: Event) {
    console.error("Error!", message);
  }

  handleMessage(_client: WebSocket, message: MessageEvent) {
    const view = new DataViewMovable(message.data);
    MessageState.copyCommandFrom(view);
  }
}

const pipeline = new Pipeline(
  [
    TraitSystem(),
    NetworkSystem({ idleTimeout, msgPlayerRemoved: [PlayerRemove, null] }),
  ] as Array<SystemPartial>,
  new FixedIntervalDriver(80),
);
pipeline.start();
startServer(new DotsServerApp());
