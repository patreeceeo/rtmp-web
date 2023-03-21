import { NetworkState } from "../common/state/Network.ts";

export abstract class ClientApp {
  abstract handleOpen(server: WebSocket, event: Event): void;
  abstract handleClose(server: WebSocket, event: Event): void;
  abstract handleError(server: WebSocket, event: Event): void;
  abstract handleMessage(server: WebSocket, event: MessageEvent): void;
  abstract handleLoad(ctx: CanvasRenderingContext2D): void;
  abstract handleKeyDown(e: KeyboardEvent): void;
  abstract handleKeyUp(e: KeyboardEvent): void;
}

export function startClient(app: ClientApp) {
  const handleLoad = () => {
    const el: HTMLCanvasElement = document.querySelector("#screen")!;
    const ctx = el.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      app.handleLoad(ctx);
    } else {
      console.log("Failed to get canvas rendering context");
    }

    const wsProtocol = location.origin.startsWith("https") ? "wss" : "ws";

    const socket = new WebSocket(
      `${wsProtocol}://${location.host}/start_web_socket`,
    );

    socket.onopen = (e) => {
      app.handleOpen(socket, e);
    };

    socket.onmessage = (e) => {
      app.handleMessage(socket, e);
    };

    NetworkState.socket = socket;
  };

  window.onload = handleLoad;

  // In case load event already happened
  setTimeout(() => {
    if (!NetworkState.isReady) {
      handleLoad();
    }
  });

  window.onkeydown = (e) => app.handleKeyDown(e);
  window.onkeyup = (e) => app.handleKeyUp(e);
}
