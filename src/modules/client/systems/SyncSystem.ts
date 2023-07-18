import { defineSerializer, getAllEntities } from "bitecs";
import { SystemLoader } from "~/common/systems/mod.ts";
import { defaultWorld } from "~/common/World.ts";
import { PositionComponent } from "~/common/components.ts";

export const SyncSystem: SystemLoader = () => {
  const serialize = defineSerializer([
    PositionComponent.store,
  ]);
  const channel = new BroadcastChannel("sync");
  function exec() {
    const entities = getAllEntities(defaultWorld);
    const data = serialize(entities);
    channel.postMessage(data);
  }
  return { exec };
};
