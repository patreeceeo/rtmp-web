import { MessageType, PlayerMove } from "../../common/Message.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState } from "../state/Message.ts";
import { applyPlayerMove, applySnapshot } from "./Movement.ts";

export const ClientReconcileSystem: SystemLoader = () => {
  return { exec };
};

function exec() {
  const snapshot = MessageState.lastSnapshot;
  if (snapshot.type === MessageType.playerMoved) {
    const move = snapshot.payload as PlayerMove;
    applySnapshot(move.delta, move.nid);
    if (move.sid < MessageState.lastSentStepId) {
      for (const cmd of MessageState.getCommandsSentAfter(move.sid)) {
        if (cmd.nid === move.nid) {
          // predict that the server will accept our moves
          applyPlayerMove(cmd);
        }
      }
    }
  }
}
