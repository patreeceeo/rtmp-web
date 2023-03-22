import { serve } from "http";
import { contentType as getContentType } from "media_types";
import {
  basename as getBaseName,
  dirname as getDirName,
  extname as getExtension,
} from "path";
import { AnyMessagePayload, MessageType, serializeMessage } from "../common/Message.ts";
import { BadRequestResponse, NotFoundResponse } from "../common/Response.ts";
import { broadcast } from "../common/socket.ts";
import { NetworkId } from "../common/state/Network.ts";
import { ServerNetworkState } from "./state/Network.ts";

const rootDir = Deno.cwd();

const allowedFileExtensions = [
  ".html",
  ".css",
  ".js",
  ".mjs",
  ".jpg",
  ".jpeg",
  ".gif",
  ".png",
  ".ico",
  ".map",
];

export abstract class ServerApp {
  /** In seconds */
  abstract idleTimeout: number
  abstract handleOpen(client: WebSocket, event: Event): void;
  abstract handleClose(client: WebSocket, event: Event): void;
  abstract handleError(client: WebSocket, event: Event): void;
  abstract handleMessage(client: WebSocket, event: MessageEvent): void;
}

export function startServer(app: ServerApp) {
  async function handleHttp(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === "/start_web_socket") {
      const { socket, response } = Deno.upgradeWebSocket(request, {idleTimeout: app.idleTimeout});
      socket.onopen = (socketEvent) => app.handleOpen(socket, socketEvent);
      socket.onclose = (socketEvent) => app.handleClose(socket, socketEvent);
      socket.onmessage = (socketEvent) =>
        app.handleMessage(socket, socketEvent);
      socket.onerror = (socketEvent) => app.handleError(socket, socketEvent);
      return response;
    } else if (url.pathname === "/") {
      const indexHtml = await Deno.readFile(`${rootDir}/public/index.html`);
      return new Response(indexHtml);
    } else if (url.pathname.startsWith("/public")) {
      const ext = getExtension(url.pathname);
      const base = getBaseName(url.pathname, `${ext}`);
      const dir = getDirName(url.pathname);
      const extRewrite = ext === ".ts" ? ".js" : ext;
      const contentType = getContentType(extRewrite);
      const assetPath = `${rootDir}${dir}/${base}${extRewrite}`;
      if (contentType && allowedFileExtensions.includes(extRewrite)) {
        console.info(
          `Requested ${url.pathname} => ${assetPath}, content type: ${contentType}`,
        );
        if (await isFilePath(assetPath)) {
          const content = await Deno.readFile(assetPath);
          return new Response(content, {
            headers: {
              "content-type": contentType,
            },
          });
        } else {
          console.warn(`Requested file ${url.pathname} not found`);
        }
      } else {
        return new BadRequestResponse(
          `MIME type for ${url.pathname} is unknown`,
        );
      }
    }
    return new NotFoundResponse();
  }

  serve(handleHttp);
}

async function isFilePath(path: string) {
  try {
    const info = await Deno.lstat(path);
    return info.isFile;
  } catch {
    return false;
  }
}

export function broadcastMessage (type: MessageType, payload: AnyMessagePayload, excludeClient?: WebSocket) {
  broadcast(ServerNetworkState.getClientSockets(), serializeMessage(type, payload), excludeClient)
}
