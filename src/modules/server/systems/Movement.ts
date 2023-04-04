import { clampLine, getDistanceSquared } from "../../common/math.ts";
import {
  MessageType,
  PlayerMove,
  PlayerMoveMutable,
  PlayerSnapshot,
} from "../../common/Message.ts";
import { RingBuffer } from "../../common/RingBuffer.ts";
import { NetworkId } from "../../common/state/Network.ts";
import { PlayerState } from "../../common/state/Player.ts";
import { Time } from "../../common/state/Time.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { Vec2 } from "../../common/Vec2.ts";
import { ServerNetworkState } from "../../server/state/Network.ts";
import { broadcastMessage, sendMessageToClient } from "../mod.ts";

const origin = Object.freeze(new Vec2(0, 0));

/** authoritative */
function handlePlayerMove(delta: Vec2, nid: NetworkId, sid: number) {
  const eid = ServerNetworkState.getEntityId(nid);
  if (PlayerState.hasPlayer(eid!)) {
    const player = PlayerState.getPlayer(eid!);
    // TODO what if lastActiveTime is changed by more than just moving?
    const timeSinceLastMove = Time.elapsed * player.lastActiveTime;
    const clamped = getDistanceSquared(origin, delta) < player.MAX_VELOCITY_SQR
      ? to
      : clampLine(
        origin,
        delta,
        player.MAX_VELOCITY * timeSinceLastMove,
      );

    player.position.add(clamped);
    player.lastActiveTime = Time.elapsed;
    for (const client of ServerNetworkState.getClients()) {
      sendMessageToClient(
        client.ws,
        MessageType.playerSnapshot,
        new PlayerSnapshot(
          player.position,
          client.hasNetworkId(nid),
          nid,
          sid,
        ),
      );
    }
  } else {
    console.warn(`Requested moving unknown player with nid ${nid}`);
  }
}

function exec() {
  for (
    const move of serverBuffer.values(
      serverBuffer.readIndex,
      serverBuffer.writeIndex,
    )
  ) {
    handlePlayerMove(move.delta, move.nid, move.sid);
  }
  serverBuffer.readIndex = serverBuffer.writeIndex;
}

export const MovementSystem: SystemLoader = () => {
  return { exec, events: {} };
};

const to = new Vec2();

/** moves received by server but yet to be processed */
const serverBuffer = new RingBuffer<PlayerMove, PlayerMoveMutable>(
  () => new PlayerMoveMutable(new Vec2(), 0 as NetworkId, 0),
  10,
);

export function addPlayerMoveFromClient(move: PlayerMove, ws: WebSocket) {
  const client = ServerNetworkState.getClientForSocket(ws)!;
  if (client.hasNetworkId(move.nid)) {
    serverBuffer.put().copy(move);
  }
}
