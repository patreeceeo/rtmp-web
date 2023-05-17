import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { ClientNetworkState } from "../state/Network.ts";
import { sendIfOpen } from "../../common/socket.ts";

let lastHandledStep = -1;
export const ClientNetworkSystem: SystemLoader = () => {
  function exec() {
    for (
      const [_, command] of MessageState.getCommandsByStepCreated(
        lastHandledStep,
        MessageState.currentStep,
      )
    ) {
      sendMessageToServer(command.meta.dataView);
    }
    lastHandledStep = MessageState.currentStep;
  }
  return { exec };
};

function sendMessageToServer(
  view: DataView,
) {
  const socket = ClientNetworkState.maybeSocket!;
  sendIfOpen(socket, view);
}
