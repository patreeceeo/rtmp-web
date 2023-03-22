import { clampLine, getDistanceSquared } from "../../common/math.ts";
import { MessageType, PlayerMove } from "../../common/Message.ts";
import { NetworkId } from "../../common/state/Network.ts";
import { PlayerState } from "../../common/state/Player.ts";
import { Time } from "../../common/state/Time.ts";
import { Vec2 } from "../../common/Vec2.ts";
import { Client, ServerNetworkState } from "../../server/state/Network.ts";
import { broadcastMessage } from "../mod.ts";

const origin = Object.freeze(new Vec2(0, 0))

/** authoritative */
function handlePlayerMove(delta: Vec2, nid: NetworkId, sid: number) {
  const eid = ServerNetworkState.getEntityId(nid);
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

// function fixie() {
  // TODO(perf) pipeline handling moves
  // for(const move of serverBuffer.values(serverBuffer.readIndex, serverBuffer.writeIndex)) {
  //   handlePlayerMoveServer(move.delta, move.nid, move.sid)
  // }
  // serverBuffer.readIndex = serverBuffer.writeIndex
// }

// export const MovementSystem: SystemLoader = () => {
//   return { fixie, events: {} };
// };

const to = new Vec2()

/** moves received by server but yet to be processed */
// TODO(perf) pipeline handling moves
// const serverBuffer = new RingBuffer<PlayerMove, PlayerMoveWritable>(() => new PlayerMoveWritable(), 10)

export function addPlayerMoveFromClient(move: PlayerMove, ws: WebSocket) {
  const client = ServerNetworkState.getClientForSocket(ws)!
  if(client.hasNid(move.nid)) {
    handlePlayerMove(move.delta, move.nid, move.sid)
  }
// TODO(perf) pipeline handling moves
  // serverBuffer.writeIndex = move.sid
  // serverBuffer.put().copy(move)
}
