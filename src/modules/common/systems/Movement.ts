import { incomingPlayerMoveQueue } from "../../server/game.ts";
import { isServer } from "../env.ts";
import { clampLine, getDistanceSquared } from "../math.ts";
import { MessageType, PlayerMove } from "../Message.ts";
import { NetworkState } from "../state/Network.ts";
import { PlayerState } from "../state/Player.ts";
import { SystemAction, SystemActionType, SystemLoader } from "./mod.ts";

const MAX_MOVE_DISTANCE = 5;
const MAX_MOVE_DISTANCE_SQUARED = MAX_MOVE_DISTANCE * MAX_MOVE_DISTANCE;

function handleFixedStep () {
  const q = []
  if(isServer) {
    for(const requestedMove of incomingPlayerMoveQueue) {
      const eid = NetworkState.getEntityId(requestedMove.nid);
      if (PlayerState.hasPlayer(eid!)) {
        const player = PlayerState.getPlayer(eid!);
        let move: PlayerMove;
        if (
          getDistanceSquared(player.position, requestedMove.to) <
        MAX_MOVE_DISTANCE_SQUARED
        ) {
          move = requestedMove;
        } else {
          const clamped = clampLine(
            player!.position,
            requestedMove.to,
            MAX_MOVE_DISTANCE,
          );
          move = new PlayerMove(clamped!, requestedMove.nid);
        }
        q.push(
          new SystemAction(SystemActionType.playerMove, [
            eid!,
            move.to
          ]),
          new SystemAction(SystemActionType.broadcastMessage, [
            MessageType.playerMoved,
            move
          ])
        )
      } else {
        console.warn(
          `Requested moving unknown player with nid ${requestedMove.nid}`,
        );
      }
    }
  }
  incomingPlayerMoveQueue.length = 0
  return q
}
const system = {handleFixedStep}
export const MovementSystem: SystemLoader = () => {
  return system
}
