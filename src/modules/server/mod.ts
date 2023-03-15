import { serve } from "http";
import * as Game from "./game.ts";
import { contentType as getContentType } from "media_types";
import {
  basename as getBaseName,
  dirname as getDirName,
  extname as getExtension,
} from "path";
import { BadRequestResponse, NotFoundResponse } from "../common/Response.ts";

const rootDir = Deno.cwd();

async function handleHttp(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === "/start_web_socket") {
    const { socket, response } = Deno.upgradeWebSocket(request);
    socket.onopen = (socketEvent) => Game.handleOpen(socket, socketEvent);
    socket.onclose = (socketEvent) => Game.handleClose(socket, socketEvent);
    socket.onmessage = (socketEvent) => Game.handleMessage(socket, socketEvent);
    socket.onerror = (socketEvent) => Game.handleError(socket, socketEvent);
    return response;
  } else if (url.pathname === "/") {
    const indexHtml = await Deno.readFile(`${rootDir}/public/index.html`);
    return new Response(indexHtml);
  } else if (url.pathname.startsWith("/public")) {
    console.log("public", url.pathname);
    const ext = getExtension(url.pathname);
    const base = getBaseName(url.pathname, `${ext}`);
    const dir = getDirName(url.pathname);
    const extRewrite = ext === ".ts" ? ".js" : ext;
    const contentType = getContentType(extRewrite);
    const assetPath = `${rootDir}${dir}/${base}${extRewrite}`;
    console.log({ extRewrite });
    if (contentType) {
      if (await isFilePath(assetPath)) {
        const content = await Deno.readFile(assetPath);
        return new Response(content, {
          headers: {
            "content-type": contentType,
          },
        });
      }
    } else {
      return new BadRequestResponse("Uknown MIME type for requested resource");
    }
  }
  return new NotFoundResponse();
}

serve(handleHttp);

async function isFilePath(path: string) {
  try {
    const info = await Deno.lstat(path);
    return info.isFile;
  } catch {
    return false;
  }
}
