import {
  composeUpdate,
  composeWelcome,
  MessageFromClient,
  MessagePayloadFromClient,
  UpdateRequestMessage,
} from "../common/Message.ts";
import { createState } from "../common/State.ts";
const connectedClients = new Map<string, WebSocket>();
const connectedClientsReverse = new Map<WebSocket, string>();

// send a message to all connected clients
function broadcast(
  message: Parameters<typeof WebSocket["prototype"]["send"]>[0],
) {
  for (const client of connectedClients.values()) {
    client.send(message);
  }
}

export const handleOpen = (client: WebSocket, _: Event) => {
  const networkId = crypto.randomUUID();
  const welcome = composeWelcome(networkId);

  connectedClients.set(networkId, client);
  connectedClientsReverse.set(client, networkId);
  client.send(JSON.stringify(welcome));
};

export const handleClose = (client: WebSocket, _: Event) => {
  const playerId = connectedClientsReverse.get(client);
  const exit = {
    type: "exit",
    payload: {
      playerId,
    },
  };
  connectedClientsReverse.delete(client);
  if (playerId) {
    connectedClients.delete(playerId);
    broadcast(JSON.stringify(exit));
  }
};

export const handleError = (_client: WebSocket, _message: Event) => {
};

export const handleMessage = (client: WebSocket, message: MessageEvent) => {
  const parsedMessage = JSON.parse(message.data) as MessageFromClient;

  const handler = socketRouter[parsedMessage.type];
  if (handler) {
    handler(client, parsedMessage.payload as MessagePayloadFromClient);
  } else {
    console.warn("No handler for", parsedMessage.type);
  }
};

const handleUpdateRequest = (
  _client: WebSocket,
  payload: UpdateRequestMessage["payload"],
) => {
  Object.assign(state.networkedEntities, payload);
  broadcast(JSON.stringify(composeUpdate(state.networkedEntities)));
};

const socketRouter = {
  updateRequest: handleUpdateRequest,
};

const state = createState();
