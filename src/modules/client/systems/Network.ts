import { SystemLoader } from "../../common/systems/mod.ts";
import { sendMessageToServer } from "../mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { MessageType, PlayerMove } from "../../common/Message.ts";
import { applyCommand, applySnapshot } from "./Movement.ts";
import { ClientNetworkState } from "../state/Network.ts";

function exec() {
  // TODO if there are no commands to send, maybe we don't need to increment step ID?
  MessageState.incrementStepId();
  MessageState.prepareCommandBatch();
  for (const [type, payload] of MessageState.getUnsentCommands()) {
    sendMessageToServer(
      type,
      payload,
    );
    MessageState.lastSentStepId = payload.sid;
  }
  MessageState.markAllCommandsAsSent();

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
          applyCommand(type, payload);
        }
      }
    }
  }
}
export const ClientNetworkSystem: SystemLoader = () => {
  return { exec };
};
