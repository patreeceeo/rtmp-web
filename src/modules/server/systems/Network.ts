import { MessageType } from "~/common/Message.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { Time } from "~/common/state/Time.ts";
import { SystemLoader } from "~/common/systems/mod.ts";
import { broadcastMessage } from "../mod.ts";
import { ServerNetworkState } from "../state/Network.ts";

interface Options {
  /** amount of time an player can be idle before being removed, in seconds */
  idleTimeout: number
}

export const NetworkSystem: SystemLoader<Options> = (opts) => {
  const idleTimeout = opts?.idleTimeout || 60
  function fixie () {
    for(const player of PlayerState.getPlayers()) {
      const inactiveTime = Time.elapsed - player.lastActiveTime
      if(inactiveTime > idleTimeout * 1000) {
        PlayerState.deletePlayer(player.eid)
        const nid = ServerNetworkState.getId(player.eid)
        broadcastMessage(MessageType.playerRemoved, nid!)
      }
    }
  }
  return {fixie}
}
