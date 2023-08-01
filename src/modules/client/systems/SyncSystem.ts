import { getAllEntities } from "bitecs";
import { SystemLoader } from "~/common/systems/mod.ts";
import { defaultWorld, defineSerializer } from "~/common/World.ts";
import {
  EDITOR_BROADCAST_CHANNEL,
  EDITOR_COMPONENTS,
} from "~/editor/constants.ts";

export const SyncSystem: SystemLoader = () => {
  const serialize = defineSerializer(EDITOR_COMPONENTS);
  const channel = new BroadcastChannel(EDITOR_BROADCAST_CHANNEL);
  function exec() {
    const entities = getAllEntities(defaultWorld);
    const data = serialize(entities);
    channel.postMessage(data);
  }
  return { exec };
};
