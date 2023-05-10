import { filter, map } from "../../common/Iterable.ts";
import { flattenMaybes, Nothing } from "../../common/Maybe.ts";
import { MessageState } from "../../common/state/Message.ts";
import { NetworkState } from "../../common/state/Network.ts";
import { TraitState } from "../../common/state/Trait.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";

let lastHandledStep = 0;
function exec(context: ISystemExecutionContext) {
  for (const Trait of TraitState.getTypes()) {
    const commands = filter(
      MessageState.getCommandsByStepReceived(
        lastHandledStep + 1,
        MessageState.currentStep,
      ),
      ([commandType]) => commandType === Trait.commandType,
    );
    const snapshots = flattenMaybes(
      map(
        commands,
        ([_type, payload]) => {
          // was making these instance methods really a good idea?
          const eid = NetworkState.getEntityId(payload.nid)!;
          const trait = TraitState.getTrait(Trait, eid);
          if (trait) {
            return trait.getSnapshotMaybe(payload, context);
          }
          return Nothing();
        },
      ),
    );
    for (const [type, write] of snapshots) {
      const payload = MessageState.addSnapshot(type, write);
      const eid = NetworkState.getEntityId(payload.nid)!;
      const trait = TraitState.getTrait(Trait, eid);
      if (trait) {
        trait.applySnapshot(payload, context);
      }
    }
  }
  lastHandledStep = MessageState.currentStep;
}

export const ProduceSnapshotSystem: SystemLoader = () => {
  return { exec };
};
