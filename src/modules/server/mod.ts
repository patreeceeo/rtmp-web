import { serve } from "http";
import { parse as parseFlags } from "https://deno.land/std/flags/mod.ts";
import { contentType as getContentType } from "media_types";
import {
  basename as getBaseName,
  dirname as getDirName,
  extname as getExtension,
} from "path";
import { BadRequestResponse, NotFoundResponse } from "../common/Response.ts";
import { broadcast, sendIfOpen } from "../common/socket.ts";
import { ClientEntity, ServerNetworkState } from "./state/Network.ts";
import {
  IMessageDef,
  IPayloadAny,
  IWritePayload,
  MAX_MESSAGE_BYTE_LENGTH,
} from "../common/Message.ts";
import { DataViewMovable } from "../common/DataView.ts";
import { map, toArray } from "../common/Iterable.ts";
import { routeEditor, routeEditorEntity } from "~/common/routes.ts";

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
  ".json",
  ".ttf",
];

export abstract class ServerApp {
  /** In seconds */
  abstract idleTimeout: number;
  // TODO replace with handleConnect
  abstract handleOpen(client: WebSocket, event: Event): void;
  // TODO replace with handleDisconnect
  abstract handleClose(client: WebSocket, event: Event): void;
  abstract handleError(client: WebSocket, event: Event): void;
  abstract handleMessage(client: WebSocket, event: MessageEvent): void;
}

export function startServer(app: ServerApp) {
  ServerNetworkState.start();

  const { args } = Deno;
  const DEFAULT_PORT = 8000;
  const argPort = parseFlags(args).port;

  serve(handleHttp, { port: argPort ? Number(argPort) : DEFAULT_PORT });

  async function handleHttp(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === "/start_web_socket") {
      const { socket, response } = Deno.upgradeWebSocket(request, {
        idleTimeout: app.idleTimeout,
      });
      socket.binaryType = "arraybuffer";

      socket.onopen = (socketEvent) => {
        const clientNid = ServerNetworkState.createId();
        console.debug("Client connected", clientNid);

        const client = ServerNetworkState.addClient(socket, clientNid);
        client.lastActiveTime = performance.now();
        app.handleOpen(socket, socketEvent);
      };

      socket.onclose = (socketEvent) => {
        return app.handleClose(socket, socketEvent);
      };

      socket.onmessage = (socketEvent) => {
        const client = ServerNetworkState.getClientForSocket(socket);
        if (!client) {
          console.warn("Client not found for socket", socket);
          return;
        }
        client!.lastActiveTime = performance.now();
        app.handleMessage(socket, socketEvent);
      };

      socket.onerror = (socketEvent) => app.handleError(socket, socketEvent);

      return response;
    } else if (url.pathname === "/") {
      const indexHtml = await Deno.readFile(`${rootDir}/public/index.html`);
      return new Response(indexHtml);
    } else if (
      routeEditor.match(url.pathname) || routeEditorEntity.match(url.pathname)
    ) {
      const html = await Deno.readFile(`${rootDir}/public/editor.html`);
      return new Response(html);
    } else if (url.pathname.startsWith("/public")) {
      const ext = getExtension(url.pathname);
      const base = getBaseName(url.pathname, `${ext}`);
      const dir = getDirName(url.pathname);
      const extRewrite = ext === ".ts" ? ".js" : ext;
      const contentType = getContentType(extRewrite);
      const assetPath = `${rootDir}${dir}/${base}${extRewrite}`;
      if (contentType && allowedFileExtensions.includes(extRewrite)) {
        // console.info(
        //   `Requested ${url.pathname} => ${assetPath}, content type: ${contentType}`,
        // );
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
    } else if (url.pathname === "/info.json") {
      const info = {
        clients: toArray(
          map(ServerNetworkState.getClients(true), (client: ClientEntity) => {
            return {
              nid: client.uuid,
              lastActiveTime: client.lastActiveTime,
              isBeingRemoved: client.isSoftDeleted,
            };
          }),
        ),
        server: {
          startTime: stringifyMaybeDate(ServerNetworkState.startTime),
        },
      };
      return new Response(JSON.stringify(info), {
        headers: {
          "content-type": "application/json",
        },
      });
    }

    return new NotFoundResponse();
  }
}

function stringifyMaybeDate(date?: Date) {
  return date ? date.toISOString() : `undefined`;
}

async function isFilePath(path: string) {
  try {
    const info = await Deno.lstat(path);
    return info.isFile;
  } catch {
    return false;
  }
}

const buffer = new ArrayBuffer(MAX_MESSAGE_BYTE_LENGTH);
const view = new DataViewMovable(buffer);

interface AllBroacastOptions {
  /** Don't send to this socket */
  exclude: WebSocket;
  includeClientsBeingRemoved: boolean;
}

export function broadcastData(
  data: DataView | ArrayBuffer,
  options: Partial<AllBroacastOptions> = {},
) {
  const includeClientsBeingRemoved =
    options?.includeClientsBeingRemoved === true ? true : false;
  broadcast(
    ServerNetworkState.getClientSockets(includeClientsBeingRemoved),
    data,
    options.exclude,
  );
}
export function broadcastMessage<P extends IPayloadAny>(
  MsgDef: IMessageDef<P>,
  writePayload: IWritePayload<P>,
  options: Partial<AllBroacastOptions> = {},
) {
  MsgDef.write(view, 0, writePayload);
  broadcastData(
    buffer,
    options,
  );
}

// TODO replace type and payload paramters with values of MaybeAddMessageParameters and write to a data view then pass that to sendIfOpen
export function sendMessageToClient<P extends IPayloadAny>(
  client: WebSocket,
  MsgDef: IMessageDef<P>,
  writePayload: IWritePayload<P>,
) {
  MsgDef.write(view, 0, writePayload);
  sendIfOpen(client, buffer);
}
