import { filter, map } from "../../common/Iterable.ts";
import { MessageState } from "../../common/state/Message.ts";
import { flattenMaybes } from "../../common/state/mod.ts";
import { TraitState } from "../../common/state/Trait.ts";
import { SystemLoader } from "../../common/systems/mod.ts";

function exec() {
  for (const type of TraitState.getTypes()) {
    const Trait = TraitState.getType(type);
    const commands = filter(
      MessageState.getCommands(),
      ([commandType]) => commandType === Trait.commandType,
    );
    const snapshots = flattenMaybes(
      map(commands, ([_type, payload]) => Trait.getSnapshotMaybe(payload)),
    );
    for (const snapshot of snapshots) {
      Trait.applySnapshot(snapshot);
      MessageState.addSnapshot(Trait.snapshotType, snapshot);
    }
  }
}

export const TraitSystem: SystemLoader = () => {
  return { exec };
};
