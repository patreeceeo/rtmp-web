import { pageLoad } from "~/client/mod.ts";
import { handleSpriteRequests } from "~/client/functions/sprite.ts";
import { requestSprites } from "../../examples/platformer/client/sprites.ts";
import { defineDeserializer, DESERIALIZE_MODE } from "bitecs";
import { ImageCollectionComponent } from "~/common/components.ts";
import { defaultWorld } from "~/common/World.ts";

async function loadAssets() {
  requestSprites();
  await handleSpriteRequests();
}

const deserialize = defineDeserializer([ImageCollectionComponent.store]);

loadAssets().then(async () => {
  await pageLoad();

  const channel = new BroadcastChannel("sync");
  channel.onmessage = (e) => {
    const entities = deserialize(
      defaultWorld as unknown as any,
      e.data,
      DESERIALIZE_MODE.MAP,
    );
    console.log("received", entities);
  };
});
