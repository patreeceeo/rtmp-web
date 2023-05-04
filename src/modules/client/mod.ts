import { ClientNetworkState } from "./state/Network.ts";
import { OutputState } from "./state/Output.ts";

export abstract class ClientApp {
  abstract handleOpen(server: WebSocket, event: Event): void;
  abstract handleClose(server: WebSocket, event: Event): void;
  abstract handleError(server: WebSocket, event: Event): void;
  abstract handleMessage(server: WebSocket, event: MessageEvent): void;
  abstract handleIdle(): void;
  inputEvents: Array<Event> = [];
}

export function startClient(app: ClientApp) {
  const handleLoad = () => {
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
    OutputState.ready.resolve();
  };

  window.onload = handleLoad;

  // In case load event already happened
  setTimeout(() => {
    if (!ClientNetworkState.isReady()) {
      handleLoad();
    }
  });

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
