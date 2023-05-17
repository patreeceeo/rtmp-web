import { MessageState } from "~/common/state/Message.ts";
import { broadcastData, broadcastMessage } from "../mod.ts";
import { Ping, PingState } from "../../common/state/Ping.ts";
import { PingMsg } from "../../../examples/platformer/common/message.ts";
import { average, filter } from "../../common/Iterable.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { DataViewMovable } from "../../common/DataView.ts";
import { readMessage } from "../../common/Message.ts";
import { ServerNetworkState } from "../state/Network.ts";
import { PlayerState } from "../../common/state/Player.ts";
import { sendIfOpen } from "../../common/socket.ts";
import { getDataView } from "../../common/BufferValue.ts";
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
    // Play a little ping pong to calculate average network round-trip time
    // TODO delete this
    const ping = new Ping(MessageState.currentStep);
    PingState.add(ping);
    broadcastMessage(PingMsg, (p) => {
      p.id = ping.id;
    });
    ping.setSent();

    // clear old pings
    const oldPings = filter(
      PingState.getAll(),
      (pong) => performance.now() - pong.sentTimeMS > 4000,
    );
    for (const pong of oldPings) {
      PingState.delete(pong.id);
    }
    const pongs = filter(
      PingState.getAll(),
      (ping) => ping.state === Ping.Status.RECEIVED,
    );
    PingState.averageRoundTripTime = average(pongs, "roundTripTime");
  }
  return { exec };
};
