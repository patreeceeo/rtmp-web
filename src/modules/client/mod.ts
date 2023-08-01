import { ClientNetworkState } from "./state/Network.ts";
import { OutputState } from "./state/Output.ts";

export function pageLoad() {
  return new Promise<void>((resolve) => {
    window.onload = () => resolve();

    // In case load event already happened
    setTimeout(resolve);
  });
}

export abstract class ClientApp {
  abstract handleOpen(server: WebSocket, event: Event): void;
  abstract handleClose(server: WebSocket, event: Event): void;
  abstract handleError(server: WebSocket, event: Event): void;
  abstract handleMessage(server: WebSocket, event: MessageEvent): void;
  abstract handleIdle(): void;
  inputEvents: Array<Event> = [];
}

export async function startClient(app: ClientApp) {
  await pageLoad();
  OutputState.ready.resolve();

  if (!ClientNetworkState.isReady()) {
    const wsProtocol = location.origin.startsWith("https") ? "wss" : "ws";

    const socket = new WebSocket(
      `${wsProtocol}://${location.host}/start_web_socket`,
    );
    socket.binaryType = "arraybuffer";

    socket.onopen = (e) => {
      app.handleOpen(socket, e);
    };

    socket.onmessage = (e) => {
      // console.log("received raw data", new Uint8Array(e.data))
      app.handleMessage(socket, e);
    };

    socket.onerror = (e) => {
      app.handleError(socket, e);
    };
    socket.onclose = (e) => {
      app.handleClose(socket, e);
    };

    ClientNetworkState.socket = socket;
  }

  const addInputEvent = (e: Event) => {
    app.inputEvents.push(e);
  };

  let lastKeyDown: KeyboardEvent["code"] | undefined;
  window.onkeydown = (e) => {
    // This event repeats while key is held down
    // We only want to send one event per key press
    if (e.code !== lastKeyDown) {
      addInputEvent(e);
    }
    lastKeyDown = e.code;
  };
  window.onkeyup = (e) => {
    lastKeyDown = undefined;
    addInputEvent(e);
  };
  window.onmousemove = addInputEvent;
  window.onmousedown = addInputEvent;
  window.onmouseup = addInputEvent;
  window.onblur = () => app.handleIdle();
}
