import { filter, map } from "../../common/Iterable.ts";
import { flattenMaybes, Nothing } from "../../common/Maybe.ts";
import { MessageState } from "../../common/state/Message.ts";
import { NetworkState } from "../../common/state/Network.ts";
import { TraitState } from "../../common/state/Trait.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";

function exec(context: ISystemExecutionContext) {
  for (const nid of NetworkState.getAllIds()) {
    for (const Trait of TraitState.getTypes()) {
      const commands = filter(
        MessageState.getCommandsByStepReceived(
          MessageState.getLastHandledStepId(nid) + 1,
          MessageState.currentStep,
        ),
        ([commandType, payload]) =>
          payload.nid === nid && commandType === Trait.commandType,
      );
      const snapshots = flattenMaybes(
        map(
          commands,
          ([_type, payload]) => {
            // was making these instance methods really a good idea?
            const eid = NetworkState.getEntityId(nid)!;
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
          if (payload.velocity.isZero) {
            MessageState.setLastHandledStepId(nid, payload.sid);
          }
          trait.applySnapshot(payload, context);
          MessageState.addSnapshot(type, write);
        }
      }
    }
  }
}

export const ProduceSnapshotSystem: SystemLoader = () => {
  return { exec };
};
