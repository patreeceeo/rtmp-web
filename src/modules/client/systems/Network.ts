import { SystemLoader } from "../../common/systems/mod.ts";
import { sendMessageToServer } from "../mod.ts";
import { MessageState } from "~/common/state/Message.ts";

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
}
export const ClientNetworkSystem: SystemLoader = () => {
  return { exec };
};
