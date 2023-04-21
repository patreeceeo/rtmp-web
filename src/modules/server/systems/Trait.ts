import { filter, map } from "../../common/Iterable.ts";
import { flattenMaybes } from "../../common/Maybe.ts";
import { MessageState } from "../../common/state/Message.ts";
import { TraitState } from "../../common/state/Trait.ts";
import { SystemLoader } from "../../common/systems/mod.ts";

function exec() {
  for (const Trait of TraitState.getTypes()) {
    const commands = filter(
      MessageState.getCommandsByStepReceived(MessageState.currentStep),
      ([commandType]) => commandType === Trait.commandType,
    );
    const snapshots = flattenMaybes(
      map(commands, ([_type, payload]) => Trait.getSnapshotMaybe(payload)),
    );
    for (const [type, write] of snapshots) {
      const payload = MessageState.addSnapshot(type, write);
      Trait.applySnapshot(payload);
    }
  }
}

export const TraitSystem: SystemLoader = () => {
  return { exec };
};
