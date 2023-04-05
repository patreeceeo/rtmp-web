import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import {
  MessagePlayloadByType,
  MessageType,
  serializeMessage,
} from "../../common/Message.ts";
import { ClientNetworkState } from "../state/Network.ts";
import { sendIfOpen } from "../../common/socket.ts";

export const ClientNetworkSystem: SystemLoader = () => {
  function exec() {
    // TODO if there are no commands to send, maybe we don't need to increment step ID?
    for (const [type, payload] of MessageState.getCommands()) {
      sendMessageToServer(
        type,
        payload,
      );
      MessageState.lastSentStepId = payload.sid;
    }
    MessageState.incrementStepId();
  }
  return { exec };
};

function sendMessageToServer<Type extends MessageType>(
  type: Type,
  payload: MessagePlayloadByType[Type],
) {
  const socket = ClientNetworkState.maybeSocket!;
  sendIfOpen(socket, serializeMessage(type, payload));
}
