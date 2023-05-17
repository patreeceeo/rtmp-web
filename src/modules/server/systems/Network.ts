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

let lastHandledStep = -1;
export const NetworkSystem: SystemLoader = () => {
  function exec() {
    for (
      const view of MessageState.getSnapshotDataViewsByStepCreated(
        lastHandledStep + 1,
        MessageState.currentStep,
      )
    ) {
      const mv = new DataViewMovable(view.buffer);
      const [_, payload] = readMessage(mv, 0);
      const eid = ServerNetworkState.getEntityId(payload.nid)!;
      const player = PlayerState.getPlayer(eid);
      for (const client of ServerNetworkState.getClients()) {
        if (
          client.hasNetworkId(payload.nid) ? player.acceleration.isZero : true
        ) {
          sendIfOpen(
            client.ws,
            view,
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
