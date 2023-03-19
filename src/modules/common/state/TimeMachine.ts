import { PlayerState } from "./Player.ts";

class Snapshot {
  constructor(readonly player: typeof PlayerState.snapshot) {}
}

/* work in progress */
export class TimeMachineApi {
  #state = {
    history: [] as Array<Snapshot>
  }

  addSnapshot() {
    this.#state.history.push(new Snapshot(PlayerState.snapshot))
  }

  restoreSnapshot(index: number) {
    PlayerState.applySnapshot(this.#state.history[index].player)
  }

  get snapshotCount () {
    return this.#state.history.length
  }
}
