import { Vec2 } from "../Vec2.ts";
import { copy, createNetworkId, NetworkId } from "./mod.ts";
import { distanceSquared } from "../math.ts";

export class Player {
  constructor(readonly nid: NetworkId, readonly position: Vec2) {}
}

export type NetworkPlayerRecord = Record<NetworkId, Player>;

interface _PlayerState {
  localPlayer?: NetworkId;
  networkedPlayers: NetworkPlayerRecord;
}

class PlayerStateApi {
  #state: _PlayerState = {
    networkedPlayers: {},
  };

  createPlayer(): Player {
    const nid = createNetworkId();
    console.log(`Created player ${nid}`)
    return (this.#state.networkedPlayers[nid] = new Player(
      nid,
      new Vec2(100, 100)
    ));
  }

  hasPlayer(nid: NetworkId) {
    return nid in this.#state.networkedPlayers
  }

  addExistingPlayer(player: Player) {
    console.log(`Added existing player ${player.nid}`)
    this.#state.networkedPlayers[player.nid] = player
  }

  setLocalPlayer(player: Player): void {
    if(!this.#state.localPlayer) {
      if(!(player.nid in this.#state.networkedPlayers)) {
        this.#state.localPlayer = player.nid
        this.#state.networkedPlayers[player.nid] = player
      } else {
        throw new Error(`Attempted to recreate network entity ${player.nid}`)
      }
    } else {
      throw new Error(`Attempted to recreate local player`)
    }
  }

  isLocalPlayer(nid: NetworkId) {
    return nid === this.#state.localPlayer
  }

  getLocalPlayer(): Player | undefined {
    if(this.#state.localPlayer !== undefined) {
      return this.#state.networkedPlayers[this.#state.localPlayer]
    }
  }

  deletePlayer(nid: NetworkId): void {
    if(nid === this.#state.localPlayer) {
      delete this.#state.localPlayer
    }
    delete this.#state.networkedPlayers[nid]
  }

  getPlayer(nid: NetworkId): Player | undefined {
    return this.#state.networkedPlayers[nid]
  }

  getPlayerDistanceSquared(nid: NetworkId, pos: Vec2) {
    const player = this.getPlayer(nid)
    return distanceSquared(player!.position, pos)
  }

  movePlayer(nid: NetworkId, to: Vec2) {
    const player = this.getPlayer(nid)
    copy(player!.position, to)
  }

  getPlayers(): Array<Player> {
    return Object.values(this.#state.networkedPlayers)
  }
}

export const PlayerState = new PlayerStateApi();
