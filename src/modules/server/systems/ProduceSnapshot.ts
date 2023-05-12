import { filter, map } from "../../common/Iterable.ts";
import { flattenMaybes, Nothing } from "../../common/Maybe.ts";
import { IPayloadAny } from "../../common/Message.ts";
import { NetworkId } from "../../common/NetworkApi.ts";
import { MessageState } from "../../common/state/Message.ts";
import { NetworkState } from "../../common/state/Network.ts";
import { PlayerState } from "../../common/state/Player.ts";
import { TraitState } from "../../common/state/Trait.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";

const lastCompletedCommandStep = new Map<NetworkId, number>();
const lastUpdatedTime = new Map<NetworkId, number>();

/** limit intermediate update snapshots to 5hz */
const INTERMEDIATE_SNAPSHOT_UPDATE_INTERVAL_MIN = 1000 / 5;

function exec(context: ISystemExecutionContext) {
  for (const nid of NetworkState.getAllIds()) {
    for (const Trait of TraitState.getTypes()) {
      const commands = map(
        filter(
          MessageState.getCommandsByStepCreated(
            (lastCompletedCommandStep.get(nid) ?? -1) + 1, // client's step
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
          const eid = NetworkState.getEntityId(nid)!;
          const trait = TraitState.getTrait(Trait, eid);
          if (trait && PlayerState.hasPlayer(eid)) {
            const player = PlayerState.getPlayer(eid);
            const playerIsAtTarget = player.targetPosition.almostEquals(
              player.position,
            );
            const timeSinceLastUpdate = context.elapsedTime -
              (lastUpdatedTime.get(nid) ?? -1);
            if (
              playerIsAtTarget ||
              timeSinceLastUpdate > INTERMEDIATE_SNAPSHOT_UPDATE_INTERVAL_MIN
            ) {
              const payload = MessageState.addSnapshot(type, write);
              trait.applySnapshot(payload, context);
              lastUpdatedTime.set(nid, context.elapsedTime);
              if (playerIsAtTarget) {
                lastCompletedCommandStep.set(nid, payload.sid);
              }
            }
          }
        }
      }
    }
  }
}

export const ProduceSnapshotSystem: SystemLoader = () => {
  return { exec };
};
