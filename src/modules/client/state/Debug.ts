const params = new URLSearchParams(window.location.search);

class DebugStateApi {
  enabled = params.has("debug");
}

export const DebugState = new DebugStateApi();
