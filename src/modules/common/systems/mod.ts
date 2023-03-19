import { NetworkId } from "../state/Network.ts"
import { AnyMessagePayload, MessageType, serializeMessage } from "../Message.ts";
import { broadcast, sendIfOpen } from "../socket.ts";
import { NetworkState } from "../state/Network.ts";
import { Vec2 } from "../Vec2.ts";

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
/** TODO(perf) for events that happen much more often than fixed time step */
type SystemEventQueue<K extends SystemEventName> = Array<Parameters<SystemEvents[K]>>
interface SystemEvents {
  playerMove: (nid: NetworkId, to: Vec2) => void
}

export class SystemEventQueues {
  playerMove: SystemEventQueue<"playerMove"> = []
}

export interface SystemLoader {
  (): Promise<SystemPartial> | SystemPartial
}

export function startPipeline(systems: Array<SystemPartial>, stepMs: number, _queues: SystemEventQueues) {
  const fixieSystems = systems.filter((s) => s.fixie)
  // const movePlayerSystems = systems.filter((s) => s.events?.playerMove)
  setInterval(() => {
    for(const system of fixieSystems) {
      system.fixie!()
    }
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
