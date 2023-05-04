import { ClientNetworkState } from "../../client/state/Network.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { TraitState } from "../../common/state/Trait.ts";
import { filter, map } from "../../common/Iterable.ts";
import { IPayloadAny } from "../../common/Message.ts";

let timeout: number;
function exec(context: ISystemExecutionContext) {
  // TODO This code is confusing. First it loops through all local entities, then
  // nested-loops through all snapshots, regardless of whether they're for local
  // entities or not, then says it's handled the last received step for each local
  // entity. This seems, at best, innefficient.
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
            ([type, payload]) =>
              type === Trait.snapshotType && payload.nid === nid,
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
        reconcile(
          snapshots,
          commands,
          Trait.applySnapshot,
          Trait.applyCommand,
          context,
        );
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
  applySnapshot: (
    payload: IPayloadAny,
    context: ISystemExecutionContext,
  ) => void,
  applyCommand: (
    payload: IPayloadAny,
    context: ISystemExecutionContext,
  ) => void,
  context: ISystemExecutionContext,
) {
  let snapshotToApply: IPayloadAny | undefined = undefined;
  let maxSnapshotSid = 0;
  for (const payload of snapshots) {
    // TODO is there a more efficient way to do this? could we just get the most recent snapshot from MessageState?
    if (payload.sid > maxSnapshotSid) {
      maxSnapshotSid = payload.sid;
      snapshotToApply = payload;
    }
  }
  if (snapshotToApply) {
    applySnapshot(snapshotToApply, context);
    for (const payload of commands) {
      if (payload.sid > maxSnapshotSid) {
        applyCommand(payload, context);
      }
    }
  }
}

export const ReconcileSystem: SystemLoader = () => {
  return { exec };
};
