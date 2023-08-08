import "../mod.ts";
import * as Vec2 from "~/common/Vec2.ts";
import { InputState } from "~/common/state/Input.ts";
import { PlayerState } from "~/common/state/Player.ts";
import {
  AnimationDriver,
  DemandDriver,
  EventQueueDriver,
  FixedIntervalDriver,
  Pipeline,
} from "~/common/systems/mod.ts";
import { ClientApp, startClient } from "~/client/mod.ts";
import { ClientNetworkState } from "~/client/state/Network.ts";
import { ClientNetworkSystem } from "~/client/systems/Network.ts";
import { MessageState } from "~/common/state/Message.ts";
import { OutputState } from "~/client/state/Output.ts";
import { OutputSystem } from "~/client/systems/Output.ts";
import { InputSystem } from "../../../modules/client/systems/Input.ts";
import { ReconcileSystem } from "../../../modules/client/systems/Reconcile.ts";
import { useClient } from "hot_mod/dist/client/mod.js";
import { IPlayerAdd, IPlayerRemove, MsgType } from "../common/message.ts";
import { DataViewMovable } from "../../../modules/common/DataView.ts";
import {
  readMessagePayload,
  readMessageType,
  readPingId,
} from "../../../modules/common/Message.ts";
import { PhysicsSystem } from "../../../modules/common/systems/Physics.ts";
import { DebugSystem } from "~/client/systems/DebugSystem.ts";
import { LevelState } from "../../../modules/common/state/LevelState.ts";
import { Instance } from "../../../modules/common/Vec2.ts";
import { initPing, updatePing } from "../../../modules/common/state/Ping.ts";
import { PingSystem } from "../../../modules/client/systems/Ping.ts";
import { SCREEN_HEIGHT_PX, SCREEN_WIDTH_PX } from "../mod.ts";
import { PurgeSystem } from "../../../modules/common/systems/PurgeSystem.ts";
import { addEntity, softDeleteEntity } from "~/common/Entity.ts";
import { loadTilemap } from "../../../modules/common/loaders/TiledTMJTilemapLoader.ts";
import { DebugState } from "../../../modules/client/state/Debug.ts";
import { PlayerMovementSystem } from "./PlayerMovementSystem.ts";
import { ReconcileState } from "../../../modules/client/state/Reconcile.ts";
import { PlayerSnapshotReconciler } from "./reconcilers.ts";
import { requestSprites } from "./sprites.ts";

useClient(import.meta, "ws://localhost:12321");

if (import.meta.hot) {
  // Tell HMR framework what to do when this module or any of
  // it's dependencies change
  import.meta.hot.accept([], () => {
    // Just reload the page for now
    location.reload();
  });
}

Vec2.set(OutputState.foreground.resolution, SCREEN_WIDTH_PX, SCREEN_HEIGHT_PX);
Vec2.set(OutputState.background.resolution, SCREEN_WIDTH_PX, SCREEN_HEIGHT_PX);

const landscapePoints = [
  [0, 200],
  [40, 140],
  [100, 256],
  [110, 260],
  [150, 168],
  [176, 156],
  [220, 188],
  [264, 232],
  [288, 288],
  [310, 254],
  [360, 220],
  [384, 194],
  [424, 226],
  [466, 204],
  [512, 166],
];

for (const point of landscapePoints) {
  LevelState.landscape.push(new Instance(point[0], point[1]));
}

LevelState.farClouds[0] = {
  position: new Instance(360, 252),
  size: new Instance(96, 48),
};

LevelState.nearClouds[0] = {
  position: new Instance(24, 220),
  size: new Instance(64, 32),
};

OutputState.scene.gradients.set("sky", {
  x0: 0,
  y0: 0,
  x1: 0,
  y1: OutputState.background.resolution.y,
  stops: [
    [0, "#e6f9ff"],
    [1, "#a6e9ff"],
  ],
});

OutputState.scene.gradients.set("landscape", {
  x0: 0,
  y0: 0,
  x1: 0,
  y1: OutputState.background.resolution.y,
  stops: [
    [0, "#e6f9ff"],
    [0.75, "darkviolet"],
    [1, "#a33b3b"],
  ],
});

