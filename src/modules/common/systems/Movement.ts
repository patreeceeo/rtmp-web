import { isServer } from "../env.ts";
import { clampLine, getDistanceSquared } from "../math.ts";
import { MessageType, PlayerMove, PlayerMoveWritable } from "../Message.ts";
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
    if (NetworkState.isLocalEntity(eid)) {
      const player = PlayerState.getPlayer(eid);
      const velocity = player.MAX_VELOCITY;
      let dx = 0,
        dy = 0;
      if (InputState.isKeyPressed("KeyA")) {
        dx = -1 * velocity * Time.delta;
      }
      if (InputState.isKeyPressed("KeyW")) {
        dy = -1 * velocity * Time.delta;
      }
      if (InputState.isKeyPressed("KeyS")) {
        dy = velocity * Time.delta;
      }
      if (InputState.isKeyPressed("KeyD")) {
        dx = velocity * Time.delta;
      }
      player.position.x += dx
      player.position.y += dy
      if (dx !== 0 || dy !== 0) {
        const nid = NetworkState.getId(eid);
        const sid = clientBuffer.writeIndex
        to.set(dx, dy)
        const move = new PlayerMove(to, nid!, sid)
        clientBuffer.put().copy(move)
        sendMessageToServer(
          MessageType.playerMoved,
          move
        );
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
// TODO
// const serverBuffer = new RingBuffer<PlayerMove, PlayerMoveWritable>(() => new PlayerMoveWritable(), 10)

export function addPlayerMoveFromClient(move: PlayerMove) {
  handlePlayerMoveServer(move.delta, move.nid, move.sid)
  // TODO
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
