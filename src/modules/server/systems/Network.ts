import { MessageType, PlayerRemove } from "~/common/Message.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { Time } from "~/common/state/Time.ts";
import { SystemLoader } from "~/common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { broadcastMessage } from "../mod.ts";
import { ServerNetworkState } from "../state/Network.ts";

interface Options {
  /** amount of time an player can be idle before being removed, in seconds */
  idleTimeout: number;
}

export const NetworkSystem: SystemLoader<[Options]> = (opts) => {
  const idleTimeout = opts?.idleTimeout || 60;
  function exec() {
    MessageState.incrementStepId();
    for (const client of ServerNetworkState.getClients()) {
      const inactiveTime = Time.elapsed - client.lastActiveTime;
      if (inactiveTime > idleTimeout * 1000 && !client.isBeingRemoved) {
        client.isBeingRemoved = true;
        for (const nid of client.getNetworkIds()) {
          const playerEid = ServerNetworkState.getEntityId(nid!)!;

          PlayerState.deletePlayer(playerEid);
          broadcastMessage(
            MessageType.playerRemoved,
            new PlayerRemove(nid!, MessageState.lastStepId),
            {
              includeClientsBeingRemoved: true,
            },
          );
        }
      }
      // Paranoidly forcing closed websockets even if they are being created with an idleTimeout
      // bufferedAmount should be zero by this point
      if (inactiveTime > idleTimeout * 2 * 1000) {
        client.ws.close();
        ServerNetworkState.removeClient(client.nid);
      }
    }
  }
  return { exec };
};
