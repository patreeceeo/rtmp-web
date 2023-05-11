import { filter } from "../../common/Iterable.ts";
import { MessageState } from "../../common/state/Message.ts";
import { NetworkState } from "../../common/state/Network.ts";
import { TraitState } from "../../common/state/Trait.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";

let lastHandledStep = -1;
let lastHandledCommandStep = -1;

function exec(context: ISystemExecutionContext) {
  let cmdCount = 0;
  for (const Trait of TraitState.getTypes()) {
    const commands = filter(
      MessageState.getCommandsByStepReceived(
        lastHandledStep,
        MessageState.currentStep,
      ),
      ([commandType]) => commandType === Trait.commandType,
    );
    for (const command of commands) {
      cmdCount++;
      const [_, payload] = command;
      const eid = NetworkState.getEntityId(payload.nid)!;
      const trait = TraitState.getTrait(Trait, eid);
      // TODO pipeline this
      if (trait && payload.sid > lastHandledCommandStep) {
        trait.applyCommand(payload, context);
        lastHandledCommandStep = payload.sid;
      }
    }
  }
  // if(cmdCount > 0) {
  //   console.log("Consumed", cmdCount, "commands");
  // }
  lastHandledStep = MessageState.currentStep;
}

export const ConsumeCommandSystem: SystemLoader = () => {
  return { exec };
};
