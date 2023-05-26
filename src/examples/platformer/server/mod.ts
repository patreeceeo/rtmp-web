import "../mod.ts";
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
import { ConsumeCommandSystem } from "../../../modules/server/systems/ConsumeCommand.ts";
import { ProduceSnapshotSystem } from "../../../modules/server/systems/ProduceSnapshot.ts";
import { LevelState } from "../../../modules/common/state/LevelState.ts";
import { getRandomIntBetween } from "../../../modules/common/random.ts";
import { MsgType, PlayerAdd, PlayerRemove } from "../common/message.ts";
import { DataViewMovable } from "../../../modules/common/DataView.ts";
import { TraitState } from "../../../modules/common/state/Trait.ts";
import { NegotiatePhysicsTrait, WasdMoveTrait } from "../common/traits.ts";
import { PhysicsSystem } from "../../../modules/common/systems/Physics.ts";
import { ServerPurgeSystem } from "../../../modules/server/systems/ServerPurgeSystem.ts";
import { readMessage } from "../../../modules/common/Message.ts";
import { initPing, sendPing } from "../../../modules/common/state/Ping.ts";
import { PurgeSystem } from "../../../modules/common/systems/PurgeSystem.ts";

const idleTimeout = 300;

class DotsServerApp implements ServerApp {
  idleTimeout = idleTimeout;
  handleOpen(ws: WebSocket, _: Event) {
    const addedPlayer = PlayerState.createPlayer();
    const playerNid = ServerNetworkState.createId();
    const client = ServerNetworkState.getClientForSocket(ws)!;
    client.addNetworkId(playerNid);
    console.log("player nid", playerNid);

    addedPlayer.position.set(
      getRandomIntBetween(
        LevelState.dimensions.xMin,
        LevelState.dimensions.xMax,
      ),
      getRandomIntBetween(
        LevelState.dimensions.yMin,
        LevelState.dimensions.yMax,
      ),
    );
    addedPlayer.spriteMapId = (addedPlayer.eid / 2) % 2;

    addedPlayer.targetPosition.copy(addedPlayer.position);
    ServerNetworkState.setNetworkEntity(playerNid, addedPlayer.eid, false);
    TraitState.add(WasdMoveTrait, addedPlayer.eid);
    TraitState.add(NegotiatePhysicsTrait, addedPlayer.eid);

    sendMessageToClient(ws, PlayerAdd, (p) => {
      p.position.copy(addedPlayer.position);
      p.spriteMapId = addedPlayer.spriteMapId;
      p.isLocal = true;
      p.nid = playerNid;
      p.sid = MessageState.currentStep;
    });
    // Tell other clients about added player
    broadcastMessage(
      PlayerAdd,
      (p) => {
        p.position.copy(addedPlayer.position);
        p.spriteMapId = addedPlayer.spriteMapId;
        p.isLocal = false;
        p.nid = playerNid;
        p.sid = MessageState.currentStep;
      },
      { exclude: ws },
    );

    // Catch up new client on current state of the world
    for (const player of PlayerState.getPlayers()) {
      if (player.eid !== addedPlayer.eid) {
        sendMessageToClient(ws, PlayerAdd, (p) => {
          p.position.copy(player.position);
          p.spriteMapId = player.spriteMapId;
          p.isLocal = false;
          p.nid = ServerNetworkState.getId(player.eid)!;
          p.sid = MessageState.currentStep;
        });
      }
    }

    initPing(MsgType.ping);
  }

  handleClose(ws: WebSocket, _: Event) {
    const client = ServerNetworkState.getClientForSocket(ws)!;
    console.log("Client disconnected", client.nid);
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

  handleMessage(client: WebSocket, message: MessageEvent) {
    const view = new DataViewMovable(message.data);
    const [type, payload] = readMessage(view, 0);
    if (type === MsgType.ping) {
      sendPing(payload.id, client);
    } else {
      MessageState.copyCommandFrom(view);
      handleMessagePipeline.exec();
    }
  }
}

const handleMessagePipeline = new Pipeline(
  [ConsumeCommandSystem()],
  new DemandDriver(),
);
handleMessagePipeline.start();

const fastPipeline = new Pipeline(
  [
    PhysicsSystem({ fixedDeltaTime: 9 }),
    ProduceSnapshotSystem(),
    NetworkSystem(),
  ],
  new FixedIntervalDriver(8),
);
fastPipeline.start();

const slowPipeline = new Pipeline(
  [
    PurgeSystem(),
    ServerPurgeSystem({ idleTimeout, msgPlayerRemoved: [PlayerRemove, null] }),
  ],
  new FixedIntervalDriver(500),
);
slowPipeline.start();

startServer(new DotsServerApp());
