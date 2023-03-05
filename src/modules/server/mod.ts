import { serve } from "http";
import * as Game from "./game.ts";
import { HotSwapServer } from "../dev_server/mod.ts";
import { contentType as getContentType } from "media_types";
import { extname as getExtension, basename as getBaseName, dirname as getDirName } from "path";

const rootDir = Deno.cwd();
const hotSwapper = new HotSwapServer();

async function handleHttp(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === "/dev_socket") {
    console.log("dev socket request");
    const { socket, response } = Deno.upgradeWebSocket(request);
    hotSwapper.addClient(socket);
    return response;
  } else if (url.pathname === "/start_web_socket") {
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
    console.log("public", url.pathname)
    const ext = getExtension(url.pathname)
    const base = getBaseName(url.pathname, `${ext}`)
    const dir = getDirName(url.pathname)
    const extRewrite = ext === ".ts" ? ".js" : ext
    const contentType = getContentType(extRewrite);
    const assetPath = `${rootDir}${dir}/${base}${extRewrite}`
    if (contentType && await isFilePath(assetPath)) {
      const content = await Deno.readFile(assetPath);
      return new Response(content, {
        headers: {
          "content-type": contentType,
        },
      });
    }
  }
  return new Response("Not found", { status: 404 });
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
