import { NetworkId } from "../state/Network.ts"
import { AnyMessageArgs, AnyMessagePayload, MessageType, serializeMessage } from "../Message.ts";
import { broadcast, sendIfOpen } from "../socket.ts";
import { NetworkState } from "../state/Network.ts";
import { PlayerState } from "../state/Player.ts";
import { EntityId } from "../state/mod.ts";
import { Vec2 } from "../Vec2.ts";
import { Time } from "../state/Time.ts";

function sendMessageToServer (type: MessageType, payload: AnyMessagePayload) {
  const socket = NetworkState.socket
  sendIfOpen(socket, serializeMessage(type, payload))
}


function broadcastMessage (type: MessageType, payload: AnyMessagePayload, exclude: NetworkId) {
  broadcast(NetworkState.getClientSockets(), serializeMessage(type, payload), exclude ? NetworkState.getClient(exclude)!.ws : undefined)
}

function playerMove (eid: EntityId, to: Vec2) {
  const player = PlayerState.getPlayer(eid!);
  player.position.copy(to);
  player.lastActiveTime = Time.elapsed
}

export enum SystemActionType {
  sendMessageToServer,
  broadcastMessage,
  playerMove
}
const actionMap: Record<SystemActionType, (...args: SystemActionArgs[keyof SystemActionArgs]) => void> = {
  // deno-lint-ignore no-explicit-any
  [SystemActionType.sendMessageToServer]: sendMessageToServer as any,
  // deno-lint-ignore no-explicit-any
  [SystemActionType.broadcastMessage]: broadcastMessage as any,
  // deno-lint-ignore no-explicit-any
  [SystemActionType.playerMove]: playerMove as any,
}

export function execute (actionQueue: Array<AnySystemAction>) {
  for(const action of actionQueue) {
    actionMap[action.type](...action.args)
  }
  actionQueue.length = 0
  return actionQueue
}



export class SystemAction<Type extends SystemActionType> {
  constructor(
    readonly type: Type,
    readonly args: SystemActionArgs[Type]
  ) {
  }
}


export type SystemActionArgs = {
  [SystemActionType.sendMessageToServer]: AnyMessageArgs,
  [SystemActionType.broadcastMessage]: [...AnyMessageArgs, NetworkId?]
  [SystemActionType.playerMove]: [EntityId, Vec2]
}

export type AnySystemAction = SystemAction<SystemActionType>

export interface System {
  handleFixedStep: () => Array<AnySystemAction>,
  // deno-lint-ignore no-explicit-any
  [method: string]: (...args: any[]) => Array<AnySystemAction>
}

export interface SystemLoader {
  (): Promise<System> | System
}

export function startFixedStepPipeline(systems: Array<System>, stepMs: number) {
  const actionQueue: Array<AnySystemAction> = []
  setInterval(() => {
    for(const system of systems) {
      actionQueue.push(...system.handleFixedStep())
    }
    execute(actionQueue)
    actionQueue.length = 0
  }, stepMs)
}
