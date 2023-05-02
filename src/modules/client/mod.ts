import { mouseButton } from "../common/Button.ts";
import { InputState } from "../common/state/Input.ts";
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

  window.onkeydown = (e) => {
    app.inputEvents.push(e);
  };
  window.onkeyup = (e) => {
    app.inputEvents.push(e);
  };
  window.onmousemove = (e) => {
    app.inputEvents.push(e);
  };
  window.onmousedown = (e) => {
    app.inputEvents.push(e);
  };
  window.onmouseup = (e) => {
    InputState.setButtonReleased(mouseButton(e.button));
    app.inputEvents.push(e);
  };
  window.onblur = () => app.handleIdle();
}
