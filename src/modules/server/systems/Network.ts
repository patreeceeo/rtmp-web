import { MessageState } from "~/common/state/Message.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { ServerNetworkState } from "../state/Network.ts";
import { sendIfOpen } from "../../common/socket.ts";
import { TraitState } from "../../common/state/Trait.ts";

let lastHandledStep = -1;
export const NetworkSystem: SystemLoader = () => {
  function exec() {
    for (
      const [type, snapshot] of MessageState.getSnapshotsByStepCreated(
        lastHandledStep + 1,
        MessageState.currentStep,
      )
    ) {
      const eid = ServerNetworkState.getEntityId(snapshot.nid)!;
      const Trait = TraitState.getTypeBySnapshotType(type);
      const trait = Trait ? TraitState.getTrait(Trait, eid) : undefined;
      for (const client of ServerNetworkState.getClients()) {
        if (
          trait ? trait.shouldSendSnapshot(snapshot, client.nid) : true
        ) {
          sendIfOpen(
            client.ws,
            snapshot.meta.dataView,
          );
        }
      }
    }
    lastHandledStep = MessageState.currentStep;
  }
  return { exec };
};
