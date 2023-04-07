import { InputState } from "../common/state/Input.ts";
import { ClientNetworkState } from "./state/Network.ts";
import { OutputState } from "./state/Output.ts";

export abstract class ClientApp {
  abstract handleOpen(server: WebSocket, event: Event): void;
  abstract handleClose(server: WebSocket, event: Event): void;
  abstract handleError(server: WebSocket, event: Event): void;
  abstract handleMessage(server: WebSocket, event: MessageEvent): void;
  abstract handleIdle(): void;
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
    if (!ClientNetworkState.isReady) {
      handleLoad();
    }
  });

  window.onkeydown = (e) => {
    InputState.setKeyPressed(e.code);
  };
  window.onkeyup = (e) => {
    InputState.setKeyReleased(e.code);
  };
  window.onmousemove = (e) => {
    InputState.pointerPosition.set(e.clientX, e.clientY);
    InputState.pointerPositionIsDirty = true;
  };
  window.onblur = () => app.handleIdle();
}
