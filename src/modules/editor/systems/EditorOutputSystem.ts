import { drawSprite, handleSpriteRequests } from "~/client/functions/sprite.ts";
import { SystemLoader } from "~/common/systems/mod.ts";
import { OutputState } from "~/client/state/Output.ts";
import { setupCanvas } from "~/client/canvas.ts";
import { EditorState } from "~/editor/state/EditorState.ts";
import { SpriteState } from "~/client/state/Sprite.ts";
import { castEntity, getEntity } from "~/common/Entity.ts";
import { hasComponent } from "~/common/Component.ts";
import {
  ImageCollectionComponent,
  PoseComponent,
} from "~/common/components.ts";
import { set } from "~/common/Vec2.ts";
import { requestSprites } from "../../../examples/platformer/client/sprites.ts";
import { ClientNetworkState } from "~/client/state/Network.ts";

// TODO reduce duplication with /client/systems/Output.ts
export const EditorOutputSystem: SystemLoader = async () => {
  requestSprites();
  await handleSpriteRequests();

  const {
    foreground: { resolution },
  } = OutputState;

  set(OutputState.foreground.resolution, 100, 100);
  OutputState.foreground.element = document.querySelector("#foreground")!;

  setupCanvas(OutputState.foreground.element, resolution);

  OutputState.foreground.clientRect = OutputState.foreground.element
    .getBoundingClientRect();

  const ctx = OutputState.foreground.element.getContext("2d")!;
  if (ctx) {
    OutputState.foreground.context2d = ctx;
  } else {
    throw new Error("Failed to get foreground rendering context");
  }

  function exec() {
    if (EditorState.selectedUuid === undefined) return;
    const entity = getEntity(
      ClientNetworkState.getEntityId(EditorState.selectedUuid)!,
    );
    if (entity === undefined) return;

    if (
      hasComponent(ImageCollectionComponent, entity) &&
      hasComponent(PoseComponent, entity)
    ) {
      const spriteEntity = castEntity(entity, [
        ImageCollectionComponent,
        PoseComponent,
      ]);
      const sprite = SpriteState.find(
        spriteEntity.imageCollection,
        spriteEntity.pose,
      )!;
      drawSprite(sprite, ctx);
    }
  }

  return { exec };
};
