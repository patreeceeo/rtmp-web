import { PlayerState } from "../state/Player.ts";
import { SystemLoader } from "./mod.ts";
import { determineRestingPosition } from "../../../modules/common/functions/physics.ts";
import { getPhysicsOptions } from "../functions/physicsHelpers.ts";
import { Vec2 } from "../Vec2.ts";
import { isClient } from "../env.ts";

// TODO seperate into client and server systems
const tempPositionDelta = new Vec2();
function exec() {
  for (const player of PlayerState.getPlayers()) {
    // if (!isClient) {
    player.targetPosition.copy(player.position);
    determineRestingPosition(
      player.targetPosition,
      player.velocity,
      getPhysicsOptions(player),
    );
    // } else {
    // console.log("target", player.targetPosition.snapshot, "current", player.position.snapshot);
    tempPositionDelta.copy(player.targetPosition).sub(player.position);
    // Adjust angle of velocity

    const speed = Math.sqrt(player.velocity.lengthSquared);
    player.velocity.set(0, 0);
    player.velocity.extend(speed, tempPositionDelta);
    // }
  }
}
export const TargetPhysicsSystem: SystemLoader = () => {
  return { exec };
};
