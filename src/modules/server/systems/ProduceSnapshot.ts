import { filter, map } from "../../common/Iterable.ts";
import { flattenMaybes, Nothing } from "../../common/Maybe.ts";
import { IPayloadAny } from "../../common/Message.ts";
import { MessageState } from "../../common/state/Message.ts";
import { NetworkState } from "../../common/state/Network.ts";
import { PlayerState } from "../../common/state/Player.ts";
import { TraitState } from "../../common/state/Trait.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";

function exec(context: ISystemExecutionContext) {
  for (const nid of NetworkState.getAllIds()) {
    for (const Trait of TraitState.getTypes()) {
      const commands = map(
        filter(
          MessageState.getCommandsByStepCreated(
            MessageState.getLastHandledStepId(nid) + 1, // client's step
            MessageState.currentStep, // the server's step will always be ahead of all clients
          ),
          ([commandType, payload]) =>
            payload.nid === nid && commandType === Trait.commandType,
        ),
        ([_, payload]) => payload,
      );

      let lastCommand: IPayloadAny | undefined;
      for (const command of commands) {
        if (!lastCommand || command.sid > lastCommand.sid) {
          lastCommand = command;
        }
      }

      if (lastCommand) {
        const snapshots = flattenMaybes(
          map([lastCommand], (payload) => {
            // was making these instance methods really a good idea?
            const eid = NetworkState.getEntityId(nid)!;
            const trait = TraitState.getTrait(Trait, eid);
            if (trait) {
              return trait.getSnapshotMaybe(payload!, context);
            }
            return Nothing();
          }),
        );
        for (const [type, write] of snapshots) {
          const payload = MessageState.addSnapshot(type, write);
          const eid = NetworkState.getEntityId(payload.nid)!;
          const trait = TraitState.getTrait(Trait, eid);
          const player = PlayerState.getPlayer(eid);
          if (trait) {
            if (player.targetPosition.equals(player.position)) {
              MessageState.setLastHandledStepId(nid, payload.sid);
            }
            trait.applySnapshot(payload, context);
            MessageState.addSnapshot(type, write);
          }
        }
      }
    }
  }
}

export const ProduceSnapshotSystem: SystemLoader = () => {
  return { exec };
};
