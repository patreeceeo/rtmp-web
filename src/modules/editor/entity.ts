import { pageLoad } from "~/client/mod.ts";
import { requestSprites } from "../../examples/platformer/client/sprites.ts";
import { hasComponent } from "~/common/Component.ts";
import { defineDeserializer } from "~/common/World.ts";
import { FixedIntervalDriver, Pipeline } from "~/common/systems/mod.ts";
import { castEntity, EntityId, mapEntity } from "~/common/Entity.ts";
import { EditorOutputSystem } from "~/editor/systems/EditorOutputSystem.ts";
import { ClientNetworkState } from "~/client/state/Network.ts";
import { EditorState } from "~/editor/state/EditorState.ts";
import { Uuid } from "~/common/NetworkApi.ts";
import {
  EDITOR_BROADCAST_CHANNEL,
  EDITOR_COMPONENTS,
} from "~/editor/constants.ts";
import { UuidComponent } from "~/common/components.ts";

const deserialize = defineDeserializer(EDITOR_COMPONENTS);

requestSprites();
const pipeline = new Pipeline(
  [EditorOutputSystem()],
  new FixedIntervalDriver(8),
);

const channel = new BroadcastChannel(EDITOR_BROADCAST_CHANNEL);
channel.onmessage = (e) => {
  const eids = deserialize(e.data);
  for (const eid of eids) {
    const entity = mapEntity(eid as EntityId, EDITOR_COMPONENTS);
    if (hasComponent(UuidComponent, entity)) {
      const { uuid } = castEntity(entity, [UuidComponent]);
      ClientNetworkState.setNetworkEntity(uuid, eid as EntityId, false);
    }
  }
  const selectedUuid = parseInt(location.pathname.split("/").pop()!) as Uuid;
  EditorState.selectedEntityId = ClientNetworkState.getEntityId(selectedUuid)!;
};

pageLoad().then(() => {
  pipeline.start();
});
