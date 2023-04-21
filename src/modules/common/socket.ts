import { invariant } from "./Error.ts";
import { MAX_MESSAGE_BYTE_LENGTH } from "./Message.ts";

export function sendIfOpen(socket: WebSocket, data: ArrayBuffer | DataView) {
  if (socket.readyState === WebSocket.OPEN) {
    invariant(
      data.byteLength <= MAX_MESSAGE_BYTE_LENGTH,
      `trying to send a long message ${data.byteLength} bytes, max is ${MAX_MESSAGE_BYTE_LENGTH}`,
    );
    socket.send(data);
  } else {
    console.info("Did not send because socket was not open", data);
  }
}

export function broadcast(
  clients: Iterable<WebSocket>,
  message: ArrayBuffer | DataView,
  except?: WebSocket,
) {
  for (const client of clients) {
    if (except !== client) {
      sendIfOpen(client, message);
    }
  }
}
