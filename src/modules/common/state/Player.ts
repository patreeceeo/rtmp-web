import { Vec2, Vec2Type } from "../Vec2.ts";
import { defaultWorld, EntityId } from "./mod.ts";
import * as ECS from "bitecs";
import { onlyServerGaurd } from "../env.ts";

export class Player {
  readonly position: Vec2;
  constructor(readonly world: ECS.IWorld, readonly eid: EntityId) {
    this.position = Vec2.fromEntityComponent(eid, PositionStore);
  }
  set lastActiveTime(time: number) {
    onlyServerGaurd(() => {
      LastActiveStore.time[this.eid] = Math.round(time)
    })
  }

  get lastActiveTime(): number {
    return LastActiveStore.time[this.eid]
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
    const player = new Player(this.world, eid);
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
      return new Player(this.world, eid);
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
}

export const PlayerState = new PlayerStateApi();
