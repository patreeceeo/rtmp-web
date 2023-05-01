import { filter, map } from "../../common/Iterable.ts";
import { MessageState } from "../../common/state/Message.ts";
import { TraitState } from "../../common/state/Trait.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";

function exec(context: ISystemExecutionContext) {
  for (const Trait of TraitState.getTypes()) {
    const commands = filter(
      MessageState.getCommandsByStepReceived(MessageState.currentStep),
      ([commandType]) => commandType === Trait.commandType,
    );
    for (const payload of map(commands, ([_type, payload]) => payload)) {
      Trait.applyCommand(payload, context);
    }
  }
}

export const ConsumeCommandSystem: SystemLoader = () => {
  return { exec };
};
