import { WORLD_DIMENSIONS } from "../../../examples/dots/mod.ts";
import { isServer } from "../env.ts";
import { clampLine, getDistanceSquared } from "../math.ts";
import { ColorChange, MessageType, PlayerMove, PlayerMoveWritable } from "../Message.ts";
import { RingBuffer } from "../RingBuffer.ts";
import { InputState } from "../state/Input.ts";
import { NetworkId, NetworkState } from "../state/Network.ts";
import { PlayerState } from "../state/Player.ts";
import { Time } from "../state/Time.ts";
import { Vec2 } from "../Vec2.ts";
import { broadcastMessage, sendMessageToServer, SystemLoader } from "./mod.ts";

const origin = Object.freeze(new Vec2(0, 0))

/** authoritative */
function handlePlayerMoveServer(delta: Vec2, nid: NetworkId, sid: number) {
  const eid = NetworkState.getEntityId(nid);
  if (PlayerState.hasPlayer(eid!)) {
    const player = PlayerState.getPlayer(eid!);
    // TODO what if lastActiveTime is changed by more than just moving?
    const timeSinceLastMove = Time.elapsed * player.lastActiveTime;
    const clamped =
      getDistanceSquared(origin, delta) < player.MAX_VELOCITY_SQR
        ? to
        : clampLine(
            origin,
            delta,
            player.MAX_VELOCITY * timeSinceLastMove
          );

    player.position.add(clamped);
    player.lastActiveTime = Time.elapsed;
    broadcastMessage(
      MessageType.playerMoved,
      new PlayerMove(player.position, nid, sid)
    );
  } else {
    console.warn(`Requested moving unknown player with nid ${nid}`);
  }
}

/** authoritative */
function acceptMoveFromServer(to: Vec2, nid: NetworkId) {
  const eid = NetworkState.getEntityId(nid);
  if (PlayerState.hasPlayer(eid!)) {
    const player = PlayerState.getPlayer(eid!);
    // Server sends back correct position
    player.position.copy(to)
  } else {
    console.warn(`Requested moving unknown player with nid ${nid}`);
  }
}

function fixieClient() {
  // loop thru local entities
  for (const eid of PlayerState.getPlayerEids()) {
    // TODO the server should determine whether a client is allowed to control an entity
    if (NetworkState.isLocalEntity(eid)) {
      const player = PlayerState.getPlayer(eid);
      const nid = NetworkState.getId(eid);
      const velocity = player.MAX_VELOCITY;
      const {x, y} = player.position;
      let dx = 0,
        dy = 0;
      if (InputState.isKeyPressed("KeyA") && x > player.width) {
        dx = -1 * velocity * Time.delta;
      }
      if (InputState.isKeyPressed("KeyW") && y > player.height) {
        dy = -1 * velocity * Time.delta;
      }
      if (InputState.isKeyPressed("KeyS") && y < WORLD_DIMENSIONS.HEIGHT - player.height) {
        dy = velocity * Time.delta;
      }
      if (InputState.isKeyPressed("KeyD") && x < WORLD_DIMENSIONS.WIDTH - player.width) {
        dx = velocity * Time.delta;
      }
      player.position.x += dx
      player.position.y += dy
      if (dx !== 0 || dy !== 0) {
        const sid = clientBuffer.writeIndex
        to.set(dx, dy)
        const move = new PlayerMove(to, nid!, sid)
        clientBuffer.put().copy(move)
        sendMessageToServer(
          MessageType.playerMoved,
          move
        );
      }

      if (InputState.isKeyPressed("KeyQ")) {
        player.color = player.color === 0 ? 6 : player.color - 1
        sendMessageToServer(MessageType.colorChange, new ColorChange(player.color, nid!))
      }
      if (InputState.isKeyPressed("KeyE")) {
        player.color = (player.color + 1) % 6
        sendMessageToServer(MessageType.colorChange, new ColorChange(player.color, nid!))
      }
    }
  }
}

function reapplyPlayerMove(delta: Vec2, nid: NetworkId) {
  const eid = NetworkState.getEntityId(nid)
  const player = PlayerState.getPlayer(eid!)
  player.position.add(delta)
}

function fixieServer() {
  // TODO
  // for(const move of serverBuffer.values(serverBuffer.readIndex, serverBuffer.writeIndex)) {
  //   handlePlayerMoveServer(move.delta, move.nid, move.sid)
  // }
  // serverBuffer.readIndex = serverBuffer.writeIndex
}

export const MovementSystem: SystemLoader = () => {
  return { fixie: isServer ? fixieServer : fixieClient, events: {} };
};

const to = new Vec2()

/** moves awaiting server acknowlogement */
const clientBuffer = new RingBuffer<PlayerMove, PlayerMoveWritable>(() => new PlayerMoveWritable(), 10)

/** moves received by server but yet to be processed */
// TODO(perf) pipeline handling moves
// const serverBuffer = new RingBuffer<PlayerMove, PlayerMoveWritable>(() => new PlayerMoveWritable(), 10)

export function addPlayerMoveFromClient(move: PlayerMove) {
  handlePlayerMoveServer(move.delta, move.nid, move.sid)
// TODO(perf) pipeline handling moves
  // serverBuffer.writeIndex = move.sid
  // serverBuffer.put().copy(move)
}

export function handleMoveFromServer(moveFromServer: PlayerMove) {
  acceptMoveFromServer(moveFromServer.delta, moveFromServer.nid)
  if(moveFromServer.sid < clientBuffer.writeIndex) {
    for(const move of clientBuffer.values(moveFromServer.sid + 1, clientBuffer.writeIndex)) {
      if(move.nid === moveFromServer.nid) {
        reapplyPlayerMove(move.delta, move.nid)
      }
    }
  }
}
