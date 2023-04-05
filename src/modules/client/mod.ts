import { ClientNetworkState } from "./state/Network.ts";

export abstract class ClientApp {
  abstract handleOpen(server: WebSocket, event: Event): void;
  abstract handleClose(server: WebSocket, event: Event): void;
  abstract handleError(server: WebSocket, event: Event): void;
  abstract handleMessage(server: WebSocket, event: MessageEvent): void;
  abstract handleLoad(): void;
  abstract handleKeyDown(e: KeyboardEvent): void;
  abstract handleKeyUp(e: KeyboardEvent): void;
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

    app.handleLoad();
  };

  window.onload = handleLoad;

  // In case load event already happened
  setTimeout(() => {
    if (!ClientNetworkState.isReady) {
      handleLoad();
    }
  });

  window.onkeydown = (e) => app.handleKeyDown(e);
  window.onkeyup = (e) => app.handleKeyUp(e);
  window.onblur = () => app.handleIdle();
}
