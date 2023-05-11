import { MessageState } from "~/common/state/Message.ts";
import { broadcastData, broadcastMessage } from "../mod.ts";
import { Ping, PingState } from "../../common/state/Ping.ts";
import { PingMsg } from "../../../examples/platformer/common/message.ts";
import { average, filter } from "../../common/Iterable.ts";
import { SystemLoader } from "../../common/systems/mod.ts";

let lastHandledStep = -1;
export const NetworkSystem: SystemLoader = () => {
  function exec() {
    for (
      const view of MessageState.getSnapshotDataViewsByStepCreated(
        lastHandledStep + 1,
        MessageState.currentStep,
      )
    ) {
      // `payload.sid` is the stepId of the command to which this snapshot is responding,
      // not MessageState.currentStep, which will deviate from the corresponding value
      // on the client
      broadcastData(
        view,
      );
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
