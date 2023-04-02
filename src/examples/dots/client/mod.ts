import {
  ColorChange,
  MessagePlayloadByType,
  MessageType,
  parseMessage,
  PlayerMove,
  PlayerRemove,
} from "~/common/Message.ts";
import { NetworkId } from "~/common/state/Network.ts";
import { InputState } from "~/common/state/Input.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { drawCircle } from "~/client/canvas.ts";
import { TimeSystem } from "~/common/systems/Time.ts";
import {
  ClientMovementSystem,
  handleMoveFromServer,
} from "~/client/systems/Movement.ts";
import { startPipeline, SystemPartial } from "~/common/systems/mod.ts";
import { ClientApp, startClient } from "~/client/mod.ts";
import { useClient } from "hot_mod/dist/client/mod.js";
import { WORLD_DIMENSIONS } from "../mod.ts";
import { ClientNetworkState } from "../../../modules/client/state/Network.ts";
import { ClientNetworkSystem } from "../../../modules/client/systems/Network.ts";
import { ClientReconcileSystem } from "../../../modules/client/systems/Reconcile.ts";

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
    const parsedMessage = parseMessage(event.data);

    if (parsedMessage.type in socketRouter) {
      const handler = socketRouter[
        parsedMessage.type as keyof typeof socketRouter
      ];
      handler(
        server,
        parsedMessage
          .payload as ClientMessagePlayloadByType[
            keyof ClientMessagePlayloadByType
          ],
      );
    } else {
      console.warn("No handler for", parsedMessage.type);
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

type ClientMessagePlayloadByType = Pick<
  MessagePlayloadByType,
  | MessageType.playerMoved
  | MessageType.playerAdded
  | MessageType.playerRemoved
  | MessageType.colorChange
>;

const socketRouter: Record<
  keyof ClientMessagePlayloadByType,
  (
    client: WebSocket,
    data: ClientMessagePlayloadByType[keyof ClientMessagePlayloadByType],
  ) => void
> = {
  // TODO figure out how to get rid of these explicit anys
  // deno-lint-ignore no-explicit-any
  [MessageType.playerAdded]: handlePlayerAdded as any,
  // deno-lint-ignore no-explicit-any
  [MessageType.playerMoved]: handlePlayerMoved as any,
  // deno-lint-ignore no-explicit-any
  [MessageType.playerRemoved]: handlePlayerRemoved as any,
  [MessageType.colorChange]: (_server, cc) => {
    const eid = ClientNetworkState.getEntityId((cc as ColorChange).nid);
    const player = PlayerState.getPlayer(eid!);
    player.color = (cc as ColorChange).color;
  },
};

function handlePlayerAdded(
  _server: WebSocket,
  { isLocal, nid, position }: MessagePlayloadByType[MessageType.playerAdded],
) {
  const player = PlayerState.createPlayer();
  console.log("player nid:", nid);
  player.position.copy(position);
  ClientNetworkState.setNetworkEntity(nid, player.eid, isLocal);
}
function handlePlayerMoved(_server: WebSocket, move: PlayerMove) {
  handleMoveFromServer(MessageType.playerMoved, move);
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
  ctx.clearRect(0, 0, 1000, 10000);
  for (const player of PlayerState.getPlayers()) {
    ctx.fillStyle = player.webColor;
    drawCircle(ctx, player.position.x, player.position.y, 4);
  }
}

const systems = [
  TimeSystem(),
  ClientMovementSystem(),
  ClientNetworkSystem(),
  ClientReconcileSystem(),
] as Array<SystemPartial>;

startPipeline(systems, 80);
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
