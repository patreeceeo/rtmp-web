import { ClientNetworkState } from "../../client/state/Network.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { filter, map } from "../../common/Iterable.ts";
import { Uuid } from "../../common/NetworkApi.ts";
import { NetworkState } from "../../common/state/Network.ts";
import { ReconcileState } from "../state/Reconcile.ts";

const lastAppliedSnapshotStep = new Map<Uuid, number>();
function exec() {
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
      for (const [msgType, reconciler] of ReconcileState.query()) {
        const sstPayloads = map(
          filter(
            MessageState.getSnapshotsByCommandStepCreated(
              lastReceivedSid,
              lastReceivedSid,
            ),
            ([type, payload]) => {
              return (
                payload.nid === nid &&
                type === msgType &&
                (payload.sid === lastSentSid || !isLocal)
              );
            },
          ),
          ([_type, payload]) => payload,
        );
        for (const payload of sstPayloads) {
          for (const entity of reconciler.query(payload)) {
            MessageState.setLastHandledStepId(nid, lastReceivedSid);
            lastAppliedSnapshotStep.set(nid, MessageState.currentStep);
            reconciler.reconcile(entity, payload);
          }
        }
      }
    }
  }
}

export const ReconcileSystem: SystemLoader = () => {
  return { exec };
};
