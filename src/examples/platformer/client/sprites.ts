import {
  ImageCollectionEnum,
  PoseType,
  SpriteRequest,
} from "~/client/functions/sprite.ts";
import { SpriteState } from "~/client/state/Sprite.ts";

export function requestSprites() {
  SpriteState.bindRequest(
    ImageCollectionEnum.penguin,
    PoseType.facingRight,
    new SpriteRequest("/public/assets/penguin.png", 16, 32),
  );
  SpriteState.bindRequest(
    ImageCollectionEnum.penguin,
    PoseType.facingLeft,
    new SpriteRequest("/public/assets/penguin.png", 16, 32, true),
  );

  SpriteState.bindRequest(
    ImageCollectionEnum.penguin2,
    PoseType.facingRight,
    new SpriteRequest("/public/assets/penguin2.png", 19, 32),
  );
  SpriteState.bindRequest(
    ImageCollectionEnum.penguin2,
    PoseType.facingLeft,
    new SpriteRequest("/public/assets/penguin2.png", 19, 32, true),
  );
}
