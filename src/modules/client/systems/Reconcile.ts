import { ClientNetworkState } from "../../client/state/Network.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { TraitState } from "../../common/state/Trait.ts";
import { filter, last, map } from "../../common/Iterable.ts";
import { IPayloadAny } from "../../common/Message.ts";

function exec(context: ISystemExecutionContext) {
  // TODO This code is confusing. First it loops through all local entities, then
  // nested-loops through all snapshots, regardless of whether they're for local
  // entities or not, then says it's handled the last received step for each local
  // entity. This seems, at best, innefficient.
  for (const nid of ClientNetworkState.getLocalIds()) {
    const lastReceivedSid = MessageState.getLastReceivedStepId(nid);
    const lastSentSid = MessageState.lastSentStepId;
    // TODO these if statements feel wrong
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
      // TODO it's be reconciled but not completely handled, needs to be tweened
      // MessageState.setLastHandledStepId(nid, lastReceivedSid);
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
  const snapshotToApply = last(snapshots);
  const commandToApply = last(commands);
  if (snapshotToApply) {
    applySnapshot(snapshotToApply, context);
    if (commandToApply) {
      applyCommand(commandToApply, context);
    }
  }
}

export const ReconcileSystem: SystemLoader = () => {
  return { exec };
};
