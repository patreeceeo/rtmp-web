import {
  getMessageDef,
  IMessageDef,
  IPayloadAny,
  IWritePayload,
  readMessage,
} from "~/common/Message.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { Time } from "~/common/state/Time.ts";
import { SystemLoader } from "~/common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { broadcastData, broadcastMessage, sendTest } from "../mod.ts";
import { ServerNetworkState } from "../state/Network.ts";
import { NetworkId } from "../../common/NetworkApi.ts";

type MessageTranscoder<P extends IPayloadAny> = [
  IMessageDef<P>,
  ((p: P) => void) | null,
];

interface Options {
  /** amount of time an player can be idle before being removed, in seconds */
  idleTimeout: number;
  msgPlayerRemoved: MessageTranscoder<{
    nid: NetworkId;
    sid: number;
    // deno-lint-ignore no-explicit-any
    [key: string]: any;
  }>;
}

export const NetworkSystem: SystemLoader<[Options]> = (opts) => {
  const idleTimeout = opts?.idleTimeout || 60;
  function exec() {
    for (const client of ServerNetworkState.getClients()) {
      const inactiveTime = Time.elapsed - client.lastActiveTime;
      if (inactiveTime > idleTimeout * 1000 && !client.isBeingRemoved) {
        client.isBeingRemoved = true;
        for (const nid of client.getNetworkIds()) {
          const playerEid = ServerNetworkState.getEntityId(nid!)!;

          PlayerState.deletePlayer(playerEid);
          broadcastMessage(
            opts.msgPlayerRemoved[0],
            (p) => {
              p.nid = nid;
              p.sid = MessageState.currentStep;
              const optWriter = opts.msgPlayerRemoved[1];
              if (optWriter !== null) {
                optWriter(p);
              }
            },
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

    for (
      const view of MessageState.getSnapshotDataViewsByStepCreated(
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

    MessageState.incrementStepId();
  }
  return { exec };
};
