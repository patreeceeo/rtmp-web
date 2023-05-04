import { isJust, unboxJust } from "../../common/Maybe.ts";
import { MessageState } from "../../common/state/Message.ts";
import { TraitState } from "../../common/state/Trait.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";
import { commandsReadyToSnapshot } from "./ConsumeCommand.ts";

function exec(context: ISystemExecutionContext) {
  // TODO(perf) more pipeline
  while (commandsReadyToSnapshot.length > 0) {
    const [type, payload] = commandsReadyToSnapshot.shift()!;
    const Trait = TraitState.getTypeByCommandType(type)!;
    const snapshotMaybe = Trait.getSnapshotMaybe(payload, context);
    if (isJust(snapshotMaybe)) {
      const [type, write] = unboxJust(snapshotMaybe)!;
      const payload = MessageState.addSnapshot(type, write);
      Trait.applySnapshot(payload, context);
    }
  }
}

export const ProduceSnapshotSystem: SystemLoader = () => {
  return { exec };
};
