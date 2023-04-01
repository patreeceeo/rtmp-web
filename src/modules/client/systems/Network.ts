import { SystemLoader } from "../../common/systems/mod.ts";
import { sendMessageToServer } from "../mod.ts";
import { MessageState } from "../state/Message.ts";

function exec() {
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
