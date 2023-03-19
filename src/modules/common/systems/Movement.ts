import { clampLine, getDistanceSquared } from "../math.ts";
import { MessageType, PlayerMove } from "../Message.ts";
import { EntityId } from "../state/mod.ts";
import { NetworkId, NetworkState } from "../state/Network.ts";
import { PlayerState } from "../state/Player.ts";
import { Time } from "../state/Time.ts";
import { Vec2 } from "../Vec2.ts";
import { broadcastMessage, SystemLoader } from "./mod.ts";

const MAX_MOVE_DISTANCE = 5;
const MAX_MOVE_DISTANCE_SQUARED = MAX_MOVE_DISTANCE * MAX_MOVE_DISTANCE;

export function movePlayer (eid: EntityId, to: Vec2) {
  const player = PlayerState.getPlayer(eid!);
  player.position.copy(to);
  player.lastActiveTime = Time.elapsed
}

/** server authoritative */
function handlePlayerMove (nid: NetworkId, to: Vec2) {
  const eid = NetworkState.getEntityId(nid);
  if (PlayerState.hasPlayer(eid!)) {
    const player = PlayerState.getPlayer(eid!);
    const clamped =
      getDistanceSquared(player.position, to) < MAX_MOVE_DISTANCE_SQUARED
        ? to
        : clampLine(
          player!.position,
          to,
          MAX_MOVE_DISTANCE,
        )

        movePlayer(eid!, clamped!)
        broadcastMessage(
          MessageType.playerMoved,
          new PlayerMove(clamped!, nid)
        )
  } else {
    console.warn(
      `Requested moving unknown player with nid ${nid}`,
    );
  }
}

export const MovementSystem: SystemLoader = () => {
  return {events: {playerMove: handlePlayerMove}}
}
