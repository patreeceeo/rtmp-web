import {
  createPayloadMap,
  MessageType,
  parseMessage,
  PlayerAdd,
  PlayerRemove,
} from "~/common/Message.ts";
import { InputState } from "~/common/state/Input.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { drawCircle } from "~/client/canvas.ts";
import { TimeSystem } from "~/common/systems/Time.ts";
import { ClientMovementSystem } from "~/client/systems/Movement.ts";
import { Pipeline, SystemPartial } from "~/common/systems/mod.ts";
import { ClientApp, startClient } from "~/client/mod.ts";
import { useClient } from "hot_mod/dist/client/mod.js";
import { WORLD_DIMENSIONS } from "../mod.ts";
import { ClientNetworkState } from "~/client/state/Network.ts";
import { ClientNetworkSystem } from "~/client/systems/Network.ts";
import { MessageState } from "../../../modules/common/state/Message.ts";
import { TweenSystem } from "../../../modules/client/systems/Tween.ts";
import { TweenState, TweenType } from "../../../modules/client/state/Tween.ts";

const payloadMap = createPayloadMap();

export class DotsClientApp extends ClientApp {
  handleLoad(): void {
    const el: HTMLCanvasElement = document.querySelector("#screen")!;
    el.width = WORLD_DIMENSIONS.WIDTH;
    el.height = WORLD_DIMENSIONS.HEIGHT;
    const ctx = el.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      hotExports.updateScreen(ctx);
    } else {
      console.log("Failed to get canvas rendering context");
    }
  }
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
  handleKeyDown(e: KeyboardEvent): void {
    InputState.setKeyPressed(e.code);
  }
  handleKeyUp(e: KeyboardEvent): void {
    InputState.setKeyReleased(e.code);
  }
  handleIdle(): void {
    InputState.reset();
  }
}

function handlePlayerAdded(
  _server: WebSocket,
  { isLocal, nid, position }: PlayerAdd,
) {
  const player = PlayerState.createPlayer();
  console.log("player nid:", nid);
  player.position.copy(position);
  TweenState.add(player.eid, TweenType.position);
  TweenState.add(player.eid, TweenType.color);
  ClientNetworkState.setNetworkEntity(nid, player.eid, isLocal);
}
function handlePlayerRemoved(_server: WebSocket, playerRemove: PlayerRemove) {
  const eid = ClientNetworkState.getEntityId(playerRemove.nid);
  PlayerState.deletePlayer(eid!);
}

function updateScreen(ctx: CanvasRenderingContext2D) {
  hotExports.drawPlayers(ctx);
  requestAnimationFrame(() => updateScreen(ctx));
}

function drawPlayers(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, 1000, 1000);
  for (const player of PlayerState.getPlayers()) {
    ctx.fillStyle = player.webColor;
    drawCircle(ctx, player.position.x, player.position.y, 4);
  }
}

const pipeline = new Pipeline([
  TimeSystem(),
  ClientMovementSystem(),
  TweenSystem(),
  ClientNetworkSystem(),
] as Array<SystemPartial>);

pipeline.start(80);
startClient(new DotsClientApp());

export const hotExports = {
  updateScreen,
  drawPlayers,
};
// TODO get hot_mod working on server
useClient(import.meta, "ws://localhost:12321");

if (import.meta.hot) {
  import.meta.hot.accept([], ({ module }) => {
    for (
      const key of Object.keys(hotExports) as Array<
        keyof typeof hotExports
      >
    ) {
      hotExports[key] = module.hotExports[key];
    }
  });
}
