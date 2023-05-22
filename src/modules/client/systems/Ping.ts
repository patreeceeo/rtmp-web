import { cleanup, Ping, PingState, sendPing } from "../../common/state/Ping.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";
import { ClientNetworkState } from "../state/Network.ts";

interface IConfig {
  timeout: number;
}
export const PingSystem: SystemLoader<ISystemExecutionContext, [IConfig]> = (
  { timeout },
) => {
  function exec() {
    // Play a little ping pong to calculate average network round-trip time
    const ping = new Ping(PingState.nextId);
    PingState.add(ping);
    sendPing(ping.id, ClientNetworkState.maybeSocket!);
    ping.setSent();

    cleanup(timeout);
  }
  return { exec };
};
