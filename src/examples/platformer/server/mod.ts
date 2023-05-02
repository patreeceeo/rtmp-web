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
import { ConsumeCommandSystem } from "../../../modules/server/systems/ConsumeCommand.ts";
import { ProduceSnapshotSystem } from "../../../modules/server/systems/ProduceSnapshot.ts";
import { LevelState } from "../../../modules/common/state/LevelState.ts";
import { getRandomIntBetween } from "../../../modules/common/random.ts";
import { MsgType, PlayerAdd, PlayerRemove } from "../common/message.ts";
import { DataViewMovable } from "../../../modules/common/DataView.ts";
import { TraitState } from "../../../modules/common/state/Trait.ts";
import { WasdMoveTrait } from "../common/traits.ts";
import { PhysicsSystem } from "../../../modules/common/systems/Physics.ts";
import { readMessage } from "../../../modules/common/Message.ts";
import { PingState } from "../../../modules/common/state/Ping.ts";
import { PurgeSystem } from "../../../modules/server/systems/PurgeSystem.ts";

const idleTimeout = 300;

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
    ServerNetworkState.setNetworkEntity(playerNid, addedPlayer.eid, false);
    TraitState.add(WasdMoveTrait, addedPlayer.eid);

    sendMessageToClient(ws, PlayerAdd, (p) => {
      p.position.copy(addedPlayer.position);
      p.isLocal = true;
      p.nid = playerNid;
      p.sid = MessageState.currentStep;
    });
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

    const [type, payload] = readMessage(view, 0);
    if (type === MsgType.ping) {
      const ping = PingState.get(payload.id);
      ping?.setReceived();
    } else {
      MessageState.copyCommandFrom(view);
    }
  }
}

const fastPipeline = new Pipeline(
  [
    ConsumeCommandSystem(),
    PhysicsSystem(),
    ProduceSnapshotSystem(),
    NetworkSystem(),
  ],
  new FixedIntervalDriver(1000 / 60),
);
fastPipeline.start();

const slowPipeline = new Pipeline(
  [
    PurgeSystem({ idleTimeout, msgPlayerRemoved: [PlayerRemove, null] }),
  ],
  new FixedIntervalDriver(500),
);
slowPipeline.start();
startServer(new DotsServerApp());
