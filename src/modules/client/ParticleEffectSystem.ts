import { ISystemExecutionContext, SystemLoader } from "~/common/systems/mod.ts";
import { addEntity, EntityPrefabCollection } from "~/common/Entity.ts";
import {
  BodyDimensions,
  ImageCollectionComponent,
  LifeComponent,
  ParticleEffectComponent,
  ParticleTag,
  PoseComponent,
  PositionComponent,
  RgbaColorComponent,
} from "~/common/components.ts";
import { getPixels } from "~/common/functions/image.ts";
import { getFromCache } from "~/common/functions/image.ts";
import { addComponents, removeComponent } from "~/common/Component.ts";
import { getRandomIntBetween } from "~/common/random.ts";
import { PhysicsState } from "~/common/state/Physics.ts";
import { addScalars, copy, isZero, scale } from "~/common/Vec2.ts";
import { SpriteState } from "~/client/state/Sprite.ts";
import { ImageCollectionEnum } from "~/client/functions/sprite.ts";

const effectEntities = new EntityPrefabCollection([
  PositionComponent,
  ParticleEffectComponent,
  PoseComponent,
  ImageCollectionComponent,
  BodyDimensions,
]);

const particleEntities = new EntityPrefabCollection([
  ParticleTag,
  LifeComponent,
]);

export const ParticleEffectSystem: SystemLoader<
  ISystemExecutionContext
> = () => {
  function exec(context: ISystemExecutionContext) {
    for (const entity of effectEntities.query()) {
      const effect = entity.particleEffect;
      if (effect === ParticleEffectComponent.PIXEL_EXPLOSION) {
        const sprite = SpriteState.find(entity.imageCollection, entity.pose);
        if (!sprite) continue;
        const image = getFromCache(sprite.imageId);
        const { x: w, y: h } = entity.bodyDimensions;
        const w2 = w >> 1;
        const h2 = h >> 1;
        for (const pixel of getPixels(image)) {
          if (pixel.color.a > 0) {
            const pixelEntity = addComponents(
              [RgbaColorComponent, LifeComponent],
              PhysicsState.keneticEntities.add(addEntity())
            );
            pixelEntity.isParticle = true;

            const destColor = pixelEntity.rgbaColor;
            const srcColor = pixel.color;
            destColor.r = srcColor.r;
            destColor.g = srcColor.g;
            destColor.b = srcColor.b;
            destColor.a = srcColor.a;

            copy(pixelEntity.position, entity.position);
            addScalars(
              pixelEntity.position,
              (pixel.position.x - w2) << 8,
              (pixel.position.y - h2) << 8
            );

            const pixelVelocity = pixelEntity.velocity;
            copy(pixelVelocity, pixel.position);
            addScalars(pixelVelocity, -w2, -h2);
            addScalars(
              pixelVelocity,
              getRandomIntBetween(0, 20) - 10,
              getRandomIntBetween(0, 20) - 10
            );
            if (isZero(pixelVelocity)) {
              addScalars(
                pixelVelocity,
                getRandomIntBetween(0, 2) === 0
                  ? getRandomIntBetween(10, 20)
                  : getRandomIntBetween(-10, -20),
                getRandomIntBetween(0, 2) === 0
                  ? getRandomIntBetween(10, 20)
                  : getRandomIntBetween(-10, -20)
              );
            }
            scale(pixelVelocity, getRandomIntBetween(0, 20) - 10);

            const bodyDimensions = pixelEntity.bodyDimensions;
            bodyDimensions.x = 1;
            bodyDimensions.y = 1;
          }
        }
        entity.particleEffect = ParticleEffectComponent.NONE;
        removeComponent(ParticleEffectComponent, entity);
        entity.imageCollection = ImageCollectionEnum.NONE;
      }
    }

    for (const entity of particleEntities.query()) {
      const life = entity.life;
      life.modeTime += context.deltaTime;
      if (life.modeTime > 1500) {
        entity.isSoftDeleted = true;
      }
    }
  }
  return {
    exec,
  };
};
