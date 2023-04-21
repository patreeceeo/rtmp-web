import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { ClientNetworkState } from "../state/Network.ts";
import { sendIfOpen } from "../../common/socket.ts";

export const ClientNetworkSystem: SystemLoader = () => {
  function exec() {
    for (
      const view of MessageState.getCommandDataViewsByStepCreated(
        MessageState.currentStep,
      )
    ) {
      sendMessageToServer(view);
    }
    MessageState.lastSentStepId = MessageState.currentStep;
    MessageState.incrementStepId();
  }
  return { exec };
};

function sendMessageToServer(
  view: DataView,
) {
  const socket = ClientNetworkState.maybeSocket!;
  sendIfOpen(socket, view);
}
