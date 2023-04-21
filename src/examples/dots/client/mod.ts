import "../mod.ts";
import { InputState } from "~/common/state/Input.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { TimeSystem } from "~/common/systems/Time.ts";
import { Pipeline, SystemPartial } from "~/common/systems/mod.ts";
import { ClientApp, startClient } from "~/client/mod.ts";
import { ClientNetworkState } from "~/client/state/Network.ts";
import { ClientNetworkSystem } from "~/client/systems/Network.ts";
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
import { readMessage } from "../../../modules/common/Message.ts";
import { DataViewMovable } from "../../../modules/common/DataView.ts";
import { IPlayerAdd, IPlayerRemove, MsgType } from "../common/messages.ts";
import { ColorChangeTrait, WasdMoveTrait } from "../common/traits.ts";
import { ColorTween, PositionTween } from "../common/tweens.ts";

OutputState.canvas.resolution.copy(LevelState.dimensions);

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
      default:
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
  ClientNetworkState.setNetworkEntity(nid, player.eid, isLocal);
  // TODO only add tweens if player is NOT local?
  TweenState.add(new PositionTween(player.eid));
  TweenState.add(new ColorTween(player.eid));
  if (isLocal) {
    TraitState.add(new WasdMoveTrait(player.eid));
    TraitState.add(new ColorChangeTrait(player.eid));
  }
}
function handlePlayerRemoved(_server: WebSocket, playerRemove: IPlayerRemove) {
  // TODO player system
  const eid = ClientNetworkState.getEntityId(playerRemove.nid)!;
  PlayerState.deletePlayer(eid);
  ClientNetworkState.deleteId(playerRemove.nid);
  TweenState.deleteEntity(eid);
  TraitState.deleteEntity(eid);
}

const pipeline = new Pipeline([
  TimeSystem(),
  InputSystem(),
  TraitSystem(),
  ClientNetworkSystem(),
  TweenSystem(),
  ReconcileSystem(),
] as Array<SystemPartial>);

startClient(new DotsClientApp());
pipeline.start(80);
const outputSystem = await OutputSystem();

function startAnimationPipeline() {
  outputSystem.exec!();
  requestAnimationFrame(startAnimationPipeline);
}
startAnimationPipeline();
