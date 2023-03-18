import { isServer } from "../env.ts";
import { MessageType } from "../Message.ts";
import { NetworkState } from "../state/Network.ts";
import { PlayerState } from "../state/Player.ts";
import { Time } from "../state/Time.ts";
import { SystemLoader, SystemAction, SystemActionType } from "./mod.ts";

export const NetworkSystem: SystemLoader = () => {
  function handleFixedStep () {
    const q = []
    if(isServer) {
      for(const player of PlayerState.getPlayers()) {
        const inactiveTime = Time.elapsed - player.lastActiveTime
        if(inactiveTime > 120000) {
          PlayerState.deletePlayer(player.eid)
          const nid = NetworkState.getId(player.eid)
          q.push(new SystemAction(SystemActionType.broadcastMessage, [MessageType.playerRemoved, nid!]))
        }
      }
    }
    return q
  }
  return {handleFixedStep}
}
