import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState, SID_ORIGIN } from "~/common/state/Message.ts";
import { ClientNetworkState } from "../state/Network.ts";
import { sendIfOpen } from "../../common/socket.ts";
import { DebugState } from "../state/Debug.ts";

let lastHandledStep = SID_ORIGIN;
export const ClientNetworkSystem: SystemLoader = () => {
  function exec() {
    for (
      const [_, command] of MessageState.getCommandsByStepCreated(
        lastHandledStep,
        MessageState.currentStep,
      )
    ) {
      const dv: DataView = command.meta__dataView;
      sendMessageToServer(dv);
      DebugState.messageSentSinceLastFrame += 1;
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
