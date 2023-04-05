import {
  ColorChange,
  createPayloadMap,
  MessagePlayloadByType,
  MessageType,
  NilPayload,
  parseMessage,
  PlayerMove,
  PlayerRemove,
  PlayerSnapshot,
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

    if (type in socketRouter) {
      const handler = socketRouter[
        type as keyof typeof socketRouter
      ];
      handler(
        server,
        payload as ClientMessagePlayloadByType[
          keyof ClientMessagePlayloadByType
        ],
      );
    } else {
      console.warn("No handler for", type);
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
  | MessageType.playerSnapshot
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
  [MessageType.playerSnapshot]: handlePlayerSnapshot as any,
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
  { isLocal, nid, position }: MessagePlayloadByType[MessageType.playerSnapshot],
) {
  const player = PlayerState.createPlayer();
  console.log("player nid:", nid);
  player.position.copy(position);
  ClientNetworkState.setNetworkEntity(nid, player.eid, isLocal);
}
function handlePlayerSnapshot(
  _server: WebSocket,
  playerSnapshot: PlayerSnapshot,
) {
  MessageState.pushSnapshot(MessageType.playerSnapshot, playerSnapshot);
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

function applyCommand<Type extends MessageType>(
  type: Type,
  payload: MessagePlayloadByType[Type],
) {
  const eid = ClientNetworkState.getEntityId(payload.nid);

  switch (type) {
    case MessageType.playerMoved: {
      if (PlayerState.hasPlayer(eid!)) {
        const player = PlayerState.getPlayer(eid!);
        player.position.add((payload as PlayerMove).delta);
      }
      break;
    }
  }
}

/** authoritative */
function applySnapshot<Type extends MessageType>(
  type: Type,
  payload: MessagePlayloadByType[Type],
) {
  const eid = ClientNetworkState.getEntityId(payload.nid);

  switch (type) {
    case MessageType.playerSnapshot: {
      if (PlayerState.hasPlayer(eid!)) {
        const player = PlayerState.getPlayer(eid!);
        // Server sends back correct position
        player.position.copy((payload as PlayerSnapshot).position);
      } else {
        console.warn(`Requested moving unknown player with nid ${payload.nid}`);
      }
      break;
    }
  }
}

const pipeline = new Pipeline([
  TimeSystem(),
  ClientMovementSystem(),
  ClientNetworkSystem({ applyCommand, applySnapshot }),
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
