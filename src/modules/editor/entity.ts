import { pageLoad } from "~/client/mod.ts";

async function loadAssets() {
  // TODO load assets
}

loadAssets().then(async () => {
  await pageLoad();
});
