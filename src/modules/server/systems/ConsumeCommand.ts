import { filter, map } from "../../common/Iterable.ts";
import { IPayloadAny } from "../../common/Message.ts";
import { NetworkId } from "../../common/NetworkApi.ts";
import { MessageState } from "../../common/state/Message.ts";
import { TraitState } from "../../common/state/Trait.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";

let lastHandledStep = 0;

const firstReceivedSidByNid = new Map<NetworkId, number>();
const serverSidAtFirstMessageByNid = new Map<NetworkId, number>();
const commandQueueByNid = new Map<NetworkId, Array<[number, IPayloadAny]>>();
export const commandsReadyToProcess: Array<[number, IPayloadAny]> = [];

function updateMap<K, V>(
  map: Map<K, V>,
  key: K,
  fn: (value: V) => V,
  defaultValue: V,
) {
  const value = map.get(key);
  map.set(key, fn(value || defaultValue));
}

function exec(context: ISystemExecutionContext) {
  for (const Trait of TraitState.getTypes()) {
    const commands = filter(
      MessageState.getCommandsByStepReceived(
        lastHandledStep + 1,
        MessageState.currentStep,
      ),
      ([commandType]) => commandType === Trait.commandType,
    );
    for (const command of commands) {
      const payload = command[1];
      if (!firstReceivedSidByNid.has(payload.nid)) {
        firstReceivedSidByNid.set(payload.nid, payload.sid);
        serverSidAtFirstMessageByNid.set(payload.nid, MessageState.currentStep);
      }
      updateMap(
        commandQueueByNid,
        payload.nid,
        (queue) => {
          queue.push(command);
          return queue;
        },
        [],
      );
    }
  }

  // due to possible network lag, we may have received commands out of order or in batches
  // so we need to apply them in the order they were received and with the same timing that they were issued by the client
  // TODO this currently assumes that the queue is sorted by sid
  for (const [nid, queue] of commandQueueByNid.entries()) {
    const firstClientSid = firstReceivedSidByNid.get(nid)!;
    const serverSidAtFirstMessage = serverSidAtFirstMessageByNid.get(nid)!;
    // approximate the client's current time
    const clientSid = MessageState.currentStep - serverSidAtFirstMessage +
      firstClientSid;
    if (
      queue.length > 0 &&
      queue[0][1].sid <= clientSid
    ) {
      commandsReadyToProcess.push(queue.shift()!);
    }
  }

  for (const [type, payload] of commandsReadyToProcess) {
    const Trait = TraitState.getTypeByCommandType(type)!;
    Trait.applyCommand(payload, context);
  }

  lastHandledStep = MessageState.currentStep;
}

export const ConsumeCommandSystem: SystemLoader = () => {
  return { exec };
};
