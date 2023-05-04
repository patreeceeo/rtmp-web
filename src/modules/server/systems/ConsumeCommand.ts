import { filter, map } from "../../common/Iterable.ts";
import { IPayloadAny } from "../../common/Message.ts";
import { NetworkId } from "../../common/NetworkApi.ts";
import { MessageState } from "../../common/state/Message.ts";
import { NetworkState } from "../../common/state/Network.ts";
import { TraitState } from "../../common/state/Trait.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";

let lastHandledStep = 0;

// TODO(perf) objects are probably faster
const firstReceivedSidByNid = new Map<NetworkId, number>();
const serverSidAtFirstMessageByNid = new Map<NetworkId, number>();
const lastHandledClientStep = new Map<NetworkId, number>();
export const commandsReadyToProcess: Array<[number, IPayloadAny]> = [];

function exec(context: ISystemExecutionContext) {
  // TODO what if these aren't in the order they were sent?
  const mostRecentBatchOfCommands = MessageState.getCommandsByStepReceived(
    lastHandledStep + 1,
    MessageState.currentStep,
  );
  lastHandledStep = MessageState.currentStep;

  // Due to network lag, we may have received commands in batches that were sent in different steps,
  // but we need to apply them with the same timing that they were issued by the client.
  // You'd think something like this would work, but you'd be wrong
  // TODO why? I suspect it's because setTimeout isn't accurate enough
  /*
  if(mostRecentBatchOfCommands.length > 0) {
    const firstCommand = mostRecentBatchOfCommands.shift()!;
    const firstSidInBatch = firstCommand[1].sid;
    processCommand(firstCommand, context);
    for(const command of mostRecentBatchOfCommands) {
      setTimeout(() => {
        processCommand(command, context);
      }, command[1].sid - firstSidInBatch);
    }
  }
  */
  for (
    const payload of map(mostRecentBatchOfCommands, ([_, payload]) => payload)
  ) {
    if (!firstReceivedSidByNid.has(payload.nid)) {
      firstReceivedSidByNid.set(payload.nid, payload.sid);
      serverSidAtFirstMessageByNid.set(payload.nid, MessageState.currentStep);
    }
  }

  for (const Trait of TraitState.getTypes()) {
    for (const nid of NetworkState.getAllIds()) {
      const firstClientSid = firstReceivedSidByNid.get(nid)!;
      const serverSidAtFirstMessage = serverSidAtFirstMessageByNid.get(nid)!;
      // approximate the client's current time
      const clientSid = MessageState.currentStep - serverSidAtFirstMessage +
        firstClientSid;
      const commandsReadyToApplyForClientAndTrait = filter(
        MessageState.getCommandsByStepCreated(
          (lastHandledClientStep.get(nid) || 0) + 1,
          clientSid,
        ),
        ([commandType, payload]) =>
          commandType === Trait.commandType && payload.nid === nid,
      );
      lastHandledClientStep.set(nid, clientSid);

      for (const command of commandsReadyToApplyForClientAndTrait) {
        const [type, payload] = command;
        const Trait = TraitState.getTypeByCommandType(type)!;
        Trait.applyCommand(payload, context);
        commandsReadyToProcess.push(command);
      }
    }
  }
}

export const ConsumeCommandSystem: SystemLoader = () => {
  return { exec };
};
