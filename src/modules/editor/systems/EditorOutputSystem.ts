import { drawSprite, handleSpriteRequests } from "~/client/functions/sprite.ts";
import { SystemLoader } from "~/common/systems/mod.ts";
import { OutputState } from "~/client/state/Output.ts";
import { setupCanvas } from "~/client/canvas.ts";
import { EditorState } from "~/editor/state/EditorState.ts";
import { SpriteState } from "~/client/state/Sprite.ts";
import { castEntity, getEntity, matchEntity } from "~/common/Entity.ts";
import { hasComponent } from "~/common/Component.ts";
import {
  GroundedTag,
  ImageCollectionComponent,
  PlayerTag,
  PoseComponent,
  TileTag,
  UuidComponent,
} from "~/common/components.ts";
import { set } from "~/common/Vec2.ts";
import { requestSprites } from "../../../examples/platformer/client/sprites.ts";
import { ClientNetworkState } from "~/client/state/Network.ts";
import { getAllEntities } from "~/common/Entity.ts";

// TODO reduce duplication with /client/systems/Output.ts
export const EditorOutputSystem: SystemLoader = async () => {
  requestSprites();
  await handleSpriteRequests();

  const {
    foreground: { resolution },
  } = OutputState;

  const tableBody = document.querySelector("#entity-table tbody")!;

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
    if (EditorState.selectedUuid !== undefined) {
      const entity = getEntity(
        ClientNetworkState.getEntityId(EditorState.selectedUuid)!,
      );
      if (entity !== undefined) {
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
    }

    for (const entity of getAllEntities()) {
      const el = getOrUpdateChildElementWithId(
        tableBody,
        "tr",
        getElementIdForEntity(entity.eid),
      );
      matchEntity(entity, [UuidComponent], (entity) => {
        getOrUpdateChildElementWithId(
          el,
          "td",
          getElementIdForEntityComponent(entity.eid, "uuid"),
        ).textContent = entity.uuid.toString();
      });
      getOrUpdateChildElementWithId(
        el,
        "td",
        getElementIdForEntityComponent(entity.eid, "isPlayer"),
      ).textContent = renderBoolean(hasComponent(PlayerTag, entity));
      getOrUpdateChildElementWithId(
        el,
        "td",
        getElementIdForEntityComponent(entity.eid, "isGrounded"),
      ).textContent = renderBoolean(hasComponent(GroundedTag, entity));
      getOrUpdateChildElementWithId(
        el,
        "td",
        getElementIdForEntityComponent(entity.eid, "isTile"),
      ).textContent = renderBoolean(hasComponent(TileTag, entity));
    }
  }

  return { exec };
};

function getElementIdForEntity(eid: number) {
  return `eid-${eid}`;
}

function getElementIdForEntityComponent(eid: number, componentName: string) {
  return `eid-${eid}-${componentName}`;
}

function renderBoolean(value: boolean) {
  return value ? "YES" : "NO";
}

function getOrUpdateChildElementWithId(
  el: Element,
  tagName: string,
  id: string,
) {
  const existing = el.querySelector(`#${id}`);
  if (existing) return existing;
  const newEl = document.createElement(tagName);
  newEl.id = id;
  el.appendChild(newEl);
  return newEl;
}
