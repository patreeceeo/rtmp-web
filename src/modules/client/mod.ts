import {
  composeUpdateRequest,
  ExitMessage,
  MessageFromServer,
  MessagePayloadFromServer,
  UpdateMessage,
  WelcomeMessage,
} from "../common/Message.ts";
import { createState, InputState } from "../common/State.ts";
import { drawCircle } from "../client/canvas.ts";
import { sendIfOpen } from "../common/socket.ts";

const state = createState();

function handleWelcome({ networkId }: WelcomeMessage["payload"]) {
  state.localPlayer.networkId = networkId;
  state.networkedEntities[networkId] = { x: 100, y: 100 };
}
function handleUpdate(updatedEntities: UpdateMessage["payload"]) {
  Object.assign(state.networkedEntities, updatedEntities);
}
const handleEnter = () => {};
const handleExit = ({ networkId }: ExitMessage["payload"]) => {
  delete state.networkedEntities[networkId];
};

const wsProtocol = location.origin.startsWith("https") ? "wss" : "ws";

if (!state.ws) {
  const socket = state.ws = new WebSocket(
    `${wsProtocol}://${location.host}/start_web_socket`,
  );

  socket.onopen = startNetworkLoop;

  socket.onmessage = (message) => {
    const parsedMessage = JSON.parse(message.data) as MessageFromServer;

    const handler = socketRouter[parsedMessage.type];
    if (handler) {
      handler(parsedMessage.payload as MessagePayloadFromServer);
    } else {
      console.warn("No handler for", parsedMessage.type);
    }
  };
}

window.onload = () => {
  const el: HTMLCanvasElement = document.querySelector("#screen")!;
  const ctx = el.getContext("2d");
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    updateScreen(ctx);
  } else {
    console.log("Failed to get canvas rendering context");
  }
  state.loaded = true;
};

// In case load already happened
setTimeout(() => {
  if (!state.loaded) {
    window.onload!(new Event("load"));
  }
});

window.onkeydown = (ev) => {
  const inputState = state.localPlayer.input[ev.code] ||= {
    pressTime: 0,
    releaseTime: 0,
  };
  inputState.pressTime = Date.now();
};
window.onkeyup = (ev) => {
  const inputState = state.localPlayer.input[ev.code];
  inputState.releaseTime = Date.now();
};

const move = (x: number, y: number) => {
  if (state.localPlayer.networkId) {
    const localEntity = state.networkedEntities[state.localPlayer.networkId!];
    localEntity.x += x;
    localEntity.y += y;
  } else {
    console.warn("Trying to move without a network connection");
  }
};

const socketRouter = {
  welcome: handleWelcome,
  update: handleUpdate,
  enter: handleEnter,
  exit: handleExit,
};

const updateScreen = (ctx: CanvasRenderingContext2D) => {
  drawPlayers(ctx);
  requestAnimationFrame(() => updateScreen(ctx));
};

function startNetworkLoop() {
  setInterval(() => {
    function isPressed(state: InputState) {
      return state && state.pressTime > state.releaseTime;
    }

    const inputState = state.localPlayer.input;
    const keyA = inputState["KeyA"];
    const keyW = inputState["KeyW"];
    const keyS = inputState["KeyS"];
    const keyD = inputState["KeyD"];
    if (isPressed(keyA)) {
      move(-1, 0);
    }
    if (isPressed(keyW)) {
      move(0, -1);
    }
    if (isPressed(keyS)) {
      move(0, 1);
    }
    if (isPressed(keyD)) {
      move(1, 0);
    }
    sendIfOpen(state.ws!, JSON.stringify(composeUpdateRequest(state.networkedEntities)))
  }, 20);
}

function drawPlayers(ctx: CanvasRenderingContext2D) {
  for (const [id, entity] of Object.entries(state.networkedEntities)) {
    ctx.fillStyle = id === state.localPlayer.networkId ? "red" : "blue";
    drawCircle(ctx, entity.x, entity.y, 4);
  }
}
