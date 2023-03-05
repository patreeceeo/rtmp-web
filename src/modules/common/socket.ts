
export type SerializedData = Parameters<WebSocket["send"]>[0];

export function sendIfOpen(socket: WebSocket, data: SerializedData) {
  if(socket.readyState === WebSocket.OPEN) {
    socket.send(data)
  }
}
