import { ClientNetworkState } from "../../client/state/Network.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { TraitState } from "../../common/state/Trait.ts";
import { filter, map } from "../../common/Iterable.ts";
import { IPayloadAny } from "../../common/Message.ts";

function exec() {
  for (const nid of ClientNetworkState.getLocalIds()) {
    const lastReceivedSid = MessageState.getLastReceivedStepId(nid);
    const lastSentSid = MessageState.lastSentStepId;
    if (
      lastReceivedSid < lastSentSid &&
      lastReceivedSid > MessageState.getLastHandledStepId(nid)
    ) {
      for (const Trait of TraitState.getTypes()) {
        const snapshots = map(
          filter(
            MessageState.getSnapshotsByCommandStepCreated(
              lastReceivedSid,
              lastReceivedSid,
            ),
            ([type]) => type === Trait.snapshotType,
          ),
          ([_type, payload]) => payload,
        );

        const commands = map(
          filter(
            MessageState.getCommandsByStepCreated(
              lastReceivedSid + 1,
              lastSentSid,
            ),
            ([type]) => type === Trait.commandType,
          ),
          ([_type, payload]) => payload,
        );
        reconcile(snapshots, commands, Trait.applySnapshot, Trait.applyCommand);
      }
      MessageState.setLastHandledStepId(nid, lastReceivedSid);
    }
  }
}

/**
 * Sometimes, especially when there's network lag, the server sends back snapshots
 * that correspond to commands that are one or more steps behind what the client has
 * sent, and since snapshots specify absolute values for state while commands specify
 * deltas, the old snapshots, if simply applied, would take the client back to an old
 * state. Instead, this function applies new snapshots for a given type, then applies
 * commands that have been sent since the corresponding command of the most recently
 * received snapshot.
 */
function reconcile<
  CommandPayload extends IPayloadAny,
  SnapshotPayload extends IPayloadAny,
>(
  snapshots: Iterable<SnapshotPayload>,
  commands: Iterable<CommandPayload>,
  applySnapshot: (payload: IPayloadAny) => void,
  applyCommand: (payload: IPayloadAny) => void,
) {
  let snapshotCount = 0;
  for (const payload of snapshots) {
    applySnapshot(payload);
    snapshotCount++;
  }
  if (snapshotCount > 0) {
    for (const payload of commands) {
      applyCommand(payload);
    }
  }
}

export const ReconcileSystem: SystemLoader = () => {
  return { exec };
};
