import { serve } from "http";
import { contentType as getContentType } from "media_types";
import {
  basename as getBaseName,
  dirname as getDirName,
  extname as getExtension,
} from "path";
import { BadRequestResponse, NotFoundResponse } from "../common/Response.ts";
import { broadcast, sendIfOpen } from "../common/socket.ts";
import { Client, ServerNetworkState } from "./state/Network.ts";
import {
  IMessageDef,
  IPayloadAny,
  IWritePayload,
  MAX_MESSAGE_BYTE_LENGTH,
} from "../common/Message.ts";
import { DataViewMovable } from "../common/DataView.ts";

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
  abstract idleTimeout: number;
  abstract handleOpen(client: WebSocket, event: Event): void;
  abstract handleClose(client: WebSocket, event: Event): void;
  abstract handleError(client: WebSocket, event: Event): void;
  abstract handleMessage(client: WebSocket, event: MessageEvent): void;
}

export function startServer(app: ServerApp) {
  async function handleHttp(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === "/start_web_socket") {
      const { socket, response } = Deno.upgradeWebSocket(request, {
        idleTimeout: app.idleTimeout,
      });
      socket.binaryType = "arraybuffer";

      socket.onopen = (socketEvent) => {
        const clientNid = ServerNetworkState.createId();
        const client = new Client(clientNid, socket);
        // console.log("socket open, client nid", clientNid)

        ServerNetworkState.setClient(client);
        client.lastActiveTime = performance.now();
        app.handleOpen(socket, socketEvent);
      };

      socket.onclose = (socketEvent) => app.handleClose(socket, socketEvent);

      socket.onmessage = (socketEvent) => {
        const client = ServerNetworkState.getClientForSocket(socket);
        client!.lastActiveTime = performance.now();
        app.handleMessage(socket, socketEvent);
      };

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

const testBuffer = new ArrayBuffer(4);
const testView = new DataView(testBuffer, 0);
let testSid = 0;
export function sendTest() {
  testView.setUint8(0, 0);
  testView.setUint16(0, testSid);
  testSid++;
  broadcastData(testView);
}
