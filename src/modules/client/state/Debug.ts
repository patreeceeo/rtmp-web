const params = new URLSearchParams(window.location.search);

class DebugStateApi {
  enabled = params.has("debug");
  messageSinceLastFrame = 0;
}

export const DebugState = new DebugStateApi();
