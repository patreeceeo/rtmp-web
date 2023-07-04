import { almostEquals, copy } from "~/common/Vec2.ts";
import {
  IPlayerSnapshot,
  PlayerSnapshot,
} from "../../../examples/platformer/common/message.ts";
import { MessageState } from "../../common/state/Message.ts";
import { NetworkState } from "../../common/state/Network.ts";
import { PlayerState } from "../../common/state/Player.ts";
import { SystemLoader } from "../../common/systems/mod.ts";

/**
 * This system should send a snapshot if A.) the player's state has changed...
 */
function exec() {
  for (const player of PlayerState.entities.query()) {
    const nid = NetworkState.getId(player.eid)!;
    if (
      !almostEquals(
        player.targetPosition,
        player.previousTargetPosition_network,
      )
    ) {
      MessageState.addSnapshot(PlayerSnapshot, (p: IPlayerSnapshot) => {
        copy(p.position, player.targetPosition);
        copy(p.velocity, player.velocity);
        p.pose = player.pose;
        p.nid = nid;
        p.sid = MessageState.currentStep;
      });
    }
    copy(player.previousTargetPosition_network, player.targetPosition);
  }
}

export const ProduceSnapshotSystem: SystemLoader = () => {
  return { exec };
};
