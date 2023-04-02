import { MessageType, PlayerMove } from "../../common/Message.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { ClientNetworkState } from "../state/Network.ts";
import { applyPlayerMove, applySnapshot } from "./Movement.ts";

export const ClientReconcileSystem: SystemLoader = () => {
  return { exec };
};

function exec() {
  const snapshot = MessageState.lastSnapshot;
  if (snapshot.type === MessageType.playerMoved) {
    const move = snapshot.payload as PlayerMove;
    applySnapshot(move.delta, move.nid);
    if (MessageState.lastReceivedStepId < MessageState.lastSentStepId) {
      for (
        const [type, payload] of MessageState.getCommandsSentAfter(
          MessageState.lastReceivedStepId,
        )
      ) {
        if (ClientNetworkState.isLocal(payload.nid)) {
          // predict that the server will accept our moves
          if (type === MessageType.playerMoved) {
            applyPlayerMove(payload as PlayerMove);
          }
        }
      }
    }
  }
}
