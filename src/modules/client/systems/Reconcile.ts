import { ClientNetworkState } from "../../client/state/Network.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { TraitState } from "../../common/state/Trait.ts";
import { filter, map } from "../../common/Iterable.ts";
import { NetworkId } from "../../common/NetworkApi.ts";
import { NetworkState } from "../../common/state/Network.ts";

const lastAppliedSnapshotStep = new Map<NetworkId, number>();
function exec(context: ISystemExecutionContext) {
  for (const nid of ClientNetworkState.getAllIds()) {
    const lastReceivedSid = MessageState.getLastReceivedStepId(nid);
    const lastSentSid = MessageState.getLastSentStepId(nid);
    const stepsSinceApplyingSnapshot = MessageState.currentStep -
      lastAppliedSnapshotStep.get(nid)!;
    const isLocal = NetworkState.isLocal(nid);
    if (
      lastReceivedSid >= MessageState.getLastHandledStepId(nid) ||
      stepsSinceApplyingSnapshot > 5
    ) {
      for (const Trait of TraitState.getTypes()) {
        const snapshotPayloadsForTrait = map(
          filter(
            MessageState.getSnapshotsByCommandStepCreated(
              lastReceivedSid,
              lastReceivedSid,
            ),
            ([type, payload]) => {
              return (
                payload.nid === nid &&
                type === Trait.snapshotType &&
                (payload.sid === lastSentSid || !isLocal)
              );
            },
          ),
          ([_type, payload]) => payload,
        );
        for (const payload of snapshotPayloadsForTrait) {
          const eid = ClientNetworkState.getEntityId(nid)!;
          const trait = TraitState.getTrait(Trait, eid);
          if (trait?.shouldApplySnapshot(payload, context)) {
            MessageState.setLastHandledStepId(nid, lastReceivedSid);
            lastAppliedSnapshotStep.set(nid, MessageState.currentStep);
            trait.applySnapshot(payload, context);
          }
        }
      }
    }
  }
}

export const ReconcileSystem: SystemLoader = () => {
  return { exec };
};
