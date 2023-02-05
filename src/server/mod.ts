import { handleOpen, handleClose, handleMessage, handleError } from "./game.ts"
const rootDir = Deno.cwd()
const indexHtml = Deno.readFileSync(`${rootDir}/public/index.html`)

console.info("Version info:",Deno.version)

async function handleHttp(conn: Deno.Conn) {
  for await (const httpEvent of Deno.serveHttp(conn)) {
    const url = new URL(httpEvent.request.url)
    if(url.pathname === "/start_web_socket") {
      const {socket, response} = Deno.upgradeWebSocket(httpEvent.request)
      socket.onopen = (socketEvent) => handleOpen(socket, httpEvent, socketEvent)
      socket.onclose = (socketEvent) => handleClose(socket, httpEvent, socketEvent)
      socket.onmessage = (socketEvent) => handleMessage(socket, httpEvent, socketEvent)
      socket.onerror = (socketEvent) => handleError(socket, httpEvent, socketEvent)
      httpEvent.respondWith(response)
    } else if(url.pathname === "/") {
      // TODO template
      const response = new Response(indexHtml)
      httpEvent.respondWith(response)
    } else if(url.pathname.startsWith("/public")) {
      // TODO use NGINX or the like
      const content = await Deno.readFile(`${rootDir}/${url.pathname}`)
      const response = new Response(content)
      httpEvent.respondWith(response)
    }
  }
}

const port = 2222
for await (const conn of Deno.listen({ port })) {
  handleHttp(conn);
}
console.log("Listening on port:" + port);
