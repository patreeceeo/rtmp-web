import { IMessageDef, IPayloadAny } from "~/common/Message.ts";
import { ISystemExecutionContext, SystemLoader } from "~/common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { broadcastMessage } from "../mod.ts";
import { ServerNetworkState } from "../state/Network.ts";
import { Uuid } from "../../common/NetworkApi.ts";
import { softDeleteEntity } from "../../common/Entity.ts";

type MessageTranscoder<P extends IPayloadAny> = [
  IMessageDef<P>,
  ((p: P) => void) | null,
];

interface Options {
  /** amount of time an player can be idle before being removed, in seconds */
  idleTimeout: number;
  msgPlayerRemoved: MessageTranscoder<{
    nid: Uuid;
    sid: number;
    // deno-lint-ignore no-explicit-any
    [key: string]: any;
  }>;
}

export const ServerPurgeSystem: SystemLoader<
  ISystemExecutionContext,
  [Options]
> = (
  opts,
) => {
  const idleTimeout = opts?.idleTimeout || 60;
  function exec({ elapsedTime }: ISystemExecutionContext) {
    for (const client of ServerNetworkState.getClients()) {
      const inactiveTime = elapsedTime - client.lastActiveTime;
      if (inactiveTime > idleTimeout * 1000 && !client.isBeingRemoved) {
        client.isBeingRemoved = true;
        for (const nid of client.getNetworkIds()) {
          const playerEid = ServerNetworkState.getEntityId(nid!)!;

          softDeleteEntity(playerEid);
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
        try {
          client.ws.close();
        } catch (e) {
          console.error(e);
        }
        ServerNetworkState.removeClient(client.nid);
      }
    }
  }
  return { exec };
};
