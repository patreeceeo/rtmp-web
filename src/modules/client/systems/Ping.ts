import { cleanup, Ping, PingState, sendPing } from "../../common/state/Ping.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";
import { DebugState } from "../state/Debug.ts";
import { ClientNetworkState } from "../state/Network.ts";

interface IConfig {
  timeout: number;
}
export const PingSystem: SystemLoader<ISystemExecutionContext, [IConfig]> = ({
  timeout,
}) => {
  function exec() {
    if (DebugState.enabled) {
      const now = performance.now();

      // Play a little ping pong to calculate average network round-trip time
      const ping = new Ping(PingState.nextId);
      PingState.add(ping);
      sendPing(ping.id, ClientNetworkState.maybeSocket!);
      ping.setSent(now);

      cleanup(now - timeout);
    }
  }
  return { exec };
};