function createLandscapePath() {
  const resolution = OutputState.background.resolution;
  const landscape = new Path2D();
  landscape.moveTo(0, resolution.y);
  for (const point of LevelState.landscape) {
    landscape.lineTo(point.x, resolution.y - point.y);
  }
  landscape.lineTo(resolution.x, resolution.y);
  landscape.closePath();
  return landscape;
}

OutputState.scene.paths.set("landscape", createLandscapePath());

export class DotsClientApp extends ClientApp {
  handleOpen(_server: WebSocket, _event: Event): void {
    console.info("socket is open");
  }
  handleClose(_server: WebSocket, _event: Event): void {
    console.info("socket is closed");
  }
  handleError(_server: WebSocket, event: Event): void {
    console.error("socket error", event);
  }
  // deno-lint-ignore no-explicit-any
  handleMessage(server: WebSocket, event: MessageEvent<any>): void {
    const view = new DataViewMovable(event.data);
    const type = readMessageType(view, 0);

    switch (type) {
      case MsgType.playerAdded: {
        const payload = readMessagePayload(view, 0, type);
        handlePlayerAdded(server, payload as IPlayerAdd);
        break;
      }
      case MsgType.playerRemoved: {
        const payload = readMessagePayload(view, 0, type);
        handlePlayerRemoved(server, payload as IPlayerRemove);
        break;
      }
      case MsgType.ping: {
        const id = readPingId(view, 0);
        updatePing(id, performance.now());
        break;
      }
      default:
        // TODO payload gets read twice
        MessageState.copySnapshotFrom(view);
        handleMessagePipeline.exec();
    }
    if (type !== MsgType.ping) {
      DebugState.messageReceivedSinceLastFrame += 1;
    }
  }
  handleIdle(): void {
    InputState.reset();
  }
}

function handlePlayerAdded(
  _server: WebSocket,
  { isLocal, nid, position, spriteMapId }: IPlayerAdd,
) {
  console.log("player uuid:", nid);
  const player = PlayerState.addPlayer(addEntity());
  Vec2.copy(player.position, position);
  Vec2.copy(player.targetPosition, position);
  player.imageCollection = spriteMapId;
  ClientNetworkState.setNetworkEntity(nid, player.eid, isLocal);
  player.uuid = nid;
}
function handlePlayerRemoved(_server: WebSocket, playerRemove: IPlayerRemove) {
  const eid = ClientNetworkState.getEntityId(playerRemove.nid)!;
  console.log("player removed:", playerRemove.nid);
  softDeleteEntity(eid);
  // TODO move this stuff to PurgeSystem
  ClientNetworkState.deleteId(playerRemove.nid);
}

const app = new DotsClientApp();
const inputPipeline = new Pipeline(
  [InputSystem()],
  new EventQueueDriver(app.inputEvents),
);

const handleMessagePipeline = new Pipeline(
  [ReconcileSystem()],
  new DemandDriver(),
);

// TODO Move this to PlayerMovementSystem's init
// in the same vein, there should be a way for systems to
// register command handlers for specific message types
ReconcileState.register(MsgType.playerSnapshot, new PlayerSnapshotReconciler());

// TODO maybe there should be separate functions for loading the tile visuals and the tile physics. Then the respective systems could do the loading themselves
loadTilemap("/public/assets/level.json").then(async () => {
  requestSprites();

  const fastPipeline = new Pipeline(
    [
      PlayerMovementSystem(),
      ClientNetworkSystem(),
      PhysicsSystem({ fixedDeltaTime: 4 }),
    ],
    new FixedIntervalDriver(8),
  );

  const framePipeline = new Pipeline([OutputSystem()], new AnimationDriver());

  const slowPipeline = new Pipeline(
    [
      PurgeSystem(),
      PingSystem({ timeout: 10 * 1000 }),
      DebugSystem({ pingStatTimeFrame: 5000, fpsStatTimeFrame: 500 }),
    ],
    new FixedIntervalDriver(150),
  );

  initPing(MsgType.ping);
  await startClient(app);
  inputPipeline.start();
  handleMessagePipeline.start();
  fastPipeline.start();
  framePipeline.start();
  slowPipeline.start();
});
