import { serve } from "http";
import * as Game from "./game.ts";
import { HotSwapServer } from "~/common/dev_tools/mod.ts";
import { contentType as getContentType } from "media_types";
import { extname } from "path";

const rootDir = Deno.cwd();

async function handleHttp(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === "/dev_socket") {
    console.log("dev socket request");
    const { socket, response } = Deno.upgradeWebSocket(request);
    new HotSwapServer(socket);
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
    const contentType = getContentType(extname(url.pathname));
    if (contentType) {
      const content = await Deno.readFile(`${rootDir}/${url.pathname}`);
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
