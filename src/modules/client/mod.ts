import { handleKeyDown, handleKeyUp, initClient } from "../common/game.ts";
import { NetworkState } from "../common/state/Network.ts";

window.onload = initClient;

// In case load event already happened
setTimeout(() => {
  if (!NetworkState.isReady) {
    initClient();
  }
});

window.onkeydown = handleKeyDown
window.onkeyup = handleKeyUp
