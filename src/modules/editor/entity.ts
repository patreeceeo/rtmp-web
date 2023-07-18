import { pageLoad } from "~/client/mod.ts";
import { handleSpriteRequests } from "~/client/functions/sprite.ts";
import { requestSprites } from "../../examples/platformer/client/mod.ts";

async function loadAssets() {
  requestSprites();
  await handleSpriteRequests();
}

loadAssets().then(async () => {
  await pageLoad();
});
