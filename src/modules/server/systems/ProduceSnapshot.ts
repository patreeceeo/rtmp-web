import { almostEquals, copy, getLengthSquared } from "~/common/Vec2.ts";
import { filter, map } from "../../common/Iterable.ts";
import { flattenMaybes, Nothing } from "../../common/Maybe.ts";
import { IPayloadAny } from "../../common/Message.ts";
import { NetworkId } from "../../common/NetworkApi.ts";
import { MessageState } from "../../common/state/Message.ts";
import { NetworkState } from "../../common/state/Network.ts";
import { TraitState } from "../../common/state/Trait.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";

/** TODO should also map each trait */
const activeCommandForTraitPerClient = new Map<
  number,
  Map<NetworkId, IPayloadAny>
>();
const lastUpdatedTime = new Map<NetworkId, number>();

const setDefault = <K, V>(map: Map<K, V>, key: K, value: V) => {
  if (!map.has(key)) {
    map.set(key, value);
  }
};

/** Ignore commands received more than a certain number of steps ago */
const COMMAND_WINDOW = 500;

function exec(context: ISystemExecutionContext) {
  for (const nid of NetworkState.getAllIds()) {
    for (const Trait of TraitState.getTypes()) {
      setDefault(activeCommandForTraitPerClient, Trait.commandType, new Map());
      const commands = map(
        filter(
          MessageState.getCommandsByStepReceived(
            // Ignore commands received more than 1/2 second ago
            Math.max(0, MessageState.currentStep - COMMAND_WINDOW),
            MessageState.currentStep,
          ),
          ([commandType, payload]) =>
            payload.nid === nid && commandType === Trait.commandType,
        ),
        ([_, payload]) => payload,
      );

      let lastCommand = activeCommandForTraitPerClient
        .get(Trait.commandType)!
        .get(nid);
      for (const command of commands) {
        if (!lastCommand || command.sid > lastCommand.sid) {
          activeCommandForTraitPerClient
            .get(Trait.commandType)!
            .set(nid, command);
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
          if (trait) {
            const player = trait.entity;
            const playerIsAtTarget = almostEquals(
              player.targetPosition,
              player.position,
            );
            const speedSquared = getLengthSquared(player.velocity);
            const intermediateUpdateInterval = speedSquared / 80;
            const timeSinceLastUpdate = context.elapsedTime -
              (lastUpdatedTime.get(nid) ?? -1);
            if (
              playerIsAtTarget ||
              timeSinceLastUpdate > intermediateUpdateInterval
            ) {
              const payload = MessageState.addSnapshot(type, write);
              trait.applySnapshot(payload, context);
              lastUpdatedTime.set(nid, context.elapsedTime);
              if (playerIsAtTarget) {
                activeCommandForTraitPerClient
                  .get(Trait.commandType)!
                  .delete(nid);
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
