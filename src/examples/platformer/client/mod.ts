import "../mod.ts";
import { InputState } from "~/common/state/Input.ts";
import { PlayerState } from "~/common/state/Player.ts";
import {
  AnimationDriver,
  EventQueueDriver,
  FixedIntervalDriver,
  Pipeline,
} from "~/common/systems/mod.ts";
import { ClientApp, startClient } from "~/client/mod.ts";
import { ClientNetworkState } from "~/client/state/Network.ts";
import {
  ClientNetworkSystem,
  sendPingToServer,
} from "~/client/systems/Network.ts";
import { MessageState } from "~/common/state/Message.ts";
import { TweenSystem } from "~/client/systems/Tween.ts";
import { TweenState } from "~/client/state/Tween.ts";
import { TraitSystem } from "~/client/systems/Trait.ts";
import { OutputState } from "~/client/state/Output.ts";
import { OutputSystem } from "~/client/systems/Output.ts";
import { LevelState } from "~/common/state/LevelState.ts";
import { InputSystem } from "../../../modules/client/systems/Input.ts";
import { TraitState } from "~/common/state/Trait.ts";
import { ReconcileSystem } from "../../../modules/client/systems/Reconcile.ts";
import { useClient } from "hot_mod/dist/client/mod.js";
import { IPlayerAdd, IPlayerRemove, MsgType } from "../common/message.ts";
import { DataViewMovable } from "../../../modules/common/DataView.ts";
import { readMessage } from "../../../modules/common/Message.ts";
import { WasdMoveTrait } from "../common/traits.ts";
import { PoseTween, PositionTween, VelocityTween } from "../common/tweens.ts";
import { PhysicsSystem } from "../../../modules/common/systems/Physics.ts";
import { DebugSystem } from "~/client/systems/DebugSystem.ts";
import { TargetPhysicsSystem } from "../../../modules/common/systems/TargetPhysics.ts";

useClient(import.meta, "ws://localhost:12321");

if (import.meta.hot) {
  // Tell HMR framework what to do when this module or any of
  // it's dependencies change
  import.meta.hot.accept([], () => {
    // Just reload the page for now
    location.reload();
  });
}

OutputState.canvas.resolution.fromBox(LevelState.dimensions);

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
    const [type, payload] = readMessage(view, 0);

    switch (type) {
      case MsgType.playerAdded:
        handlePlayerAdded(server, payload as IPlayerAdd);
        break;
      case MsgType.playerRemoved:
        handlePlayerRemoved(server, payload as IPlayerRemove);
        break;
      case MsgType.ping: {
        sendPingToServer(payload.id);
        break;
      }
      default:
        // console.log("received message", payload.meta.pojo)
        // TODO payload gets read twice
        MessageState.copySnapshotFrom(view);
    }
  }
  handleIdle(): void {
    InputState.reset();
  }
}

function handlePlayerAdded(
  _server: WebSocket,
  { isLocal, nid, position }: IPlayerAdd,
) {
  // TODO player system
  const player = PlayerState.createPlayer();
  console.log("player nid:", nid);
  player.position.copy(position);
  player.targetPosition.copy(position);
  ClientNetworkState.setNetworkEntity(nid, player.eid, isLocal);
  if (isLocal) {
    TraitState.add(WasdMoveTrait, player.eid);
  }
  TweenState.add(PositionTween, player.eid);
  TweenState.add(VelocityTween, player.eid);
  TweenState.add(PoseTween, player.eid);
}
function handlePlayerRemoved(_server: WebSocket, playerRemove: IPlayerRemove) {
  // TODO player system
  const eid = ClientNetworkState.getEntityId(playerRemove.nid)!;
  PlayerState.deletePlayer(eid);
  ClientNetworkState.deleteId(playerRemove.nid);
  TweenState.deleteEntity(eid);
  TraitState.deleteEntity(eid);
}

const app = new DotsClientApp();

const inputPipeline = new Pipeline(
  [InputSystem()],
  new EventQueueDriver(app.inputEvents),
);
inputPipeline.start();

const fastPipeline = new Pipeline(
  [
    // TODO run these systems immediately after input, but without handling input events more than once
    TraitSystem(),
    ClientNetworkSystem(),
    PhysicsSystem(),
    DebugSystem(),
  ],
  new FixedIntervalDriver(8),
);
fastPipeline.start();

const slowPipeline = new Pipeline(
  [
    // TODO reconcile and tween should driven by the socket events but with some delay
    TargetPhysicsSystem(), // TODO needs to run at least as often as PhysicsOptions.maxSteps
    // TODO only testing local simulation for now
    // ReconcileSystem(),
    // TweenSystem(),
  ],
  new FixedIntervalDriver(40, true),
);
slowPipeline.start();

startClient(app);

const framePipeline = new Pipeline([OutputSystem()], new AnimationDriver());
framePipeline.start();
