import { NetworkId } from "../state/Network.ts"
import { AnyMessagePayload, MessageType, PlayerMove, serializeMessage } from "../Message.ts";
import { broadcast, sendIfOpen } from "../socket.ts";
import { NetworkState } from "../state/Network.ts";
import { Vec2 } from "../Vec2.ts";
import { EntityId } from "../state/mod.ts";

export function sendMessageToServer (type: MessageType, payload: AnyMessagePayload) {
  const socket = NetworkState.socket
  sendIfOpen(socket, serializeMessage(type, payload))
}


export function broadcastMessage (type: MessageType, payload: AnyMessagePayload, exclude?: NetworkId) {
  broadcast(NetworkState.getClientSockets(), serializeMessage(type, payload), exclude ? NetworkState.getClient(exclude)!.ws : undefined)
}


export interface System {
  fixie?: () => void,
  events?: Partial<SystemEvents>
}
export type SystemPartial = Partial<System>

type SystemEventName = keyof SystemEvents
/** TODO(perf) use for events that happen much more often than fixed time step */
type SystemEventQueue<K extends SystemEventName> = Array<Parameters<SystemEvents[K]>>
interface SystemEvents {
  playerMove: (nid: NetworkId, to: Vec2) => void;
  playerMovePredict: (eid: EntityId, to: Vec2) => void;
}

export class SystemEventQueues {
  playerMove: SystemEventQueue<"playerMove"> = []
  playerMoveByNid = new Map<NetworkId, Vec2>
  addPlayerMove(nid: NetworkId, to: Vec2) {
    if(this.playerMoveByNid.has(nid)) {
      this.playerMoveByNid.get(nid)?.copy(to)
    } else {
      this.playerMoveByNid.set(nid, to)
    }
  }
}

export interface SystemLoader {
  (): Promise<SystemPartial> | SystemPartial
}

export function startPipeline(systems: Array<SystemPartial>, stepMs: number, queues: SystemEventQueues) {
  const fixieSystems = systems.filter((s) => s.fixie)
  const movePlayerSystems = systems.filter((s) => s.events?.playerMove)
  // const movePlayerSystems = systems.filter((s) => s.events?.playerMove)
  setInterval(() => {
    for(const system of fixieSystems) {
      system.fixie!()
    }
    for(const system of movePlayerSystems) {
      for(const [nid, to] of queues.playerMoveByNid.entries()) {
        system.events!.playerMove!(nid, to)
      }
    }
    queues.playerMoveByNid.clear()
    /**
    * example queue usage:
    *
    if(queues.playerMove.length > 0) {
      console.log(`processing ${queues.playerMove.length} playerMoves`)
      for(const system of movePlayerSystems) {
        for(const event of queues.playerMove) {
          system.events!.playerMove!.apply(null, event)
        }
      }
    }
    queues.playerMove.length = 0
    */
  }, stepMs)
}
