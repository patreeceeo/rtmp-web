import { EntityPrefabCollection } from "~/common/Entity.ts";
import { UuidComponent } from "~/common/components.ts";
import { PositionComponent } from "~/common/components.ts";
import { BodyDimensions } from "~/common/components.ts";

const params = new URLSearchParams(window.location.search);

class DebugStateApi {
  enabled = params.has("debug");
  messageSentSinceLastFrame = 0;
  messageReceivedSinceLastFrame = 0;
  clickableEntities = new EntityPrefabCollection([
    UuidComponent,
    PositionComponent,
    BodyDimensions,
  ]);
}

export const DebugState = new DebugStateApi();
