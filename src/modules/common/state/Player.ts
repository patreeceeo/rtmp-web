import { Vec2, Vec2Type } from "../Vec2.ts";
import { defaultWorld, EntityId } from "./mod.ts";
import * as ECS from "bitecs";

export class Player {
  readonly position: Vec2;
  constructor(readonly eid: EntityId) {
    this.position = Vec2.fromEntityComponent(eid, PositionStore);
    this.lastActiveTime = performance.now();
  }
  set lastActiveTime(time: number) {
    LastActiveStore.time[this.eid] = Math.round(time)
  }

  get lastActiveTime(): number {
    return LastActiveStore.time[this.eid]
  }

  get snapshot() {
    return {
      eid: this.eid,
      position: this.position.snapshot,
      lastActiveTime: this.lastActiveTime
    }
  }

  applySnapshot(snap: typeof this.snapshot) {
    this.position.applySnapshot(snap.position)
    this.lastActiveTime = snap.lastActiveTime
  }
}

const PositionStore = ECS.defineComponent(Vec2Type);
const LastActiveStore = ECS.defineComponent({time: ECS.Types.ui32});

class PlayerStateApi {
  #players = ECS.defineQuery([PositionStore]);
  world = defaultWorld

  createPlayer(): Player {
    const eid = ECS.addEntity(this.world) as EntityId;
    console.log(`Created player ${eid}`);
    const player = new Player(eid);
    ECS.addComponent(this.world, PositionStore, eid);
    ECS.addComponent(this.world, LastActiveStore, eid);
    return player;
  }

  hasPlayer(eid: EntityId) {
    return ECS.entityExists(this.world, eid);
  }

  deletePlayer(eid: EntityId): void {
    console.log(`Deleted player ${eid}`);
    ECS.removeEntity(this.world, eid);
  }

  getPlayer(eid: EntityId): Player {
    if (ECS.entityExists(this.world, eid)) {
      return new Player(eid);
    } else {
      throw new Error(`Entity ${eid} does not exist`);
    }
  }

  getPlayerEids(): Array<EntityId> {
    return this.#players(this.world) as Array<EntityId>;
  }

  getPlayers(): Array<Player> {
    return this.getPlayerEids().map((eid) => this.getPlayer(eid))
  }

  get snapshot() {
    const snap: Array<typeof Player.prototype.snapshot> = []
    for(const player of PlayerState.getPlayers()) {
      snap[player.eid] = player.snapshot
    }
    return snap
  }

  applySnapshot(snap: typeof this.snapshot) {
    for(const playerSnapshot of snap) {
      this.getPlayer(playerSnapshot.eid).applySnapshot(playerSnapshot)
    }
  }

  /**
  * work in progress
  getDiff(before: typeof this.snapshot, after: typeof this.snapshot) {
    const diff = {
      create: {},
      update: {},
      delete: [] as EntityId[],
    }
    const longestKeys = before.length > after.length ? before.keys() : after.keys()

    for(const key of longestKeys) {
      if(key in before && !(key in after)) {
        diff.delete.push(key as EntityId)
      }
    }
  }
  */
}

export const PlayerState = new PlayerStateApi();
