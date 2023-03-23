export type SerializedData = Parameters<WebSocket["send"]>[0];

export function sendIfOpen(socket: WebSocket, data: SerializedData) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(data);
  } else {
    console.info("Did not send because socket was not open", data);
  }
}

export function broadcast(
  clients: Iterable<WebSocket>,
  message: SerializedData,
  except?: WebSocket
) {
  for (const client of clients) {
    if (except !== client) {
      sendIfOpen(client, message);
    }
  }
}
