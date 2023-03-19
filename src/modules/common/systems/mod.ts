import { NetworkId } from "../state/Network.ts"
import { AnyMessageArgs, AnyMessagePayload, MessageType, serializeMessage } from "../Message.ts";
import { broadcast, sendIfOpen } from "../socket.ts";
import { NetworkState } from "../state/Network.ts";
import { PlayerState } from "../state/Player.ts";
import { EntityId } from "../state/mod.ts";
import { Vec2 } from "../Vec2.ts";
import { Time } from "../state/Time.ts";

export function sendMessageToServer (type: MessageType, payload: AnyMessagePayload) {
  const socket = NetworkState.socket
  sendIfOpen(socket, serializeMessage(type, payload))
}


export function broadcastMessage (type: MessageType, payload: AnyMessagePayload, exclude?: NetworkId) {
  broadcast(NetworkState.getClientSockets(), serializeMessage(type, payload), exclude ? NetworkState.getClient(exclude)!.ws : undefined)
}

export function movePlayer (eid: EntityId, to: Vec2) {
  const player = PlayerState.getPlayer(eid!);
  player.position.copy(to);
  player.lastActiveTime = Time.elapsed
}

export interface System {
  handleFixedStep: () => void,
}

export interface SystemLoader {
  (): Promise<System> | System
}

export function startFixedStepPipeline(systems: Array<System>, stepMs: number) {
  setInterval(() => {
    for(const system of systems) {
      system.handleFixedStep()
    }
  }, stepMs)
}
