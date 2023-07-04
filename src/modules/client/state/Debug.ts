const params = new URLSearchParams(window.location.search);

class DebugStateApi {
  enabled = params.has("debug");
  messageSentSinceLastFrame = 0;
  messageReceivedSinceLastFrame = 0;
}

export const DebugState = new DebugStateApi();
