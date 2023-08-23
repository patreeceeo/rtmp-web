import { ISystemExecutionContext, SystemLoader } from "~/common/systems/mod.ts";
import { addComponent } from "~/common/Component.ts";
import { LifeComponent, ParticleEffectComponent } from "~/common/components.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { set } from "~/common/Vec2.ts";
import { spawnPlayer } from "../functions.ts";
import { Player } from "../constants.ts";

export const LifeSystem: SystemLoader<ISystemExecutionContext> = () => {
  function exec(context: ISystemExecutionContext) {
    for (const player of PlayerState.entities.query()) {
      player.life.modeTime += context.deltaTime;
      if (player.life.mode === LifeComponent.PLAYER_DYING_ASCENT) {
        if (player.life.modeTime < 25) {
          set(player.velocity, 0, Player.DEATH_Y_VELOCITY);
          set(player.acceleration, 0, 0);
          player.physRestitution = 0;
        }
        if (player.velocity.y >= 0) {
          player.life.mode = LifeComponent.PLAYER_EXPLODE;
        }
      } else if (player.life.mode === LifeComponent.PLAYER_EXPLODE) {
        const spawner = addComponent(ParticleEffectComponent, player);
        spawner.particleEffect = ParticleEffectComponent.PIXEL_EXPLOSION;
        player.life.mode = LifeComponent.DEAD;
      } else if (
        player.life.mode === LifeComponent.DEAD &&
        player.life.modeTime > 1500
      ) {
        spawnPlayer(player);
      }
    }
  }
  return { exec };
};
