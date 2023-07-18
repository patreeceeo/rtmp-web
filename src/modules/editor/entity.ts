import { pageLoad } from "~/client/mod.ts";
import { handleSpriteRequests } from "~/client/functions/sprite.ts";
import { requestSprites } from "../../examples/platformer/client/sprites.ts";

async function loadAssets() {
  requestSprites();
  await handleSpriteRequests();
}

loadAssets().then(async () => {
  await pageLoad();

  const channel = new BroadcastChannel("sync");
  channel.onmessage = (e) => {
    // console.log(e.data);
  };
});
