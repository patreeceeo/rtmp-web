import { ClientNetworkState } from "../../client/state/Network.ts";
import { ServerNetworkState } from "../../server/state/Network.ts";
import { isClient } from "../env.ts";
import { NetworkStateApi } from "../NetworkApi.ts";

// TODO create Network Component that stores at least the nid?

export type { NetworkId } from "../NetworkApi.ts";
export { networkId } from "../NetworkApi.ts";

export const NetworkState: NetworkStateApi = isClient
  ? ClientNetworkState
  : ServerNetworkState;
