import {
  LifeComponent,
  VelocityComponent,
} from "../../../modules/common/components.ts";
import { MaxSpeedComponent } from "../../../modules/common/components.ts";
import { EntityWithComponents } from "~/common/EntityWithComponents.ts";
import { invariant } from "../../../modules/common/Error.ts";
import { Player } from "./constants.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { copy, set } from "~/common/Vec2.ts";
import { LevelState } from "~/common/state/LevelState.ts";

type PlayerJumpComponents = [
  typeof MaxSpeedComponent,
  typeof VelocityComponent,
];

export function spawnPlayer(
  entity: EntityWithComponents<[]>,
): EntityWithComponents<typeof PlayerState.entities.components> {
  const player = PlayerState.entities.add(entity);
  player.life.mode = LifeComponent.ALIVE;
  player.shoulderCount = 0;
  player.friction = Player.GROUND_FRICTION;
  player.maxSpeed = Player.MAX_GROUND_SPEED;
  player.physRestitution = Player.PHYS_RESTITUTION;
  set(player.bodyDimensions, Player.WIDTH, Player.HEIGHT);
  set(player.velocity, 0, 0);
  set(player.acceleration, 0, 0);
  set(
    player.position,
    LevelState.dimensions.xMax / 2,
    LevelState.dimensions.yMin,
  );
  copy(player.targetPosition, player.position);
  return player;
}

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
