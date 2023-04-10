import { ClientNetworkState } from "../../client/state/Network.ts";
import { MessagePlayloadByType, MessageType } from "~/common/Message.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { TraitState } from "../../common/state/Trait.ts";

function exec() {
  const lastReceivedSid = MessageState.lastReceivedStepId;
  const lastSentSid = MessageState.lastSentStepId;
  if (lastReceivedSid < lastSentSid) {
    for (const type of TraitState.getTypes()) {
      const Trait = TraitState.getType(type);
      reconcile(
        Trait.snapshotType,
        Trait.commandType,
        Trait.applySnapshot,
        Trait.applyCommand,
      );
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
  SnapshotType extends MessageType,
  CommandType extends MessageType,
>(
  snapshotType: SnapshotType,
  commandType: CommandType,
  applySnapshot: (payload: MessagePlayloadByType[SnapshotType]) => void,
  applyCommand: (payload: MessagePlayloadByType[CommandType]) => void,
) {
  const lastReceivedSid = MessageState.lastReceivedStepId;
  const lastSentSid = MessageState.lastSentStepId;
  const snapshots = MessageState.getSnapshots(
    lastReceivedSid,
    lastReceivedSid,
    (type, payload) =>
      ClientNetworkState.isLocal(payload.nid) &&
      // deno-lint-ignore no-explicit-any
      (type as any) === snapshotType,
  );

  for (const [_type, payload] of snapshots) {
    applySnapshot(payload as MessagePlayloadByType[SnapshotType]);
  }
  if (snapshots.length > 0) {
    for (
      const [_type, payload] of MessageState.getCommands(
        lastReceivedSid + 1,
        lastSentSid,
        // deno-lint-ignore no-explicit-any
        (type) => (type as any) === commandType,
      )
    ) {
      applyCommand(payload as MessagePlayloadByType[CommandType]);
    }
  }
}

export const ReconcileSystem: SystemLoader = () => {
  return { exec };
};
