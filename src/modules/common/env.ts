export const isServer = "Deno" in globalThis;
export const isClient = !isServer;

export function onlyServerGaurd<ReturnType>(
  fn: () => ReturnType,
  errorMessage = "Attempted a server-only operation the client",
): ReturnType {
  if (isServer) {
    return fn();
  } else {
    throw new Error(errorMessage);
  }
}
