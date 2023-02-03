import { Application, Router } from "https://deno.land/x/oak/mod.ts";

const connectedClients = new Map<string, WebSocket>();

const app = new Application();
const port = 2222;
const router = new Router();

// send a message to all connected clients
function broadcast(message: Parameters<typeof WebSocket["prototype"]["send"]>[0]) {
  for (const client of connectedClients.values()) {
    client.send(message);
  }
}

// send updated users list to all connected clients
function broadcast_usernames() {
  const usernames = [...connectedClients.keys()];
  console.log(
    "Sending updated username list to all clients: " +
      JSON.stringify(usernames),
  );
  broadcast(
    JSON.stringify({
      event: "update-users",
      usernames: usernames,
    }),
  );
}

router.get("/start_web_socket", (ctx) => {
  const socket = ctx.upgrade();
  const searchParams = ctx.request.url.searchParams

  const username = (searchParams.has("username") ? searchParams.get("username") : "anon") as string;
  if (connectedClients.has(username!)) {
    socket.close(1008, `Username ${username} is already taken`);
    return;
  }
  connectedClients.set(username, socket);
  console.log(`New client connected: ${username}`);

  // broadcast the active users list when a new user logs in
  socket.onopen = () => {
    broadcast_usernames();
  };

  // when a client disconnects, remove them from the connected clients list
  // and broadcast the active users list
  socket.onclose = () => {
    console.log(`Client ${username} disconnected`);
    connectedClients.delete(username);
    broadcast_usernames();
  };

  // broadcast new message if someone sent one
  socket.onmessage = (m) => {
    const data = JSON.parse(m.data);
    switch (data.event) {
      case "send-message":
        broadcast(
          JSON.stringify({
            event: "send-message",
            username: username,
            message: data.message,
          }),
        );
        break;
    }
  };
});

app.use(router.routes());
app.use(router.allowedMethods());
app.use(async (context) => {
  await context.send({
    root: `${Deno.cwd()}/`,
    index: "public/index.html",
  });
});

console.log("Listening at http://localhost:" + port);
await app.listen({ port });
