import { serve } from "http"
import { handleOpen, handleClose, handleMessage, handleError } from "./game.ts"

const rootDir = Deno.cwd()

async function handleHttp(request: Request) {
  const url = new URL(request.url)
  if(url.pathname === "/start_web_socket") {
    const {socket, response} = Deno.upgradeWebSocket(request)
    socket.onopen = (socketEvent) => handleOpen(socket, socketEvent)
    socket.onclose = (socketEvent) => handleClose(socket, socketEvent)
    socket.onmessage = (socketEvent) => handleMessage(socket, socketEvent)
    socket.onerror = (socketEvent) => handleError(socket, socketEvent)
    return response
  } else if(url.pathname === "/") {
    const indexHtml = await Deno.readFile(`${rootDir}/public/index.html`)
    return new Response(indexHtml)
  } else if(url.pathname.startsWith("/public")) {
    const content = await Deno.readFile(`${rootDir}/${url.pathname}`)
    return new Response(content)
  }
  return new Response("Not found", {status: 404})
}

serve(handleHttp)
