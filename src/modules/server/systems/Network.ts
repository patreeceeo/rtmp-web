import { MessageState, SID_ORIGIN } from "~/common/state/Message.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { ServerNetworkState } from "../state/Network.ts";
import { sendIfOpen } from "../../common/socket.ts";

let lastHandledStep = SID_ORIGIN;
export const NetworkSystem: SystemLoader = () => {
  function exec() {
    for (
      const [_, snapshot] of MessageState.getSnapshotsByStepCreated(
        lastHandledStep + 1,
        MessageState.currentStep,
      )
    ) {
      for (const client of ServerNetworkState.getClients()) {
        sendIfOpen(
          client.ws,
          snapshot.meta__dataView,
        );
      }
    }
    lastHandledStep = MessageState.currentStep;
  }
  return { exec };
};
