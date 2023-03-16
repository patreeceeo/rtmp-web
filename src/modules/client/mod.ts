import { MessagePlayloadByType, MessageType, parseMessage, PlayerMove, serializeMessage } from "../common/Message.ts";
import { AppState, InputState } from "../common/State.ts";
import { PlayerState } from "../common/state/Player.ts";
import { Vec2 } from "../common/Vec2.ts";
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

function init (){
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

  socket.onmessage = (ev) => handleMessage(socket, ev)

  AppState.setLoaded(socket)
}

export const handleMessage = (server: WebSocket, message: MessageEvent) => {
  const parsedMessage = parseMessage(message.data)

  if(parsedMessage.type in socketRouter) {
    const handler = socketRouter[parsedMessage.type as keyof typeof socketRouter];
    handler(server, parsedMessage.payload as ClientMessagePlayloadByType[keyof ClientMessagePlayloadByType]);
  } else {
    console.warn("No handler for", parsedMessage.type);
  }
};

type ClientMessagePlayloadByType = Pick<MessagePlayloadByType, MessageType.playerMoved | MessageType.playerAdded>

const socketRouter: Record<keyof ClientMessagePlayloadByType, (client: WebSocket, data: ClientMessagePlayloadByType[keyof ClientMessagePlayloadByType]) => void> = {
  // TODO figure out how to get rid of these explicit anys
  // deno-lint-ignore no-explicit-any
  [MessageType.playerAdded]: handlePlayerAdded as any,
  // deno-lint-ignore no-explicit-any
  [MessageType.playerMoved]: handlePlayerMoved as any
};

function handlePlayerAdded(_server: WebSocket, {isLocal, player}: MessagePlayloadByType[MessageType.playerAdded]) {
  if(isLocal) {
    PlayerState.setLocalPlayer(player)
  } else {
    PlayerState.addExistingPlayer(player)
  }
}
function handlePlayerMoved(_server: WebSocket, move: PlayerMove) {
  PlayerState.movePlayer(move.nid, move.to)
}

window.onload = init

// In case load event already happened
setTimeout(() => {
  if (!AppState.isLoaded) {
    init()
  }
});

window.onkeydown = (ev) => {
  InputState.setKeyPressed(ev.code)
};
window.onkeyup = (ev) => {
  InputState.setKeyReleased(ev.code)
};


function updateScreen(ctx: CanvasRenderingContext2D) {
  hotExports.drawPlayers(ctx);
  requestAnimationFrame(() => updateScreen(ctx));
}

const to = new Vec2()
function startNetworkLoop() {
  setInterval(() => {
    const player = PlayerState.getLocalPlayer()
    if(player) {
      let dx = 0, dy = 0
      if (InputState.isKeyPressed("KeyA")) {
        dx = -1
      }
      if (InputState.isKeyPressed("KeyW")) {
        dy = -1
      }
      if (InputState.isKeyPressed("KeyS")) {
        dy = 1
      }
      if (InputState.isKeyPressed("KeyD")) {
        dx = 1
      }
      to.x = player.position.x + dx
      to.y = player.position.y + dy
      PlayerState.movePlayer(player.nid, to)
      if(dx !== 0 || dy !== 0) {
        sendIfOpen(AppState.socket!, serializeMessage(MessageType.playerMoved, new PlayerMove(to, player.nid)))
      }
    }
  }, 20);
}

function drawPlayers(ctx: CanvasRenderingContext2D) {
  for (const player of PlayerState.getPlayers()) {
    ctx.fillStyle = PlayerState.isLocalPlayer(player.nid) ? "red" : "blue";
    drawCircle(ctx, player.position.x, player.position.y, 4);
  }
}
