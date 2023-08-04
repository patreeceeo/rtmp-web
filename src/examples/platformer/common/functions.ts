import { VelocityComponent } from "../../../modules/common/components.ts";
import { MaxSpeedComponent } from "../../../modules/common/components.ts";
import { EntityWithComponents } from "~/common/EntityWithComponents.ts";
import { invariant } from "../../../modules/common/Error.ts";
import { Player } from "./constants.ts";

type PlayerJumpComponents = [
  typeof MaxSpeedComponent,
  typeof VelocityComponent,
];

export function applyPlayerJump(
  player: EntityWithComponents<PlayerJumpComponents>,
  intensity: number,
) {
  invariant(
    intensity >= 0 && intensity <= Player.MAX_JUMP_INTENSITY,
    "intensity is out of range",
  );
  player.maxSpeed = Player.MAX_FALL_SPEED;
  player.velocity.y = -1 * Player.MAX_JUMP_SPEED *
    (intensity / Player.MAX_JUMP_INTENSITY);
}
