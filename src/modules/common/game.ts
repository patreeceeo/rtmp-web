import {
  MessagePlayloadByType,
  MessageType,
  parseMessage,
  PlayerAdd,
  PlayerMove,
  serializeMessage,
} from "../common/Message.ts";
import { Client, NetworkId, NetworkState } from "../common/state/Network.ts";
import { InputState } from "../common/state/Input.ts";
import { PlayerState } from "../common/state/Player.ts";
import { drawCircle } from "../client/canvas.ts";
import { broadcast, sendIfOpen } from "../common/socket.ts";
import { isClient } from "./env.ts";
import { Time } from "./state/Time.ts";
import { TimeSystem } from "./systems/Time.ts";
import { addPlayerMoveFromClient, handleMoveFromServer, MovementSystem } from "./systems/Movement.ts";
import { NetworkSystem } from "./systems/Network.ts";
import { startPipeline, SystemPartial } from "./systems/mod.ts";
import { useClient } from "hot_mod/dist/client/mod.js";

export const hotExports = {
  updateScreen,
  drawPlayers,
};

// TODO refactor so that client/mod.ts imports handlers from here like server/mod.ts
export function initClient() {
  const el: HTMLCanvasElement = document.querySelector("#screen")!;
  const ctx = el.getContext("2d");
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    hotExports.updateScreen(ctx);
  } else {
    console.log("Failed to get canvas rendering context");
  }

  const wsProtocol = location.origin.startsWith("https") ? "wss" : "ws";

  const socket = new WebSocket(
    `${wsProtocol}://${location.host}/start_web_socket`,
  );

  socket.onopen = () => {
    console.log("socket is open");
  }

  socket.onmessage = (ev) => handleMessageFromServer(socket, ev);

  NetworkState.socket = socket;
}

export const handleMessageFromServer = (server: WebSocket, message: MessageEvent) => {
  const parsedMessage = parseMessage(message.data);

  if (parsedMessage.type in clientSocketRouter) {
    const handler =
      clientSocketRouter[parsedMessage.type as keyof typeof clientSocketRouter];
    handler(
      server,
      parsedMessage
        .payload as ClientMessagePlayloadByType[
          keyof ClientMessagePlayloadByType
        ],
    );
  } else {
    console.warn("No handler for", parsedMessage.type);
  }
};

type ClientMessagePlayloadByType = Pick<
  MessagePlayloadByType,
  MessageType.playerMoved | MessageType.playerAdded | MessageType.playerRemoved
>;

const clientSocketRouter: Record<
  keyof ClientMessagePlayloadByType,
  (
    client: WebSocket,
    data: ClientMessagePlayloadByType[keyof ClientMessagePlayloadByType],
  ) => void
> = {
  // TODO figure out how to get rid of these explicit anys
  // deno-lint-ignore no-explicit-any
  [MessageType.playerAdded]: handlePlayerAdded as any,
  // deno-lint-ignore no-explicit-any
  [MessageType.playerMoved]: handlePlayerMoved as any,
  // deno-lint-ignore no-explicit-any
  [MessageType.playerRemoved]: handlePlayerRemoved as any,
};

function handlePlayerAdded(
  _server: WebSocket,
  { isLocal, nid, position }: MessagePlayloadByType[MessageType.playerAdded],
) {
  const player = PlayerState.createPlayer();
  player.position.copy(position);
  NetworkState.setNetworkEntity(nid, player.eid, isLocal);
}
function handlePlayerMoved(_server: WebSocket, move: PlayerMove) {
  handleMoveFromServer(move)
}
function handlePlayerRemoved(_server: WebSocket, nid: NetworkId) {
  const eid = NetworkState.getEntityId(nid);
  PlayerState.deletePlayer(eid!);
}

if(isClient) {
  // TODO get hot_mod working on server
  useClient(import.meta, "ws://localhost:12321");
  if (import.meta.hot) {
    import.meta.hot.accept([], ({ module }) => {
      for (
        const key of Object.keys(hotExports) as Array<keyof typeof hotExports>
      ) {
        hotExports[key] = module.hotExports[key];
      }
    });
  }
}

export function handleKeyDown(ev: KeyboardEvent) {
  InputState.setKeyPressed(ev.code);
}
export function handleKeyUp(ev: KeyboardEvent) {
  InputState.setKeyReleased(ev.code);
}

function updateScreen(ctx: CanvasRenderingContext2D) {
  hotExports.drawPlayers(ctx);
  requestAnimationFrame(() => updateScreen(ctx));
}

function drawPlayers(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, 1000, 10000)
  for (const eid of PlayerState.getPlayerEids()) {
    const player = PlayerState.getPlayer(eid);
    ctx.fillStyle = NetworkState.isLocalEntity(eid) ? "red" : "blue";
    drawCircle(ctx, player.position.x, player.position.y, 4);
  }
}

export const handleOpen = (client: WebSocket, _: Event) => {
  const addedPlayer = PlayerState.createPlayer();
  addedPlayer.position.set(100, 100);
  const nid = NetworkState.createId();
  NetworkState.setNetworkEntity(nid, addedPlayer.eid, false);
  NetworkState.setClient(new Client(nid, client, Time.elapsed))
  sendIfOpen(
    client,
    serializeMessage(
      MessageType.playerAdded,
      new PlayerAdd(true, addedPlayer.position, nid),
    ),
  );

  // Tell other clients about added player
  broadcast(
    NetworkState.getClientSockets(),
    serializeMessage(
      MessageType.playerAdded,
      new PlayerAdd(false, addedPlayer.position, nid),
    ),
    client,
  );

  // Catch up
  for (const eid of PlayerState.getPlayerEids()) {
    const player = PlayerState.getPlayer(eid);
    if (eid !== addedPlayer.eid) {
      sendIfOpen(
        client,
        serializeMessage(
          MessageType.playerAdded,
          new PlayerAdd(false, player.position, NetworkState.getId(eid)!),
        ),
      );
    }
  }
};

export const handleClose = (ws: WebSocket, _: Event) => {
  const client = NetworkState.getClientForSocket(ws)
  if(client) {
    const eid = NetworkState.getEntityId(client!.nid);
    PlayerState.deletePlayer(eid!);
    NetworkState.removeClient(client.nid);
    broadcast(NetworkState.getClientSockets(),  serializeMessage(MessageType.playerRemoved, client.nid));
  }
};

export const handleError = (_client: WebSocket, message: Event) => {
  console.error("Error!", message);
};

export const handleMessage = (client: WebSocket, message: MessageEvent) => {
  const parsedMessage = parseMessage(message.data);

  if (parsedMessage.type in socketRouter) {
    const handler =
      socketRouter[parsedMessage.type as keyof typeof socketRouter];
    handler(
      client,
      parsedMessage
        .payload as ServerMessagePlayloadByType[
          keyof ServerMessagePlayloadByType
        ],
    );
  } else {
    console.warn("No handler for", parsedMessage.type);
  }
};

const systems = [TimeSystem(), MovementSystem(), NetworkSystem()] as Array<SystemPartial>

type ServerMessagePlayloadByType = Pick<
  MessagePlayloadByType,
  MessageType.playerMoved
>;

const socketRouter: Record<
  keyof ServerMessagePlayloadByType,
  (
    client: WebSocket,
    data: ServerMessagePlayloadByType[keyof ServerMessagePlayloadByType],
  ) => void
> = {
  [MessageType.playerMoved]: (_client, move) => {
    addPlayerMoveFromClient(move)
  },
};

startPipeline(systems, 80)
