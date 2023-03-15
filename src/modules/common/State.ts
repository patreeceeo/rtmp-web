import { distanceSquared } from "./math.ts";
export class Player {
  constructor(readonly nid: NetworkId, readonly position: Vec2) {}
}

export class Vec2 {
  constructor(public x = 0, public y = 0) {}
  __copy__(src: Vec2) {
    this.x = src.x
    this.y = src.y
  }
}


export type NetworkId = number;
const isClient = !("Deno" in globalThis)
let nextNetworkId = 0;
function createNetworkId() {
  if (!isClient) {
    const nid = nextNetworkId;
    nextNetworkId++;
    return nid;
  } else {
    throw new Error("Attempted to create a NetworkId on client");
  }
}
export type NetworkEntityRecord = Record<NetworkId, Player>;

export interface InputState {
  pressTime: number;
  releaseTime: number;
}

interface _AppState {
  ws?: WebSocket;
  loaded: boolean;
}

class AppStateApi {
  #state: _AppState = {
    loaded: false,
  };

  isLoaded() {
    return this.#state.loaded
  }

  setLoaded(ws: WebSocket) {
    this.#state.loaded = true
    this.#state.ws = ws
  }

  get socket () {
    return this.#state.ws
  }
}

export const AppState = new AppStateApi();

type _InputState = Map<string, InputState>

class InputStateApi {
  #state: _InputState = new Map();
  #idKey(code: KeyboardEvent["code"]): string {
    return `kbd:${code}`
  }
  #initInput(id: string) {
    this.#state.set(id, {
      pressTime: 0,
      releaseTime: 0,
    });
  }
  isKeyPressed(code: KeyboardEvent["code"]): boolean {
    const id = this.#idKey(code)
    if(this.#state.has(id)) {
      const keyState = this.#state.get(id)
      return keyState!.pressTime > keyState!.releaseTime;
    } else {
      return false
    }
  }
  setKeyPressed(code: KeyboardEvent["code"]): void {
    const id = this.#idKey(code)
    if(!this.#state.has(id)) {
      this.#initInput(id)
    }
    this.#state.get(id)!.pressTime = Date.now();
  }
  setKeyReleased(code: KeyboardEvent["code"]): void {
    const id = this.#idKey(code)
    if(!this.#state.has(id)) {
      this.#initInput(id)
    }
    this.#state.get(id)!.releaseTime = Date.now();
  }
}

export const InputState = new InputStateApi();

interface _PlayerState {
  localPlayer?: NetworkId;
  networkedEntities: NetworkEntityRecord;
}

class PlayerStateApi {
  #state: _PlayerState = {
    networkedEntities: {},
  };

  createPlayer(): Player {
    const nid = createNetworkId();
    console.log(`Created player ${nid}`)
    return (this.#state.networkedEntities[nid] = new Player(
      nid,
      new Vec2(100, 100)
    ));
  }

  addExistingPlayer(player: Player) {
    console.log(`Added existing player ${player.nid}`)
    this.#state.networkedEntities[player.nid] = player
  }

  setLocalPlayer(player: Player): void {
    if(!this.#state.localPlayer) {
      if(!(player.nid in this.#state.networkedEntities)) {
        this.#state.localPlayer = player.nid
        this.#state.networkedEntities[player.nid] = player
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
      return this.#state.networkedEntities[this.#state.localPlayer]
    }
  }

  deletePlayer(nid: NetworkId): void {
    if(nid === this.#state.localPlayer) {
      delete this.#state.localPlayer
    }
    delete this.#state.networkedEntities[nid]
  }

  getPlayer(nid: NetworkId): Player | undefined {
    return this.#state.networkedEntities[nid]
  }

  getPlayerDistanceSquared(nid: NetworkId, pos: Vec2) {
    const player = this.getPlayer(nid)
    return distanceSquared(player!.position, pos)
  }

  movePlayer(nid: NetworkId, to: Vec2) {
    const player = this.getPlayer(nid)
    if(!player) {
      // deno-lint-ignore no-debugger
      debugger
    }
    copy(player!.position, to)
  }

  getPlayers(): Array<Player> {
    return Object.values(this.#state.networkedEntities)
  }
}

export const PlayerState = new PlayerStateApi();

function copy<Klass extends {__copy__(src: Klass): void}>(dest: Klass, src: Klass) {
  dest.__copy__(src)
}
