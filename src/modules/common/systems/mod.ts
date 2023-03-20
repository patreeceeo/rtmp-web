import { NetworkId } from "../state/Network.ts"
import { AnyMessagePayload, MessageType, serializeMessage } from "../Message.ts";
import { broadcast, sendIfOpen } from "../socket.ts";
import { NetworkState } from "../state/Network.ts";

export function sendMessageToServer (type: MessageType, payload: AnyMessagePayload) {
  const socket = NetworkState.maybeSocket!
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

// TODO merge with system interface
interface SystemEvents {
  create: () => void
  dispose: () => void
}

export interface SystemLoader {
  (): Promise<SystemPartial> | SystemPartial
}

export function startPipeline(systems: Array<SystemPartial>, stepMs: number) {
  const fixieSystems = systems.filter((s) => s.fixie)
  // const movePlayerSystems = systems.filter((s) => s.events?.playerMove)
  setInterval(() => {
    for(const system of fixieSystems) {
      system.fixie!()
    }
  }, stepMs)
}
