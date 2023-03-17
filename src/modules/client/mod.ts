import {
  MessagePlayloadByType,
  MessageType,
  parseMessage,
  PlayerMove,
  serializeMessage,
} from "../common/Message.ts";
import { NetworkId, NetworkState } from "../common/state/Network.ts";
import { InputState } from "../common/state/Input.ts";
import { PlayerState } from "../common/state/Player.ts";
import { drawCircle } from "../client/canvas.ts";
import { sendIfOpen } from "../common/socket.ts";
import { useClient } from "hot_mod/dist/client/mod.js";

useClient(import.meta);
export const hotExports = {
  updateScreen,
  drawPlayers,
};
if (import.meta.hot) {
  import.meta.hot.accept([], ({ module }) => {
    for (
      const key of Object.keys(hotExports) as Array<keyof typeof hotExports>
    ) {
      hotExports[key] = module.hotExports[key];
    }
  });
}

function init() {
  const el: HTMLCanvasElement = document.querySelector("#screen")!;
  const ctx = el.getContext("2d");
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    hotExports.updateScreen(ctx);
  } else {
    console.log("Failed to get canvas rendering context");
  }

  const wsProtocol = location.origin.startsWith("https") ? "wss" : "ws";

  const socket = new WebSocket(
    `${wsProtocol}://${location.host}/start_web_socket`,
  );

  socket.onopen = startNetworkLoop;

  socket.onmessage = (ev) => handleMessage(socket, ev);

  NetworkState.socket = socket;
}

export const handleMessage = (server: WebSocket, message: MessageEvent) => {
  const parsedMessage = parseMessage(message.data);

  if (parsedMessage.type in socketRouter) {
    const handler =
      socketRouter[parsedMessage.type as keyof typeof socketRouter];
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
};

type ClientMessagePlayloadByType = Pick<
  MessagePlayloadByType,
  MessageType.playerMoved | MessageType.playerAdded | MessageType.playerRemoved
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
};

function handlePlayerAdded(
  _server: WebSocket,
  { isLocal, nid, position }: MessagePlayloadByType[MessageType.playerAdded],
) {
  const player = PlayerState.createPlayer();
  player.position.copy(position);
  NetworkState.setNetworkEntity(nid, player.eid, isLocal);
}
function handlePlayerMoved(_server: WebSocket, move: PlayerMove) {
  const eid = NetworkState.getEntityId(move.nid);
  const player = PlayerState.getPlayer(eid!);
  player.position.copy(move.to);
}
function handlePlayerRemoved(_server: WebSocket, nid: NetworkId) {
  const eid = NetworkState.getEntityId(nid);
  PlayerState.deletePlayer(eid!);
}

window.onload = init;

// In case load event already happened
setTimeout(() => {
  if (!NetworkState.isReady) {
    init();
  }
});

window.onkeydown = (ev) => {
  InputState.setKeyPressed(ev.code);
};
window.onkeyup = (ev) => {
  InputState.setKeyReleased(ev.code);
};

function updateScreen(ctx: CanvasRenderingContext2D) {
  hotExports.drawPlayers(ctx);
  requestAnimationFrame(() => updateScreen(ctx));
}

function startNetworkLoop() {
  setInterval(() => {
    for (const eid of PlayerState.getPlayerEids()) {
      if (NetworkState.isLocalEntity(eid)) {
        const player = PlayerState.getPlayer(eid);
        let dx = 0, dy = 0;
        if (InputState.isKeyPressed("KeyA")) {
          dx = -1;
        }
        if (InputState.isKeyPressed("KeyW")) {
          dy = -1;
        }
        if (InputState.isKeyPressed("KeyS")) {
          dy = 1;
        }
        if (InputState.isKeyPressed("KeyD")) {
          dx = 1;
        }
        player.position.add(dx, dy);
        if (dx !== 0 || dy !== 0) {
          const nid = NetworkState.getId(eid);
          sendIfOpen(
            NetworkState.maybeSocket!,
            serializeMessage(
              MessageType.playerMoved,
              new PlayerMove(player.position, nid!),
            ),
          );
        }
      }
    }
  }, 20);
}

function drawPlayers(ctx: CanvasRenderingContext2D) {
  for (const eid of PlayerState.getPlayerEids()) {
    const player = PlayerState.getPlayer(eid);
    ctx.fillStyle = NetworkState.isLocalEntity(eid) ? "red" : "blue";
    drawCircle(ctx, player.position.x, player.position.y, 4);
  }
}
