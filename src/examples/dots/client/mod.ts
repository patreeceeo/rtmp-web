import {
  createPayloadMap,
  MessageType,
  parseMessage,
  PlayerAdd,
  PlayerRemove,
} from "~/common/Message.ts";
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
import { TweenState, TweenType } from "~/client/state/Tween.ts";
import { TraitSystem } from "~/client/systems/Trait.ts";
import { OutputState } from "~/client/state/Output.ts";
import { OutputSystem } from "~/client/systems/Output.ts";
import { LevelState } from "~/common/state/LevelState.ts";
import { InputSystem } from "../../../modules/client/Input.ts";
import { TraitState, TraitType } from "~/common/state/Trait.ts";

const payloadMap = createPayloadMap();

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
    const [type, payload] = parseMessage(event.data, payloadMap);

    switch (type) {
      case MessageType.playerAdded:
        handlePlayerAdded(server, payload as PlayerAdd);
        break;
      case MessageType.playerRemoved:
        handlePlayerRemoved(server, payload as PlayerRemove);
        break;
      default:
        MessageState.insertSnapshot(type, payload);
    }
  }
  handleIdle(): void {
    InputState.reset();
  }
}

function handlePlayerAdded(
  _server: WebSocket,
  { isLocal, nid, position }: PlayerAdd,
) {
  // TODO player system
  const player = PlayerState.createPlayer();
  console.log("player nid:", nid);
  player.position.copy(position);
  ClientNetworkState.setNetworkEntity(nid, player.eid, isLocal);
  TweenState.add(player.eid, TweenType.position);
  TweenState.add(player.eid, TweenType.color);
  if (isLocal) {
    TraitState.add(player.eid, TraitType.wasdMove);
    TraitState.add(player.eid, TraitType.colorChange);
  }
}
function handlePlayerRemoved(_server: WebSocket, playerRemove: PlayerRemove) {
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
  TweenSystem(),
  ClientNetworkSystem(),
] as Array<SystemPartial>);

startClient(new DotsClientApp());
pipeline.start(80);
const outputSystem = await OutputSystem();

function startAnimationPipeline() {
  outputSystem.exec!();
  requestAnimationFrame(startAnimationPipeline);
}
startAnimationPipeline();
