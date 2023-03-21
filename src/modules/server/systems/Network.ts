import { MessageType } from "~/common/Message.ts";
import { NetworkState } from "~/common/state/Network.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { Time } from "~/common/state/Time.ts";
import { broadcastMessage, SystemLoader } from "~/common/systems/mod.ts";

export const NetworkSystem: SystemLoader = () => {
  function fixie () {
    for(const player of PlayerState.getPlayers()) {
      const inactiveTime = Time.elapsed - player.lastActiveTime
      if(inactiveTime > 60000) {
        PlayerState.deletePlayer(player.eid)
        const nid = NetworkState.getId(player.eid)
        broadcastMessage(MessageType.playerRemoved, nid!)
      }
    }
  }
  return {fixie}
}
