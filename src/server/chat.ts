const connectedClients = new Map<string, WebSocket>();

// send a message to all connected clients
function broadcast(message: Parameters<typeof WebSocket["prototype"]["send"]>[0]) {
  for (const client of connectedClients.values()) {
    client.send(message);
  }
}

function broadcastUsernames() {
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

const getUsernameFromRequest = (req: Request) => {
  const searchParams = new URL(req.url).searchParams

  return (searchParams.has("username") ? searchParams.get("username") : "anon") as string;
}

export function handleOpen(socket: WebSocket, e: Deno.RequestEvent, _: Event) {
  const username = getUsernameFromRequest(e.request)
  if (connectedClients.has(username!)) {
    socket.close(1008, `Username ${username} is already taken`);
    return;
  }
  connectedClients.set(username, socket);
  console.log(`New client connected: ${username}`);
  broadcastUsernames()
}

export function handleClose(_: WebSocket, e: Deno.RequestEvent, __: CloseEvent) {
  const username = getUsernameFromRequest(e.request)
  console.log(`Client ${username} disconnected`);
  connectedClients.delete(username);
  broadcastUsernames()
}
export function handleMessage(_: WebSocket, e: Deno.RequestEvent, m: MessageEvent) {
  const username = getUsernameFromRequest(e.request)
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
}
export function handleError(_: WebSocket, __: Deno.RequestEvent, ___: Event) {
}
