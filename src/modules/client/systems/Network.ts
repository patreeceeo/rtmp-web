import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { ClientNetworkState } from "../state/Network.ts";
import { sendIfOpen } from "../../common/socket.ts";
import { DataViewMovable } from "../../common/DataView.ts";
import { PingMsg } from "../../../examples/platformer/common/message.ts";

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

const pingView = new DataViewMovable(new ArrayBuffer(PingMsg.byteLength));
// TODO - move this to a better place (maybe PingState.ts)
// in order to support this, we need to be able to schedule messages to be sent
// and/or schedule the execution of the network system
export function sendPingToServer(id: number) {
  PingMsg.write(pingView, 0, (p) => {
    p.id = id;
  });
  sendMessageToServer(pingView);
}
