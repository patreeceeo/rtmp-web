import "../mod.ts";
import * as Vec2 from "~/common/Vec2.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { NetworkSystem } from "~/server/systems/Network.ts";
import {
  DemandDriver,
  FixedIntervalDriver,
  Pipeline,
} from "~/common/systems/mod.ts";
import {
  broadcastMessage,
  sendMessageToClient,
  ServerApp,
  startServer,
} from "~/server/mod.ts";
import { ServerNetworkState } from "../../../modules/server/state/Network.ts";
import { MessageState } from "~/common/state/Message.ts";
import { ProduceSnapshotSystem } from "../../../modules/server/systems/ProduceSnapshot.ts";
import { MsgType, PlayerAdd, PlayerRemove } from "../common/message.ts";
import { DataViewMovable } from "../../../modules/common/DataView.ts";
import { PhysicsSystem } from "../../../modules/common/systems/Physics.ts";
import { ServerPurgeSystem } from "../../../modules/server/systems/ServerPurgeSystem.ts";
import {
  readMessageType,
  readPingId,
} from "../../../modules/common/Message.ts";
import { initPing, sendPing } from "../../../modules/common/state/Ping.ts";
import { PurgeSystem } from "../../../modules/common/systems/PurgeSystem.ts";
import { addEntity } from "~/common/Entity.ts";
import { loadTilemap } from "../../../modules/common/loaders/TiledTMJTilemapLoader.ts";
import { PlayerMovementSystem } from "./PlayerMovementSystem.ts";
import { spawnPlayer } from "../common/functions.ts";
import { LifeSystem } from "../common/systems/LifeSystem.ts";

const idleTimeout = 300;

class DotsServerApp implements ServerApp {
  idleTimeout = idleTimeout;
  handleOpen(ws: WebSocket, _: Event) {
    const addedPlayer = spawnPlayer(addEntity());
    const playerNid = ServerNetworkState.createId();
    const client = ServerNetworkState.getClientForSocket(ws)!;
    ServerNetworkState.addChild(client.uuid, playerNid);
    addedPlayer.uuid = playerNid;
    console.log("player nid", playerNid);

    ServerNetworkState.setNetworkEntity(playerNid, addedPlayer.eid, false);

    sendMessageToClient(ws, PlayerAdd, (p) => {
      Vec2.copy(p.position, addedPlayer.position);
      p.spriteMapId = addedPlayer.imageCollection;
      p.isLocal = true;
      p.nid = playerNid;
      p.sid = MessageState.currentStep;
    });
    // Tell other clients about added player
    broadcastMessage(
      PlayerAdd,
      (p) => {
        Vec2.copy(p.position, addedPlayer.position);
        p.spriteMapId = addedPlayer.imageCollection;
        p.isLocal = false;
        p.nid = playerNid;
        p.sid = MessageState.currentStep;
      },
      { exclude: ws },
    );

    // Catch up new client on current state of the world
    for (const player of PlayerState.entities.query()) {
      if (player.eid !== addedPlayer.eid) {
        sendMessageToClient(ws, PlayerAdd, (p) => {
          Vec2.copy(p.position, player.position);
          p.spriteMapId = player.imageCollection;
          p.isLocal = false;
          p.nid = ServerNetworkState.getId(player.eid)!;
          p.sid = MessageState.currentStep;
        });
      }
    }

    initPing(MsgType.ping);
  }

  handleClose(ws: WebSocket, _: Event) {
    const client = ServerNetworkState.getClientForSocket(ws);
    if (client) {
      console.log("Client disconnected", client.uuid);
      client.isSoftDeleted = true;
    } else {
      console.log("Client purged");
    }
  }

  handleError(_client: WebSocket, message: Event) {
    console.error("Error!", message);
  }

  handleMessage(client: WebSocket, message: MessageEvent) {
    const view = new DataViewMovable(message.data);
    const type = readMessageType(view, 0);
    if (type === MsgType.ping) {
      const id = readPingId(view, 0);
      sendPing(id, client);
    } else {
      MessageState.copyCommandFrom(view);
      handleMessagePipeline.exec();
    }
  }
}

const handleMessagePipeline = new Pipeline(
  [PlayerMovementSystem()],
  new DemandDriver(),
);

loadTilemap("/public/assets/level.json", false).then(() => {
  const fastPipeline = new Pipeline(
    [
      PhysicsSystem({ fixedDeltaTime: 4 }),
      LifeSystem(),
      ProduceSnapshotSystem(),
      NetworkSystem(),
    ],
    new FixedIntervalDriver(8),
  );

  const slowPipeline = new Pipeline(
    [
      PurgeSystem(),
      ServerPurgeSystem({
        idleTimeout,
        msgPlayerRemoved: [PlayerRemove, null],
      }),
    ],
    new FixedIntervalDriver(500),
  );
  startServer(new DotsServerApp());
  handleMessagePipeline.start();
  fastPipeline.start();
  slowPipeline.start();
});
