import { SystemLoader } from "../../common/systems/mod.ts";
import { sendMessageToServer } from "../mod.ts";
import { MessageState } from "../state/Message.ts";

function exec() {
  // TODO if there are no commands to send, maybe we don't need to increment step ID?
  MessageState.incrementStepId();
  for (const [type, payload] of MessageState.getUnsentCommands()) {
    sendMessageToServer(
      type,
      payload,
    );
  }
  MessageState.markAllCommandsAsSent();
}
export const ClientNetworkSystem: SystemLoader = () => {
  return { exec };
};
