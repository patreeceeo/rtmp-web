import { ClientNetworkState } from "../../client/state/Network.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { TraitState } from "../../common/state/Trait.ts";
import { filter, last, map } from "../../common/Iterable.ts";
import { PlayerState } from "../../common/state/Player.ts";

function exec(context: ISystemExecutionContext) {
  for (const nid of ClientNetworkState.getAllIds()) {
    const lastReceivedSid = MessageState.getLastReceivedStepId(nid);
    const lastSentSid = MessageState.getLastSentStepId(nid);
    if (
      (lastReceivedSid === lastSentSid || !lastSentSid) &&
      lastReceivedSid > MessageState.getLastHandledStepId(nid)
    ) {
      for (const Trait of TraitState.getTypes()) {
        const snapshotPayloadsForTrait = map(
          filter(
            MessageState.getSnapshotsByCommandStepCreated(
              lastReceivedSid,
              lastReceivedSid,
            ),
            ([type, payload]) => {
              return payload.nid === nid && type === Trait.snapshotType;
            },
          ),
          ([_type, payload]) => payload,
        );
        for (const payload of snapshotPayloadsForTrait) {
          const eid = ClientNetworkState.getEntityId(nid)!;
          const trait = TraitState.getTrait(Trait, eid);
          const player = PlayerState.getPlayer(eid);
          if (trait) {
            if (payload.velocity.isZero) {
              MessageState.setLastHandledStepId(nid, lastReceivedSid);
            }
            if (
              !lastSentSid ||
              (player.velocity.isZero && payload.velocity.isZero)
            ) {
              console.log(
                "apply snapshot",
                payload.position.snapshot,
                payload.sid,
              );
              trait.applySnapshot(payload, context);
            }
          }
        }
      }
    }
  }
}

export const ReconcileSystem: SystemLoader = () => {
  return { exec };
};
