import { isClient } from "../env.ts";

export type NetworkId = number;
let nextNetworkId = 0;
export function createNetworkId() {
  if (!isClient) {
    const nid = nextNetworkId;
    nextNetworkId++;
    return nid;
  } else {
    throw new Error("Attempted to create a NetworkId on client");
  }
}
export function copy<Klass extends {__copy__(src: Klass): void}>(dest: Klass, src: Klass) {
  dest.__copy__(src)
}
