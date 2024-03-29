import { IEntityBase } from "~/common/Entity.ts";
import { Uuid } from "~/common/NetworkApi.ts";
import {
  ECSInstance,
  Vec2LargeSchema,
  Vec2SmallSchema,
} from "~/common/Vec2.ts";
import { ImageCollectionEnum, PoseType } from "~/client/functions/sprite.ts";
import { Life } from "~/common/Life.ts";
import { EcsRgbaColor } from "~/common/RgbaColor.ts";

export interface IEntityMaximal extends IEntityBase {
  uuid: Uuid;
  isSoftDeleted: boolean;
  isPlayer: boolean;
  life: Life;
  isClient: boolean;
  isTile: boolean;
  isGrounded: boolean;
  isParticle: boolean;
  killOnCollision: boolean;
  isEditorDragging: boolean;
  shoulderCount: number;
  bodyIsStatic: boolean;
  bodyDimensions: ECSInstance<typeof Vec2SmallSchema>;
  physRestitution: number;
  position: ECSInstance<typeof Vec2LargeSchema>;
  targetPosition: ECSInstance<typeof Vec2LargeSchema>;
  previousPosition: ECSInstance<typeof Vec2LargeSchema>;
  previousTargetPosition_output: ECSInstance<typeof Vec2LargeSchema>;
  previousTargetPosition_network: ECSInstance<typeof Vec2LargeSchema>;
  velocity: ECSInstance<typeof Vec2LargeSchema>;
  maxSpeed: number;
  friction: number;
  acceleration: ECSInstance<typeof Vec2SmallSchema>;
  imageId: number;
  imageCollection: ImageCollectionEnum;
  pose: PoseType;
  lastActiveTime: number;
  particleEffect: number;
  rgbaColor: EcsRgbaColor;
}
